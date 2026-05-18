"""
Targeted dark-shadow fix for Augusta bunkers.

Source: the be06d9f images — already RGBA, correct size, correct sandy bunkers.
These are the images the user confirmed looked right (on hole 1).

Fix: the RGB ratio shift used in those commits leaves dark shadow areas still
looking neutral-grey. This script detects warm/sandy pixels that already exist
in the source image, dilates 25 px to locate adjacent dark-grey shadow pixels,
then applies HSL recoloring (H 38°, S 48%, preserve L) to those shadows only.

Everything else — water, rough, trees, the transparent border — is unchanged.
"""

import os, shutil
from PIL import Image, ImageFilter
import numpy as np

SRC_DIR = '/tmp/be06d9f_images'   # already-recolored RGBA images (correct bunkers)
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

SANDY_HUE = 38 / 360.0
SANDY_SAT  = 0.48
SHADOW_RADIUS = 25   # px expansion from sandy pixels to find adjacent shadows


def rgb_to_hls(r, g, b):
    rn, gn, bn = r/255.0, g/255.0, b/255.0
    maxc = np.maximum(np.maximum(rn,gn),bn)
    minc = np.minimum(np.minimum(rn,gn),bn)
    l = (maxc+minc)/2.0
    diff = maxc-minc
    s = np.where(diff==0, 0.0,
        np.where(l>0.5, diff/(2.0-maxc-minc), diff/(maxc+minc)))
    rc = np.where(diff>0,(maxc-rn)/diff,0.0)
    gc = np.where(diff>0,(maxc-gn)/diff,0.0)
    bc = np.where(diff>0,(maxc-bn)/diff,0.0)
    h = np.where(maxc==rn, bc-gc,
        np.where(maxc==gn, 2.0+rc-bc, 4.0+gc-rc))
    return (h/6.0)%1.0, l, s


def _v(p1, p2, hue):
    hue = hue%1.0
    return np.where(hue<1/6, p1+(p2-p1)*hue*6,
           np.where(hue<1/2, p2,
           np.where(hue<2/3, p1+(p2-p1)*(2/3-hue)*6, p1)))


def hls_to_rgb(h, l, s):
    p2 = np.where(l<=0.5, l*(1.0+s), l+s-l*s)
    p1 = 2.0*l-p2
    return (_v(p1,p2,h+1/3)*255, _v(p1,p2,h)*255, _v(p1,p2,h-1/3)*255)


def dilate(mask, radius):
    pil = Image.fromarray((mask*255).astype(np.uint8), mode='L')
    return np.array(pil.filter(ImageFilter.MaxFilter(radius*2+1))) > 0


def fix_hole(src_path, out_path):
    img = Image.open(src_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    h_arr, l_arr, s_arr = rgb_to_hls(r, g, b)
    lum255 = l_arr * 255.0
    sat100 = s_arr * 100.0

    # Already-sandy pixels: R is warm dominant (from the previous recoloring)
    sandy = (r > g) & (r > b * 1.15) & (lum255 > 40) & (a > 10)

    # Dilate to find adjacent shadow zone
    shadow_zone = dilate(sandy.astype(np.uint8), SHADOW_RADIUS)

    # Shadow pixels: dark, neutral (low saturation), inside hole, not green, not blue-dominant
    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    is_blue  = (b > r + 20) & (b > g + 10)   # sky / water reflections
    shadow_pixels = (
        shadow_zone &
        (lum255 < 65) & (sat100 < 38) &
        (a > 10) &
        ~is_green & ~is_blue
    )

    print(f"  sandy={sandy.sum():,}  shadows_to_fix={shadow_pixels.sum():,}")

    # HSL recolor for shadow pixels only
    target_h = np.full_like(h_arr, SANDY_HUE)
    target_s = np.full_like(l_arr, SANDY_SAT)
    adj_l = np.where(l_arr < 0.08, l_arr + 0.06, l_arr)

    new_r, new_g, new_b = hls_to_rgb(target_h, adj_l, target_s)

    result = data.copy()
    result[:,:,0] = np.where(shadow_pixels, np.clip(new_r,0,255), r)
    result[:,:,1] = np.where(shadow_pixels, np.clip(new_g,0,255), g)
    result[:,:,2] = np.where(shadow_pixels, np.clip(new_b,0,255), b)
    # Alpha unchanged

    Image.fromarray(result.astype(np.uint8), mode='RGBA').save(out_path)


def main():
    holes = sorted(f for f in os.listdir(SRC_DIR) if f.endswith('.png'))
    print(f"Fixing shadows in {len(holes)} Augusta holes …")
    for fname in holes:
        print(f"  {fname}:", end='')
        fix_hole(
            os.path.join(SRC_DIR, fname),
            os.path.join(OUT_DIR, fname),
        )
    print("Done.")


if __name__ == '__main__':
    main()
