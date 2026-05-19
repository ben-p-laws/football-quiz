"""
Augusta bunker recoloring — uniform flat fill from originals.

Source: 6148b9f originals in /tmp/augusta_orig/
Output: public/holes/augusta/

Original bunkers are bright, near-neutral grey (R~220-240, low saturation).
We detect those as seeds, dilate 15 px to catch the dark outline ring, then
flat-fill every matched pixel to #c8a96e (RGB 200, 169, 110).

15 px dilation is safe for hole 12 — seeds are ≥25 px above Rae's Creek.
"""

import os
from PIL import Image, ImageFilter
import numpy as np

ORIG_DIR = '/tmp/augusta_orig'
OUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

# Flat target color — matches SVG bunker fills in FootballGolf.tsx (#c8a96e)
FLAT_R, FLAT_G, FLAT_B = 200, 169, 110
DILATION_RADIUS = 15  # px; enough to cover the outline, won't bleed into trees


def rgb_to_hls(r, g, b):
    rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
    maxc = np.maximum(np.maximum(rn, gn), bn)
    minc = np.minimum(np.minimum(rn, gn), bn)
    l = (maxc + minc) / 2.0
    diff = maxc - minc
    s = np.where(diff == 0, 0.0,
        np.where(l > 0.5, diff / (2.0 - maxc - minc), diff / (maxc + minc)))
    return l, s


def dilate(mask_bool, radius):
    pil = Image.fromarray((mask_bool * 255).astype(np.uint8), mode='L')
    return np.array(pil.filter(ImageFilter.MaxFilter(radius * 2 + 1))) > 0


def recolor_hole(src_path, out_path):
    img = Image.open(src_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    l_arr, s_arr = rgb_to_hls(r, g, b)
    lum = l_arr * 255.0
    sat = s_arr * 100.0
    inside = a > 10

    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    is_blue  = (b > r + 20) & (b > g + 10)

    # Seed: original bunkers are bright near-neutral grey (lum > 80, sat < 25)
    seed = (
        (lum > 80) & (sat < 25) &
        inside & ~is_green & ~is_blue
    )

    # Dilate to cover the dark outline ring around each bunker
    zone = dilate(seed, DILATION_RADIUS)

    # Full mask: zone pixels that aren't clearly grass or water
    full_mask = zone & inside & ~is_green & ~is_blue

    # Flat fill — every bunker pixel becomes the same sandy yellow
    data[:, :, 0] = np.where(full_mask, FLAT_R, data[:, :, 0])
    data[:, :, 1] = np.where(full_mask, FLAT_G, data[:, :, 1])
    data[:, :, 2] = np.where(full_mask, FLAT_B, data[:, :, 2])

    Image.fromarray(data.astype(np.uint8), mode='RGBA').save(out_path)
    print(f"  seed={int(seed.sum()):,}  filled={int(full_mask.sum()):,}")


def main():
    holes = sorted(f for f in os.listdir(ORIG_DIR) if f.endswith('.png'))
    print(f"Processing {len(holes)} Augusta holes …")
    for fname in holes:
        print(f"  {fname}:", end='  ')
        recolor_hole(
            os.path.join(ORIG_DIR, fname),
            os.path.join(OUT_DIR, fname),
        )
    print("Done.")


if __name__ == '__main__':
    main()
