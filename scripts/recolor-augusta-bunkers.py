"""
Augusta bunker flat-fill — targeted extension of v12 mask.

v12 recoloring (f3cf7c3) detected bunkers correctly but missed two classes of
pixels inside the bunker zone:
  1. Truly black spots: lum < 5, excluded by v12's `lum >= 5` lower bound.
  2. Slightly-greenish shadows: sat 40-55%, excluded by v12's `sat < 40`.

This script replicates v12's seed + 20 px dilation zone, then flat-fills:
  - All pixels v12 would have recolored (seed + shadow lum 5-70, sat < 40)
  - Truly black spots (lum < 5) inside the zone
  - Slightly-greenish dark spots (lum 5-70, sat 40-55) that aren't green-dominant
    (i.e. G-R < 30, preventing real tree pixels from being included)

Sources: /tmp/augusta_orig (6148b9f)
Output:  public/holes/augusta/
"""

import os
from PIL import Image, ImageFilter
import numpy as np

ORIG_DIR = '/tmp/augusta_orig'
OUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

FLAT_R, FLAT_G, FLAT_B = 200, 169, 110   # #c8a96e


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

    # Standard exclusions (same as v12)
    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    is_blue  = (b > r + 20) & (b > g + 10)

    # ── Seed (same as v12) ─────────────────────────────────────────────────────
    seed = (
        (lum > 80) & (sat < 40) &
        (g < r + 25) & (b > g - 35) &
        (a > 10) & ~is_green & ~is_blue
    )

    # ── Zone: 20 px dilation (same radius as v12) ──────────────────────────────
    seed_img = Image.fromarray((seed * 255).astype(np.uint8))
    zone     = np.array(seed_img.filter(ImageFilter.MaxFilter(41))) > 0

    # ── Extended shadow conditions ─────────────────────────────────────────────
    # 1. v12 shadow (lum 5-70, sat < 40)
    shadow_v12 = zone & inside & (lum >= 5) & (lum <= 70) & (sat < 40) & ~is_green & ~is_blue

    # 2. Truly black spots (lum < 5) — v12 excluded these with `lum >= 5`
    truly_black = zone & inside & (lum < 5) & ~is_blue

    # 3. Slightly-greenish shadows (sat 40-55) inside the zone.
    #    Bunker lip/shadow pixels have sat 40-55% but G is not much > R.
    #    Tree pixels have G >> R (G-R > 30), so we exclude those.
    slight_green = (
        zone & inside &
        (lum >= 5) & (lum <= 70) &
        (sat >= 40) & (sat <= 55) &
        (g < r + 30) &           # not green-dominant → bunker lip, not tree
        ~is_blue
    )

    full_mask = seed | shadow_v12 | truly_black | slight_green

    out = np.array(img, dtype=np.uint8)
    out[:,:,0] = np.where(full_mask, FLAT_R, out[:,:,0])
    out[:,:,1] = np.where(full_mask, FLAT_G, out[:,:,1])
    out[:,:,2] = np.where(full_mask, FLAT_B, out[:,:,2])

    Image.fromarray(out, mode='RGBA').save(out_path)
    print(f'  seed={int(seed.sum()):,}  filled={int(full_mask.sum()):,}')


def main():
    holes = sorted(f for f in os.listdir(ORIG_DIR) if f.endswith('.png'))
    print(f'Processing {len(holes)} Augusta holes …')
    for fname in holes:
        print(f'  {fname}:', end='  ')
        recolor_hole(
            os.path.join(ORIG_DIR, fname),
            os.path.join(OUT_DIR, fname),
        )
    print('Done.')


if __name__ == '__main__':
    main()
