"""
Augusta bunker recoloring — final version.

Source: 6148b9f originals (/tmp/augusta_orig/) — correct image dimensions
        that match AUGUSTA_YSCALE in FootballGolf.tsx.

Two-pass HSL recolor, no large dilation:
  Pass 1 — bright grey bunker surface (lum>80, sat<40, warm-biased):
            apply HSL recolor directly (no dilation).
  Pass 2 — dark shadow pixels adjacent to Pass-1 pixels (≤20 px away):
            lum 5-70, sat<40, not green, not blue-dominant.
            Apply HSL recolor.

20 px dilation is safe for hole 12 where the bunker edge is ~17 px from
Rae's Creek, because the seeds (bright sand) are centred ≥25 px above
the water, so 20 px dilation stays ≤5 px from the water edge.
"""

import os
from PIL import Image, ImageFilter
import numpy as np

ORIG_DIR = '/tmp/augusta_orig'   # 6148b9f images — correct size for YSCALE
OUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'public', 'holes', 'augusta')

SANDY_HUE = 38 / 360.0
SANDY_SAT  = 0.48


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


def apply_sandy(data, mask, h_arr, l_arr):
    """Apply HSL sandy recolor to masked pixels in-place."""
    adj_l = np.where(l_arr < 0.10, l_arr + 0.08, l_arr)
    nr, ng, nb = hls_to_rgb(
        np.full_like(h_arr, SANDY_HUE),
        adj_l,
        np.full_like(l_arr, SANDY_SAT),
    )
    data[:,:,0] = np.where(mask, np.clip(nr,0,255), data[:,:,0])
    data[:,:,1] = np.where(mask, np.clip(ng,0,255), data[:,:,1])
    data[:,:,2] = np.where(mask, np.clip(nb,0,255), data[:,:,2])


def dilate(mask_bool, radius):
    pil = Image.fromarray((mask_bool*255).astype(np.uint8), mode='L')
    return np.array(pil.filter(ImageFilter.MaxFilter(radius*2+1))) > 0


def recolor_hole(src_path, out_path):
    img = Image.open(src_path).convert('RGBA')
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    h_arr, l_arr, s_arr = rgb_to_hls(r, g, b)
    lum = l_arr * 255.0
    sat = s_arr * 100.0
    inside = a > 10

    # Shared exclusions
    is_green = (g > r + 10) & (g > b + 10) & (g > 45)
    is_blue  = (b > r + 20) & (b > g + 10)

    # ── Pass 1: bright grey bunker surface ──────────────────────────────────
    seed = (
        (lum > 80) & (sat < 40) &
        (g < r + 25) & (b > g - 35) &
        inside & ~is_green & ~is_blue
    )
    apply_sandy(data, seed, h_arr, l_arr)
    print(f"  seed={seed.sum():,}", end='')

    # ── Pass 2: dark shadows within 20 px of seeds ───────────────────────
    zone = dilate(seed, 20)
    shadow = (
        zone & inside &
        (lum >= 5) & (lum <= 70) &
        (sat < 40) &
        ~is_green & ~is_blue
    )
    # Re-compute HLS on updated data (Pass 1 already changed seed pixels)
    r2, g2, b2 = data[:,:,0], data[:,:,1], data[:,:,2]
    h2, l2, _ = rgb_to_hls(r2, g2, b2)
    apply_sandy(data, shadow, h2, l2)
    print(f"  shadow={shadow.sum():,}")

    Image.fromarray(data.astype(np.uint8), mode='RGBA').save(out_path)


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
