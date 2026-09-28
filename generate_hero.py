# © 2026 Mathew. All rights reserved.
"""Procedural synthwave hero banners for Grillonia Prime embeds (PIL)."""
import os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(7)
OUT = os.path.join(os.path.dirname(__file__), "art")
os.makedirs(OUT, exist_ok=True)
TITLE_FONT = "C:/Windows/Fonts/impact.ttf"
W, H, HZ = 1280, 448, 300   # width, height, horizon y

def rgb(h): h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def scene(theme, title):
    sky_top = rgb(theme["sky_top"]); horizon = rgb(theme["horizon"])
    sun_top = rgb(theme["sun_top"]); sun_bot = rgb(theme["sun_bot"])
    grid = rgb(theme["grid"]); accent = rgb(theme["accent"]); tcol = rgb(theme["title"])

    base = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    bd = ImageDraw.Draw(base)
    # sky gradient
    for y in range(HZ):
        bd.line([(0, y), (W, y)], fill=lerp(sky_top, horizon, (y / HZ) ** 1.3) + (255,))
    # ground gradient (dark)
    gnd_near = lerp((0, 0, 0), horizon, 0.10)
    for y in range(HZ, H):
        bd.line([(0, y), (W, y)], fill=lerp(horizon, gnd_near, (y - HZ) / (H - HZ)) + (255,))
    # stars
    for _ in range(140):
        x, y = random.randint(0, W), random.randint(0, HZ - 130)
        b = random.randint(120, 255)
        bd.point((x, y), fill=(b, b, b, 255))

    neon = Image.new("RGBA", (W, H), (0, 0, 0, 0))   # bright bits to be blurred for glow
    nd = ImageDraw.Draw(neon)

    # sun (vertical gradient disc) + scanline gaps in lower half
    cx, R = W // 2, 135
    sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    for y in range(HZ - R, HZ + R):
        t = (y - (HZ - R)) / (2 * R)
        sd.line([(0, y), (W, y)], fill=lerp(sun_top, sun_bot, t) + (255,))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse([cx - R, HZ - R, cx + R, HZ + R], fill=255)
    sun.putalpha(mask)
    base = Image.alpha_composite(base, sun)
    bd = ImageDraw.Draw(base)
    gap = 4
    for i, y in enumerate(range(HZ - 10, HZ + R, 0 + gap + 2)):  # widening gaps downward
        h = 2 + i
        bd.rectangle([cx - R, y, cx + R, y + h], fill=lerp(sky_top, horizon, 0.9) + (255,))

    # skyline silhouette along horizon
    x = -20
    while x < W + 20:
        bw = random.randint(26, 64); bh = random.randint(24, 130)
        bldg = lerp((0, 0, 0), accent, 0.06)
        bd.rectangle([x, HZ - bh, x + bw, HZ], fill=bldg + (255,))
        nd.line([(x, HZ - bh), (x + bw, HZ - bh)], fill=accent + (255,), width=2)  # lit roof edge
        for _ in range(random.randint(0, 5)):     # windows
            wx = random.randint(x + 4, x + bw - 4); wy = random.randint(HZ - bh + 6, HZ - 6)
            nd.rectangle([wx, wy, wx + 2, wy + 3], fill=accent + (255,))
        x += bw + random.randint(6, 16)

    # perspective grid floor
    for i in range(1, 26):                          # horizontal lines (denser near horizon)
        y = HZ + (H - HZ) * (i / 25) ** 2.2
        nd.line([(0, y), (W, y)], fill=grid + (255,), width=1)
    for vx in range(-W, 2 * W, 60):                 # verticals converge to (cx, HZ)
        nd.line([(vx, H), (cx, HZ)], fill=grid + (200,), width=1)

    # title with neon glow
    fs = 92
    font = ImageFont.truetype(TITLE_FONT, fs)
    b = font.getbbox(title); tw = b[2] - b[0]
    tx = (W - tw) // 2 - b[0]; ty = 34
    nd.text((tx, ty), title, font=font, fill=tcol + (255,))

    # glow = blurred neon layer, stacked; then sharp neon on top
    glow = neon.filter(ImageFilter.GaussianBlur(5))
    for _ in range(2):
        base = Image.alpha_composite(base, glow)
    base = Image.alpha_composite(base, neon)
    # white-hot title core
    td = ImageDraw.Draw(base)
    td.text((tx, ty), title, font=font, fill=lerp(tcol, (255, 255, 255), 0.55) + (255,))

    # scanlines + vignette
    sl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sld = ImageDraw.Draw(sl)
    for y in range(0, H, 3):
        sld.line([(0, y), (W, y)], fill=(0, 0, 0, 38))
    base = Image.alpha_composite(base, sl)
    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse([-W * 0.2, -H * 0.3, W * 1.2, H * 1.3], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 130))
    base = Image.alpha_composite(base, Image.composite(Image.new("RGBA", (W, H), (0, 0, 0, 0)), dark, vig))
    return base.convert("RGB")

THEMES = {
    "hero_boot": (dict(sky_top="#1a0b2e", horizon="#ff2a6d", sun_top="#ffe14d", sun_bot="#ff2a6d",
                       grid="#05d9e8", accent="#05d9e8", title="#05d9e8"), "GRILLONIA PRIME"),
    "hero_code": (dict(sky_top="#2a0610", horizon="#ff003c", sun_top="#ff8a00", sun_bot="#ff003c",
                       grid="#ff5277", accent="#ff8a00", title="#ff5277"), "THE CODE"),
    "hero_augments": (dict(sky_top="#0b022e", horizon="#b026ff", sun_top="#39ff14", sun_bot="#00e5ff",
                           grid="#39ff14", accent="#b026ff", title="#39ff14"), "GET CHIPPED"),
}
for name, (theme, title) in THEMES.items():
    scene(theme, title).save(os.path.join(OUT, f"{name}.png"))
    print(f"  + {name}.png  [{title}]")
print("done.")
