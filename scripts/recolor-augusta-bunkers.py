"""
Recolors Augusta hole bunkers to warm sandy yellow.

Algorithm (per-hole):
1. Detect bright grey bunker seed pixels from the original RGBA image
2. Iterative flood-fill dilation (20 × 7 px steps = 140 px max radius).
   During each step, blocked pixels (green vegetation, water, transparent bg)
   are removed so the fill cannot cross into rough or the creek.
   The green threshold is kept permissive so even light-green rough stops the fill.
3. Apply HSL recolor: set hue ~38° and saturation 48%, preserving luminosity.
   A saturation-based blend factor protects any accidentally-caught higher-sat
   pixels from going fully orange.
4. Alpha channel is carried through unchanged — transparent border stays transparent.

Usage: python3 scripts/recolor-augusta-bunkers.py
Reads originals from /tmp/augusta_orig/, writes to public/holes/augusta/.
"""

import os
from PIL import Image, ImageFilter
import numpy as np

ORIG_DIR = '/tmp/augusta_orig'
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

SANDY_HUE = 38 / 360.0    # ~38° warm yellow-brown
SANDY_SAT  = 0.48

STEP_SIZE  = 7    # px radius per flood-fill iteration
NUM_STEPS  = 20   # 20 × 7 = 140 px max radius


def rgb_to_hls_array(r, g, b):
    rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
    maxc = np.maximum(np.maximum(rn, gn), bn)
    minc = np.minimum(np.minimum(rn, gn), bn)
    l = (maxc + minc) / 2.0
    diff = maxc - minc
    s = np.where(diff == 0, 0.0,
        np.where(l > 0.5, diff / (2.0 - maxc - minc), diff / (maxc + minc)))
    rc = np.where(diff > 0, (maxc - rn) / diff, 0.0)
    gc = np.where(diff > 0, (maxc - gn) / diff, 0.0)
    bc = np.where(diff > 0, (maxc - bn) / diff, 0.0)
    h = np.where(maxc == rn, bc - gc,
        np.where(maxc == gn, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    return h, l, s


def _hls_v(p1, p2, hue):
    hue = hue % 1.0
    return np.where(hue < 1/6, p1 + (p2 - p1) * hue * 6,
           np.where(hue < 1/2, p2,
           np.where(hue < 2/3, p1 + (p2 - p1) * (2/3 - hue) * 6, p1)))


def hls_to_rgb_array(h, l, s):
    p2 = np.where(l <= 0.5, l * (1.0 + s), l + s - l * s)
    p1 = 2.0 * l - p2
    r = np.where(s == 0, l, _hls_v(p1, p2, h + 1/3))
    g = np.where(s == 0, l, _hls_v(p1, p2, h))
    b = np.where(s == 0, l, _hls_v(p1, p2, h - 1/3))
    return r * 255.0, g * 255.0, b * 255.0


def recolor_hole(orig_path, out_path):
    img = Image.open(orig_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    _, l, s = rgb_to_hls_array(r, g, b)
    lum255 = l * 255.0
    sat100 = s * 100.0

    # Pixels the flood fill must never cross or include ─────────────────────
    # Permissive green check (G > R+10 & G > B+10 & G > 45) so even
    # light-green rough stops the fill and protects the creek on short holes.
    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    # Water / teal: B clearly dominates R and is close to G
    is_water = (b > r + 30) & (np.abs(b - g) < 30)
    # Transparent image background
    is_bg = (a < 10)
    blocked = is_green | is_water | is_bg

    # Seed: bright desaturated grey = original bunker surface ────────────────
    seed = (
        (lum255 > 80) & (sat100 < 40) &
        (g < r + 25) & (b > g - 35) &
        ~blocked
    ).astype(np.uint8)

    print(f"  seed={seed.sum():,}", end='')

    # Flood fill: dilate STEP_SIZE px per iteration, remove blocked pixels ──
    kernel = STEP_SIZE * 2 + 1
    mask = seed.copy()
    for _ in range(NUM_STEPS):
        pil_mask = Image.fromarray(mask * 255, mode='L')
        dilated = np.array(pil_mask.filter(ImageFilter.MaxFilter(kernel))) > 0
        mask = (dilated & ~blocked).astype(np.uint8)

    bunker_region = mask.astype(bool)
    print(f"  bunker={bunker_region.sum():,}")

    # HSL recolor: keep luminosity, set hue + sat to sandy ──────────────────
    h_arr, l_arr, _ = rgb_to_hls_array(r, g, b)
    target_h = np.full_like(h_arr, SANDY_HUE)
    target_s = np.full_like(l_arr, SANDY_SAT)
    adjusted_l = np.where(l_arr < 0.08, l_arr + 0.06, l_arr)

    new_r, new_g, new_b = hls_to_rgb_array(target_h, adjusted_l, target_s)

    # Blend factor: full recolor for low-sat pixels (sat < 25), fades to 0
    # by sat = 55. Protects any accidentally-caught coloured pixels.
    blend = np.clip((55.0 - sat100) / 30.0, 0.0, 1.0)

    result = data.copy()
    m = bunker_region
    result[:,:,0] = np.where(m, r + blend*(np.clip(new_r,0,255)-r), r)
    result[:,:,1] = np.where(m, g + blend*(np.clip(new_g,0,255)-g), g)
    result[:,:,2] = np.where(m, b + blend*(np.clip(new_b,0,255)-b), b)
    # Alpha unchanged

    Image.fromarray(result.astype(np.uint8), mode='RGBA').save(out_path)


def main():
    holes = sorted(f for f in os.listdir(ORIG_DIR) if f.endswith('.png'))
    print(f"Processing {len(holes)} Augusta holes …")
    for fname in holes:
        print(f"  {fname}:", end='')
        recolor_hole(
            os.path.join(ORIG_DIR, fname),
            os.path.join(OUT_DIR, fname),
        )
    print("Done.")


if __name__ == '__main__':
    main()
