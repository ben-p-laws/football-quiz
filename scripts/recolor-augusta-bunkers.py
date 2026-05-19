"""
Augusta bunker flat-fill.

Strategy: v12 recoloring (commit f3cf7c3) found the correct bunker pixels via
seed detection + 20 px dilation. The only problem was HSL recolor preserved
luminance, so dark shadow pixels inside the bunker stayed dark (visible as
"black spots").

This script computes: mask = pixels that differ between the 6148b9f originals
and the v12 images. Those are exactly the bunker pixels. Then it applies a
single flat colour (#c8a96e = RGB 200, 169, 110) to all of them.

Sources:
  /tmp/augusta_orig  — 6148b9f originals (correct image dimensions)
  /tmp/augusta_v12   — f3cf7c3 v12 images (correct bunker mask, wrong colour)
Output:
  public/holes/augusta/
"""

import os
from PIL import Image
import numpy as np

ORIG_DIR = '/tmp/augusta_orig'
V12_DIR  = '/tmp/augusta_v12'
OUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

# Flat target: #c8a96e
FLAT_R, FLAT_G, FLAT_B = 200, 169, 110


def recolor_hole(hole_num):
    fname = f'hole_{hole_num:02d}.png'
    orig = np.array(Image.open(os.path.join(ORIG_DIR, fname)).convert('RGBA'), dtype=np.uint8)
    v12  = np.array(Image.open(os.path.join(V12_DIR,  fname)).convert('RGBA'), dtype=np.uint8)

    # Mask = every pixel v12 recolored (any channel changed)
    mask = np.any(orig[:, :, :3] != v12[:, :, :3], axis=2)

    out = orig.copy()
    out[mask, 0] = FLAT_R
    out[mask, 1] = FLAT_G
    out[mask, 2] = FLAT_B

    Image.fromarray(out, mode='RGBA').save(os.path.join(OUT_DIR, fname))
    print(f'  {fname}: {mask.sum():,} pixels → flat #c8a96e')


def main():
    print('Flat-filling Augusta bunkers from v12 mask …')
    for n in range(1, 19):
        recolor_hole(n)
    print('Done.')


if __name__ == '__main__':
    main()
