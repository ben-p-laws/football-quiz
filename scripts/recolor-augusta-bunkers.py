"""
Augusta bunker flat-fill — dilate large components, bridge dark spots.

The bunker in each hole has 2-3 large sandy components (≥500 px) detected by
the v12 seed logic. Dark spots inside the bunker are separate small components
because thin green pixels separate them from the bright sandy areas.

Fix:
1. Find large components (≥500 px) of the v12 mask — the real bunker bodies.
2. Dilate them by BRIDGE_PX to bridge through the thin green separator pixels.
3. Within the dilated zone, accept ALL visible non-water pixels where G isn't
   strongly dominant (G < R+25 OR G < 130) — this catches dark shadow pixels
   while still excluding bright fairway green.
4. Flat-fill everything accepted to #c8a96e.

Sources: /tmp/augusta_orig (6148b9f)
Output:  public/holes/augusta/
"""

import os
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import label

ORIG_DIR  = '/tmp/augusta_orig'
OUT_DIR   = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

FLAT_R, FLAT_G, FLAT_B = 200, 169, 110   # #c8a96e
MIN_COMPONENT = 500   # px — only use large blobs as seeds for dilation
BRIDGE_PX     = 15    # px dilation to bridge thin green separator lines


def recolor_hole(src_path, out_path):
    img  = Image.open(src_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    l    = (maxc + minc) / 2.0 / 255.0
    lum  = l * 255.0
    diff = maxc - minc
    s    = np.where(diff == 0, 0.0,
               np.where(l > 0.5,
                   diff / (510.0 - maxc - minc),
                   diff / (maxc + minc)))
    sat    = s * 100.0
    inside = a > 10
    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    is_blue  = (b > r + 20) & (b > g + 10)

    # ── v12 mask ───────────────────────────────────────────────────────────────
    seed = (
        (lum > 80) & (sat < 40) &
        (g < r + 25) & (b > g - 35) &
        inside & ~is_green & ~is_blue
    )
    seed_img = Image.fromarray((seed * 255).astype(np.uint8))
    zone     = np.array(seed_img.filter(ImageFilter.MaxFilter(41))) > 0
    shadow   = zone & inside & (lum >= 5) & (lum <= 70) & (sat < 40) & ~is_green & ~is_blue
    v12_mask = (seed | shadow).astype(bool)

    # ── Keep only large components (real bunker bodies) ────────────────────────
    labeled, _ = label(v12_mask)
    sizes       = np.bincount(labeled.ravel())
    large_mask  = np.isin(labeled, np.where(sizes >= MIN_COMPONENT)[0]) & (labeled > 0)

    # ── Dilate large components to bridge thin green separator lines ───────────
    large_img = Image.fromarray((large_mask * 255).astype(np.uint8))
    zone_big  = np.array(large_img.filter(ImageFilter.MaxFilter(BRIDGE_PX * 2 + 1))) > 0

    # ── Within zone: accept everything except bright fairway or water ──────────
    # Bright fairway: G dominant (G > R+25) AND bright (G > 130)
    # Dark shadow inside bunker: G < 130 OR G not much > R — keep these
    is_fairway = (g > 130) & (g > r + 25) & (g > b + 25)
    full_mask  = zone_big & inside & ~is_fairway & ~is_blue

    out = np.array(img, dtype=np.uint8)
    out[:,:,0] = np.where(full_mask, FLAT_R, out[:,:,0])
    out[:,:,1] = np.where(full_mask, FLAT_G, out[:,:,1])
    out[:,:,2] = np.where(full_mask, FLAT_B, out[:,:,2])

    Image.fromarray(out, mode='RGBA').save(out_path)
    nlarge = int((sizes >= MIN_COMPONENT).sum() - 1)
    print(f'  v12={int(v12_mask.sum()):,}  large_comps={nlarge}  filled={int(full_mask.sum()):,}')


def main():
    holes = sorted(f for f in os.listdir(ORIG_DIR) if f.endswith('.png'))
    print(f'Processing {len(holes)} Augusta holes …')
    for fname in holes:
        print(f'  {fname}:', end='  ')
        recolor_hole(os.path.join(ORIG_DIR, fname), os.path.join(OUT_DIR, fname))
    print('Done.')


if __name__ == '__main__':
    main()
