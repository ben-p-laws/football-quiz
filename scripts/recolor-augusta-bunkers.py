"""
Augusta bunkers -> flat sand (#c8a96e).

The hole art has grey/white bunkers with dark shading, and some bunker centres are
transparent (the page background shows through as dark patches). This:
  1. finds the course shape (filling transparent gaps) and stays 14px inside its edge,
  2. seeds on the light-grey bunker lip, grows through connected grey shading + gaps,
  3. paints the result flat sand at full opacity.

Usage: python3 scripts/recolor-augusta-bunkers.py [src_dir] [dst_dir]
       (defaults to public/holes/augusta in place; safe to re-run)
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, binary_erosion, binary_fill_holes, label

SAND = np.array([200, 169, 110])  # #c8a96e
DEFAULT = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')
src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
dst = sys.argv[2] if len(sys.argv) > 2 else src

for f in sorted(os.listdir(src)):
    if not f.endswith('.png'):
        continue
    a = np.array(Image.open(os.path.join(src, f)).convert('RGBA')).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = a[..., :3].max(-1)
    mn = a[..., :3].min(-1)
    lum = (mx + mn) / 2
    glead = g - np.maximum(r, b)

    course = binary_fill_holes(al > 200)
    interior = binary_erosion(course, iterations=14)            # stay off the feathered course edge
    holes = course & (al <= 200)                                 # transparent gaps inside the course
    grey = (mx - mn < 45) & (glead < 15) & (r - b < 25)          # grey/blue-grey, not green or brown straw
    greyish = interior & (grey | holes)
    lip = greyish & (lum > 120) & (mx - mn < 20)                 # light-grey bunker lip

    lab, n = label(lip)
    sizes = np.bincount(lab.ravel())
    m = np.isin(lab, [i for i in range(1, n + 1) if sizes[i] >= 25])
    for _ in range(25):                                          # grow through connected shading
        nm = binary_dilation(m) & greyish
        if (nm == m).all():
            break
        m = nm
    m = binary_fill_holes(m) & interior
    m |= binary_dilation(m, iterations=2) & interior & ((glead < 30) | holes)  # antialiased rim

    out = a.copy()
    out[m, :3] = SAND
    out[m, 3] = 255
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(dst, f), optimize=True)
    print(f, 'bunkers', int((sizes[1:] >= 25).sum()), 'px', int(m.sum()))
