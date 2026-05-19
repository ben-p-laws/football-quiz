"""
Augusta bunker flat-fill — compact-component filter + strict alpha.

Problems with previous versions:
  - Semi-transparent edge pixels (alpha 10-200) formed large "components" at the
    boundary of the hole shape → fixed by requiring alpha > 200 for seeds.
  - Elongated right-side boundary strips (e.g. hole_01 comp=166, compactness=0.06)
    were ≥500px but are not bunkers → filtered by requiring compactness ≥ 0.2.
  - Dark green pixels inside the dilation zone were colored because is_fairway
    only excluded bright green (g>130) → fixed by excluding any green-dominant
    pixel (g > r+10 AND g > b+10) from the final fill.

Algorithm:
  1. v12 seed: lum>80, sat<40, not green-dominant, not blue, alpha>200.
  2. 20px dilation + shadow to form v12_mask.
  3. Label components; keep those ≥500px AND compactness ≥ 0.2 (area/bbox_area).
  4. Dilate kept components by BRIDGE_PX to bridge thin green separator lines.
  5. Within dilated zone, fill pixels that are not green-dominant and not blue.

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
MIN_COMPONENT   = 500    # px — minimum blob size
MIN_COMPACTNESS = 0.25   # area / bounding_box_area — filters elongated boundary strips
BRIDGE_PX       = 8      # px dilation to bridge thin green separator lines


def recolor_hole(src_path, out_path):
    img  = Image.open(src_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    lv   = (maxc + minc) / 2.0 / 255.0
    lum  = lv * 255.0
    diff = maxc - minc
    s    = np.where(diff == 0, 0.0,
               np.where(lv > 0.5,
                   diff / (510.0 - maxc - minc),
                   diff / (maxc + minc)))
    sat = s * 100.0

    # Keep a>10 for connectivity; edge artifacts are filtered by compactness below
    inside = a > 10
    # Green-dominant: any pixel where G clearly leads both R and B
    is_green = (g > r + 10) & (g > b + 10)
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

    # ── Keep large, compact components (real bunker bodies) ───────────────────
    labeled, _ = label(v12_mask)
    sizes = np.bincount(labeled.ravel())

    good_ids = []
    for cid in np.where(sizes >= MIN_COMPONENT)[0]:
        if cid == 0:
            continue
        ys, xs = np.where(labeled == cid)
        bbox_area = max(1, int(ys.max() - ys.min() + 1) * int(xs.max() - xs.min() + 1))
        compactness = sizes[cid] / bbox_area
        if compactness >= MIN_COMPACTNESS:
            good_ids.append(cid)

    if not good_ids:
        # Nothing found — write unchanged image
        Image.fromarray(np.array(img, dtype=np.uint8), mode='RGBA').save(out_path)
        print(f'  no bunker components found — skipped')
        return

    large_mask = np.isin(labeled, good_ids)

    # ── Dilate to bridge thin green separator lines ────────────────────────────
    large_img = Image.fromarray((large_mask * 255).astype(np.uint8))
    zone_big  = np.array(large_img.filter(ImageFilter.MaxFilter(BRIDGE_PX * 2 + 1))) > 0

    # ── Fill: non-green, non-blue pixels with reasonable opacity inside zone ──
    full_mask = zone_big & (a > 50) & ~is_green & ~is_blue

    out = np.array(img, dtype=np.uint8)
    out[:,:,0] = np.where(full_mask, FLAT_R, out[:,:,0])
    out[:,:,1] = np.where(full_mask, FLAT_G, out[:,:,1])
    out[:,:,2] = np.where(full_mask, FLAT_B, out[:,:,2])

    Image.fromarray(out, mode='RGBA').save(out_path)
    print(f'  kept={len(good_ids)} comps  filled={int(full_mask.sum()):,}')


def main():
    holes = sorted(f for f in os.listdir(ORIG_DIR) if f.endswith('.png'))
    print(f'Processing {len(holes)} Augusta holes …')
    for fname in holes:
        print(f'  {fname}:', end='  ')
        recolor_hole(os.path.join(ORIG_DIR, fname), os.path.join(OUT_DIR, fname))
    print('Done.')


if __name__ == '__main__':
    main()
