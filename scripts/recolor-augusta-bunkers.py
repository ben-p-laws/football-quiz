"""
Augusta bunker recoloring — uniform flat fill.

Source: current images in public/holes/augusta/ (processed in-place)

Detects sandy/bunker pixels as seeds, dilates 30 px to catch shadow pixels
and the bunker outline ring, then flat-fills every matched pixel to a single
uniform sandy yellow (#c8a96e = RGB 200, 169, 110).

This removes all luminance variation, dark spots, and outlines inside bunkers.
"""

import os
from PIL import Image, ImageFilter
import numpy as np

IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

# Flat target color — matches SVG bunker fills in FootballGolf.tsx
FLAT_R, FLAT_G, FLAT_B = 200, 169, 110
DILATION_RADIUS = 30  # px; large enough to swallow the bunker outline ring


def rgb_to_hls(r, g, b):
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
    return (h / 6.0) % 1.0, l, s


def dilate(mask_bool, radius):
    pil = Image.fromarray((mask_bool * 255).astype(np.uint8), mode='L')
    return np.array(pil.filter(ImageFilter.MaxFilter(radius * 2 + 1))) > 0


def recolor_hole(path):
    img = Image.open(path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    _, l_arr, s_arr = rgb_to_hls(r, g, b)
    lum = l_arr * 255.0
    sat = s_arr * 100.0
    inside = a > 10

    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    is_blue  = (b > r + 20) & (b > g + 10)

    # Seed: bright warm/neutral pixels — the sandy bunker surface
    seed = (
        (lum > 70) & (sat < 55) &
        (g < r + 25) & (b > g - 40) &
        inside & ~is_green & ~is_blue
    )

    # Dilate to swallow shadows and the dark outline ring
    zone = dilate(seed, DILATION_RADIUS)

    # Full mask: everything in the zone that isn't clearly green or water
    full_mask = zone & inside & ~is_green & ~is_blue

    seeded = int(seed.sum())
    total  = int(full_mask.sum())

    # Flat fill — every bunker pixel becomes exactly the same sandy yellow
    data[:, :, 0] = np.where(full_mask, FLAT_R, data[:, :, 0])
    data[:, :, 1] = np.where(full_mask, FLAT_G, data[:, :, 1])
    data[:, :, 2] = np.where(full_mask, FLAT_B, data[:, :, 2])

    Image.fromarray(data.astype(np.uint8), mode='RGBA').save(path)
    print(f"  seed={seeded:,}  filled={total:,}")


def main():
    holes = sorted(f for f in os.listdir(IMG_DIR) if f.endswith('.png'))
    print(f"Processing {len(holes)} Augusta holes from {IMG_DIR} …")
    for fname in holes:
        print(f"  {fname}:", end='  ')
        recolor_hole(os.path.join(IMG_DIR, fname))
    print("Done.")


if __name__ == '__main__':
    main()
