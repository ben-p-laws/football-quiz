"""
Recolors Augusta hole bunkers to warm sandy yellow.

Algorithm (per-hole):
1. Detect bright grey bunker seed pixels from the original RGBA image
2. MaxFilter 30 px dilation to cover rim and adjacent shadow
3. Secondary 30 px dilation for medium-dark shadow pixels (lum 5-70) in the zone
4. Exclude clearly green vegetation at the very end (not during dilation) and
   transparent background pixels
5. Apply HSL-based recolor: set hue ~38° and saturation 48%, preserving luminosity
   so shadows become dark sandy instead of neutral dark grey
6. Alpha channel is carried through unchanged — transparent border stays transparent

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

# Dilation radii (px) → MaxFilter kernel = 2*radius+1
SEED_RADIUS   = 30   # standard dilation from bright seeds
SHADOW_RADIUS = 30   # additional dilation from medium-dark shadow pixels in zone


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


def maxfilter(mask_uint8, radius):
    """Binary dilation via PIL MaxFilter. mask_uint8 is a 2-D uint8 array."""
    pil = Image.fromarray(mask_uint8 * 255, mode='L')
    return (np.array(pil.filter(ImageFilter.MaxFilter(radius * 2 + 1))) > 0)


def recolor_hole(orig_path, out_path):
    img = Image.open(orig_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    _, l, s = rgb_to_hls_array(r, g, b)
    lum255 = l * 255.0
    sat100 = s * 100.0

    # --- Detect bright grey bunker seeds (original surface) ---
    seed = (
        (lum255 > 80) & (sat100 < 40) &
        (g < r + 25) & (b > g - 35) &
        (a > 10)  # inside hole only
    ).astype(np.uint8)

    # --- Pass 1: dilate seeds 30 px ---
    zone = maxfilter(seed, SEED_RADIUS)

    # --- Pass 2: within that zone, find shadow pixels and dilate 30 px more.
    #     Near-black (lum < 10) gets a relaxed sat threshold since those pixels
    #     are hard to assign saturation to reliably. ---
    shadow_candidates = (
        zone &
        (lum255 >= 1) & (lum255 <= 70) &
        ((sat100 < 45) | (lum255 < 10)) &
        (a > 10)
    ).astype(np.uint8)
    shadow_zone = maxfilter(shadow_candidates, SHADOW_RADIUS)

    combined = zone | shadow_zone

    # --- Exclude vegetation, water, and transparent background pixels ---
    # Applied AFTER dilation so thin green bands don't block inner shadows.
    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    # Water / teal: B clearly dominates R and is close to G
    is_water = (b > r + 30) & (np.abs(b - g) < 30)
    is_bg    = (a < 10)

    bunker_region = combined & ~is_green & ~is_water & ~is_bg

    print(f"  seed={seed.sum():,}  bunker={bunker_region.sum():,}")

    # --- HSL recolor: keep luminosity, set hue + saturation to sandy ---
    h_arr, l_arr, _ = rgb_to_hls_array(r, g, b)
    target_h = np.full_like(h_arr, SANDY_HUE)
    target_s = np.full_like(l_arr, SANDY_SAT)
    # Lift very dark shadows slightly so sandy hue is perceptible
    adjusted_l = np.where(l_arr < 0.08, l_arr + 0.06, l_arr)

    new_r, new_g, new_b = hls_to_rgb_array(target_h, adjusted_l, target_s)

    # Blend strength: full (1.0) for low-sat pixels, fades to 0 by sat=55.
    # This prevents aggressively recoloring high-saturation grass/water that
    # might have slipped through the green exclusion.
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
