"""
Augusta bunker flat-fill — connected component flood fill.

Color-threshold approaches miss dark spots inside bunkers. Instead:

1. Build a "candidate" mask: opaque pixels that aren't bright green (fairway)
   or blue (water). This includes the entire bunker shape — bright sandy
   centre, dark shadow spots, and the outline ring.

2. Label connected components of that candidate mask using scipy.

3. Find which components contain v12-style seed pixels (lum>80, sat<40,
   not green/blue). Those components ARE the bunkers.

4. Flat-fill every pixel in those components to #c8a96e.

Because we use full connectivity rather than a fixed dilation radius, every
dark spot inside the bunker is guaranteed to be in the same component as the
bright sandy pixels — as long as it's connected to them through non-green pixels.

Sources: /tmp/augusta_orig (6148b9f)
Output:  public/holes/augusta/
"""

import os
import numpy as np
from PIL import Image
from scipy.ndimage import label

ORIG_DIR = '/tmp/augusta_orig'
OUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

FLAT_R, FLAT_G, FLAT_B = 200, 169, 110   # #c8a96e


def recolor_hole(src_path, out_path):
    img  = Image.open(src_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # ── HLS ────────────────────────────────────────────────────────────────────
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    l    = (maxc + minc) / 2.0 / 255.0
    lum  = l * 255.0
    diff = maxc - minc
    s    = np.where(diff == 0, 0.0,
               np.where(l > 0.5,
                   diff / (510.0 - maxc - minc),
                   diff / (maxc + minc)))
    sat = s * 100.0

    inside   = a > 10
    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    is_blue  = (b > r + 20) & (b > g + 10)

    # ── Seed pixels (same detection as v12) ────────────────────────────────────
    seed = (
        (lum > 80) & (sat < 40) &
        (g < r + 25) & (b > g - 35) &
        inside & ~is_green & ~is_blue
    )

    # ── Candidate mask: all opaque non-green non-blue pixels ───────────────────
    # This includes the whole bunker (bright centre + dark spots + outline).
    candidate = inside & ~is_green & ~is_blue

    # ── Connected components of candidate pixels ────────────────────────────────
    labeled, n = label(candidate)

    # ── Find which components contain seed pixels ──────────────────────────────
    seed_labels = np.unique(labeled[seed & (labeled > 0)])

    # ── Build bunker mask from those components ────────────────────────────────
    bunker_mask = np.isin(labeled, seed_labels) & (labeled > 0)

    print(f'  seeds={int(seed.sum()):,}  components={len(seed_labels)}  filled={int(bunker_mask.sum()):,}', end='')

    out = np.array(img, dtype=np.uint8)
    out[:,:,0] = np.where(bunker_mask, FLAT_R, out[:,:,0])
    out[:,:,1] = np.where(bunker_mask, FLAT_G, out[:,:,1])
    out[:,:,2] = np.where(bunker_mask, FLAT_B, out[:,:,2])

    Image.fromarray(out, mode='RGBA').save(out_path)


def main():
    holes = sorted(f for f in os.listdir(ORIG_DIR) if f.endswith('.png'))
    print(f'Processing {len(holes)} Augusta holes …')
    for fname in holes:
        print(f'  {fname}:', end='  ')
        recolor_hole(
            os.path.join(ORIG_DIR, fname),
            os.path.join(OUT_DIR, fname),
        )
        print()
    print('Done.')


if __name__ == '__main__':
    main()
