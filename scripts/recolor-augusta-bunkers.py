"""
Recolors Augusta hole bunkers to warm sandy yellow.

Identical detection logic to commits 53c2805 / be06d9f that the user
confirmed looked correct, with two improvements:
  1. HSL recolor (set hue 38°, sat 48%, keep luminosity) instead of the
     old RGB ratio shift — dark shadow pixels now look sandy, not grey.
  2. RGBA preserved — transparent border stays transparent.

Detection passes (from originals):
  Pass 1: bright grey seed pixels → MaxFilter 30 px dilation
  Pass 2: near-black shadow pixels (lum 5-30, sat < 55) within Pass 1 zone
           → MaxFilter 50 px additional dilation
  Combined mask, then exclude transparent bg pixels.
"""

import os
from PIL import Image, ImageFilter
import numpy as np

ORIG_DIR = '/tmp/augusta_orig'
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

SANDY_HUE = 38 / 360.0
SANDY_SAT  = 0.48


def rgb_to_hls_array(r, g, b):
    rn, gn, bn = r/255.0, g/255.0, b/255.0
    maxc = np.maximum(np.maximum(rn, gn), bn)
    minc = np.minimum(np.minimum(rn, gn), bn)
    l = (maxc + minc) / 2.0
    diff = maxc - minc
    s = np.where(diff == 0, 0.0,
        np.where(l > 0.5, diff/(2.0-maxc-minc), diff/(maxc+minc)))
    rc = np.where(diff > 0, (maxc-rn)/diff, 0.0)
    gc = np.where(diff > 0, (maxc-gn)/diff, 0.0)
    bc = np.where(diff > 0, (maxc-bn)/diff, 0.0)
    h = np.where(maxc == rn, bc-gc,
        np.where(maxc == gn, 2.0+rc-bc, 4.0+gc-rc))
    h = (h/6.0) % 1.0
    return h, l, s


def _hls_v(p1, p2, hue):
    hue = hue % 1.0
    return np.where(hue < 1/6, p1+(p2-p1)*hue*6,
           np.where(hue < 1/2, p2,
           np.where(hue < 2/3, p1+(p2-p1)*(2/3-hue)*6, p1)))


def hls_to_rgb_array(h, l, s):
    p2 = np.where(l <= 0.5, l*(1.0+s), l+s-l*s)
    p1 = 2.0*l - p2
    r = np.where(s == 0, l, _hls_v(p1, p2, h+1/3))
    g = np.where(s == 0, l, _hls_v(p1, p2, h))
    b = np.where(s == 0, l, _hls_v(p1, p2, h-1/3))
    return r*255.0, g*255.0, b*255.0


def dilate(mask_uint8, radius):
    pil = Image.fromarray(mask_uint8 * 255, mode='L')
    return (np.array(pil.filter(ImageFilter.MaxFilter(radius*2+1))) > 0)


def recolor_hole(orig_path, out_path):
    img = Image.open(orig_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    _, l, s = rgb_to_hls_array(r, g, b)
    lum = l * 255.0
    sat = s * 100.0

    inside = a > 10   # inside the hole silhouette

    # Pass 1 — bright grey bunker surface → 30 px dilation
    seed = (
        (lum > 80) & (sat < 40) & (g < r + 25) & (b > g - 35) & inside
    ).astype(np.uint8)
    zone = dilate(seed, 30)

    # Pass 2 — near-black shadows within the zone → extra 50 px dilation
    near_black = (
        zone & inside &
        (lum >= 5) & (lum <= 30) & (sat < 55)
    ).astype(np.uint8)
    shadow_zone = dilate(near_black, 50)

    bunker_region = (zone | shadow_zone) & inside

    print(f"  seed={seed.sum():,}  bunker={bunker_region.sum():,}")

    # HSL recolor — preserve luminosity, apply sandy hue + sat
    h_arr, l_arr, _ = rgb_to_hls_array(r, g, b)
    target_h = np.full_like(h_arr, SANDY_HUE)
    target_s = np.full_like(l_arr, SANDY_SAT)
    # Lift near-black so sandy hue is perceptible in deep shadows
    adj_l = np.where(l_arr < 0.08, l_arr + 0.06, l_arr)

    new_r, new_g, new_b = hls_to_rgb_array(target_h, adj_l, target_s)

    result = data.copy()
    m = bunker_region
    result[:,:,0] = np.where(m, np.clip(new_r,0,255), r)
    result[:,:,1] = np.where(m, np.clip(new_g,0,255), g)
    result[:,:,2] = np.where(m, np.clip(new_b,0,255), b)

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
