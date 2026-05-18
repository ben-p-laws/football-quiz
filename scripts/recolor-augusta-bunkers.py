"""
Recolors Augusta hole bunkers to warm sandy yellow.

Algorithm:
1. Detect bright bunker seed pixels (light grey, low saturation) from originals
2. Iterative flood-fill dilation (stops at green grass/trees and black background)
3. Apply HSL-based recoloring: preserve luminosity, set hue+sat to sandy yellow
   (dark shadow pixels become dark sandy, bright areas become bright sandy)

Usage: python3 scripts/recolor-augusta-bunkers.py
Reads originals from /tmp/augusta_orig/, writes to public/holes/augusta/.
"""

import os
from PIL import Image, ImageFilter
import numpy as np

ORIG_DIR = '/tmp/augusta_orig'
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

SANDY_HUE = 38 / 360.0    # ~38° warm yellow-brown
SANDY_SAT = 0.48           # moderate saturation

# Flood-fill parameters: STEP_SIZE px radius per iteration, NUM_STEPS total
# Total radius = (STEP_SIZE * NUM_STEPS) px — large enough to cover bunker interior
STEP_SIZE = 7   # MaxFilter(2*STEP_SIZE+1)
NUM_STEPS = 20  # 20 * 7 = 140 px effective flood radius


def rgb_to_hls_array(r, g, b):
    """Float32 RGB (0-255) → HLS each in 0-1."""
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
    """HLS (0-1 each) → float32 RGB (0-255)."""
    p2 = np.where(l <= 0.5, l * (1.0 + s), l + s - l * s)
    p1 = 2.0 * l - p2
    r = np.where(s == 0, l, _hls_v(p1, p2, h + 1/3))
    g = np.where(s == 0, l, _hls_v(p1, p2, h))
    b = np.where(s == 0, l, _hls_v(p1, p2, h - 1/3))
    return r * 255.0, g * 255.0, b * 255.0


def recolor_hole(orig_path, out_path):
    img = Image.open(orig_path).convert('RGB')
    data = np.array(img, dtype=np.float32)
    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]

    _, l, s = rgb_to_hls_array(r, g, b)
    lum255 = l * 255.0
    sat100 = s * 100.0

    # Pixels that must never be recolored ─────────────────────────────────────
    # Green vegetation: G moderately dominates R and B
    is_green = (g > r + 15) & (g > b + 15) & (g > 50)
    # Water / teal hazards: B close to G and both above R by a margin
    is_water = (b > r + 30) & (np.abs(b.astype(np.float32) - g.astype(np.float32)) < 25)
    # Near-black image background (outside the hole outline)
    is_background = (lum255 < 4)
    blocked = is_green | is_water | is_background

    # Seed: bright, desaturated grey pixels — original bunker surface ──────────
    seed_mask = (lum255 > 80) & (sat100 < 40) & (g < r + 25) & (b > g - 35) & ~blocked
    print(f"  seed={seed_mask.sum():,}", end='')

    # Iterative flood fill: each step dilates by STEP_SIZE px, then clips blocked
    kernel = STEP_SIZE * 2 + 1
    mask = seed_mask.astype(np.uint8)
    for _ in range(NUM_STEPS):
        pil_mask = Image.fromarray(mask * 255, mode='L')
        dilated = np.array(pil_mask.filter(ImageFilter.MaxFilter(kernel))) > 0
        mask = (dilated & ~blocked).astype(np.uint8)

    bunker_region = mask.astype(bool)
    print(f"  bunker={bunker_region.sum():,}")

    # HSL-based recolor: preserve luminosity, apply sandy hue + saturation ────
    h_arr, l_arr, _ = rgb_to_hls_array(r, g, b)
    target_h = np.full_like(h_arr, SANDY_HUE)
    target_s = np.full_like(l_arr, SANDY_SAT)
    # Gently lift very dark shadow pixels so the sandy hue is perceptible
    adjusted_l = np.where(l_arr < 0.08, l_arr + 0.06, l_arr)

    new_r, new_g, new_b = hls_to_rgb_array(target_h, adjusted_l, target_s)

    result = data.copy()
    result[:,:,0] = np.where(bunker_region, np.clip(new_r, 0, 255), r)
    result[:,:,1] = np.where(bunker_region, np.clip(new_g, 0, 255), g)
    result[:,:,2] = np.where(bunker_region, np.clip(new_b, 0, 255), b)

    Image.fromarray(result.astype(np.uint8)).save(out_path)


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
