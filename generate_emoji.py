# © 2026 Mathew. All rights reserved.
"""Generate clean neon-glow custom emoji (128x128 transparent PNG) for Grillonia Prime.

Neon look = soft COLORED halo (no black fringe) + saturated glyph + bright inner core.
Built from a sharp grayscale mask so glow carries the hue, never black.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "emoji")
os.makedirs(OUT, exist_ok=True)
FONT = "C:/Windows/Fonts/impact.ttf"
SZ = 128

GLYPHS = {  # name -> (text, neon hex)
    "gg":     ("GG",  "#00f0ff"),
    "pressf": ("F",   "#ff10f0"),
    "dub":    ("W",   "#39ff14"),
    "ratio":  ("L",   "#ff003c"),
    "pog":    ("POG", "#ff8a00"),
    "glitch": ("404", "#ff003c"),
}

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def neonize(mask, rgb):
    """mask = grayscale 'L' sharp alpha of the glyph. Returns neon RGBA."""
    canvas = Image.new("RGBA", (SZ, SZ), (0, 0, 0, 0))

    # 1. soft colored glow — blur the mask, amplify, paint it in the neon hue
    glow_a = mask.filter(ImageFilter.GaussianBlur(6)).point(lambda a: min(255, int(a * 1.9)))
    glow = Image.new("RGBA", (SZ, SZ), rgb + (0,)); glow.putalpha(glow_a)
    for _ in range(2):                       # stack to intensify bloom
        canvas = Image.alpha_composite(canvas, glow)

    # 2. saturated full-strength glyph
    edge = Image.new("RGBA", (SZ, SZ), rgb + (0,)); edge.putalpha(mask)
    canvas = Image.alpha_composite(canvas, edge)

    # 3. bright inner core (shrink mask, fill near-white tint of the hue)
    core_a = mask.filter(ImageFilter.MinFilter(7))
    core_col = tuple(min(255, c + 130) for c in rgb)
    core = Image.new("RGBA", (SZ, SZ), core_col + (0,)); core.putalpha(core_a)
    canvas = Image.alpha_composite(canvas, core)
    return canvas

def text_mask(text):
    size = 8
    while size < 220:
        f = ImageFont.truetype(FONT, size + 2)
        b = f.getbbox(text)
        if (b[2] - b[0]) > SZ - 22 or (b[3] - b[1]) > SZ - 26:
            break
        size += 2
    font = ImageFont.truetype(FONT, size)
    mask = Image.new("L", (SZ, SZ), 0)
    d = ImageDraw.Draw(mask)
    b = font.getbbox(text)
    x = (SZ - (b[2] - b[0])) / 2 - b[0]
    y = (SZ - (b[3] - b[1])) / 2 - b[1]
    d.text((x, y), text, font=font, fill=255)
    return mask

def shape_mask(draw_fn):
    mask = Image.new("L", (SZ, SZ), 0)
    draw_fn(ImageDraw.Draw(mask))
    return mask

def save(name, mask, rgb, label):
    neonize(mask, rgb).save(os.path.join(OUT, f"{name}.png"))
    print(f"  + {name}.png  {label}")

for name, (text, color) in GLYPHS.items():
    save(name, text_mask(text), hex2rgb(color), f"[{text}] {color}")

# checkmark
save("chiptick", shape_mask(lambda d: d.line([(30, 68), (54, 92), (100, 36)], fill=255, width=18, joint="curve")),
     hex2rgb("#39ff14"), "(check)")

# heart
def heart(d):
    cx, top, r = SZ / 2, 32, 25
    d.ellipse([cx - 2 * r, top, cx, top + 2 * r], fill=255)
    d.ellipse([cx, top, cx + 2 * r, top + 2 * r], fill=255)
    d.polygon([(cx - 2 * r + 3, top + r + 5), (cx + 2 * r - 3, top + r + 5), (cx, SZ - 24)], fill=255)
save("heart", shape_mask(heart), hex2rgb("#ff10f0"), "(heart)")

print("done.")
