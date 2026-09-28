# © 2026 Mathew. All rights reserved.
"""Badass Grillonia Prime server icon — black chrome war-planet, blood orange + steel.
No soft pink synthwave. 512x512 art/server_icon.png"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

random.seed(2100)
OUT = os.path.join(os.path.dirname(__file__), "art")
os.makedirs(OUT, exist_ok=True)

S = 512
CX = CY = S // 2
R = 200

BLOOD = (255, 42, 0)
EMBER = (255, 120, 20)
STEEL = (180, 190, 200)
CYAN_EDGE = (0, 220, 255)
BLACK = (4, 4, 8)
CHAR = (18, 16, 22)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))

base = Image.new("RGBA", (S, S), (0, 0, 0, 255))
bd = ImageDraw.Draw(base)

# void + sparse cold stars
for _ in range(280):
    x, y = random.randint(0, S - 1), random.randint(0, S - 1)
    if math.hypot(x - CX, y - CY) < R + 20:
        continue
    v = random.randint(40, 160)
    if random.random() < 0.08:
        bd.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(v, v + 10, v + 20, 255))
    else:
        bd.point((x, y), fill=(v, v, v, 255))

# hard rim glow (steel / cyan / blood) — layered
for rad, col, w in [
    (R + 28, (*BLOOD, 40), 18),
    (R + 18, (*EMBER, 55), 12),
    (R + 10, (*CYAN_EDGE, 70), 6),
    (R + 4, (*STEEL, 90), 3),
]:
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([CX - rad, CY - rad, CX + rad, CY + rad], outline=col, width=w)
    glow = glow.filter(ImageFilter.GaussianBlur(8 if w > 5 else 3))
    base = Image.alpha_composite(base, glow)

# planet body — almost black iron
planet = Image.new("RGBA", (S, S), (0, 0, 0, 0))
pd = ImageDraw.Draw(planet)
LX, LY = -0.4, -0.55
_ln = math.hypot(LX, LY)
LX, LY = LX / _ln, LY / _ln

for y in range(CY - R, CY + R + 1):
    dx = int(math.sqrt(max(0, R * R - (y - CY) ** 2)))
    for x in range(CX - dx, CX + dx + 1):
        nx = (x - CX) / R
        ny = (y - CY) / R
        nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
        diff = max(0.0, -(nx * LX + ny * LY))
        # dark iron + lit metal edge
        shade = 0.05 + 0.55 * diff ** 1.2
        col = lerp(CHAR, (55, 50, 60), shade)
        # terminator blood-orange burn
        if 0.15 < diff < 0.45:
            col = lerp(col, EMBER, 0.25 * (1 - abs(diff - 0.3) / 0.15))
        planet.putpixel((x, y), col + (255,))

base = Image.alpha_composite(base, planet)

# megacity scars — angular, aggressive, mostly blood/steel not candy
lights = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ld = ImageDraw.Draw(lights)

def on_sphere():
    while True:
        nx, ny = random.uniform(-1, 1), random.uniform(-1, 1)
        if nx * nx + ny * ny <= 0.92:
            return nx, ny

# war districts — hard clusters
for _ in range(45):
    cnx, cny = on_sphere()
    col = random.choice([BLOOD, EMBER, STEEL, BLOOD, CYAN_EDGE])
    hcx, hcy = CX + cnx * R, CY + cny * R
    # angular cross / slash instead of soft blob
    size = random.randint(2, 5)
    ld.line([(hcx - size, hcy), (hcx + size, hcy)], fill=col + (255,), width=2)
    ld.line([(hcx, hcy - size), (hcx, hcy + size)], fill=col + (255,), width=1)
    for _ in range(random.randint(60, 140)):
        nx = cnx + random.gauss(0, 0.07)
        ny = cny + random.gauss(0, 0.07)
        if nx * nx + ny * ny > 0.95:
            continue
        nz = math.sqrt(max(0, 1 - nx * nx - ny * ny))
        x, y = CX + nx * R, CY + ny * R
        b = random.uniform(0.5, 1.0) * (0.4 + 0.6 * nz)
        c = lerp((0, 0, 0), col, min(1, b))
        lights.putpixel((int(x), int(y)), c + (255,))

# equator war-line
for a in range(-80, 81, 2):
    rad = math.radians(a * 0.9)
    nx, ny = math.sin(rad) * 0.85, math.cos(rad) * 0.12 + random.uniform(-0.02, 0.02)
    if nx * nx + ny * ny > 0.95:
        continue
    x, y = int(CX + nx * R), int(CY + ny * R)
    lights.putpixel((x, y), BLOOD + (230,))

lights = lights.filter(ImageFilter.GaussianBlur(0.6))
base = Image.alpha_composite(base, lights)

# chrome ring / cracked orbital ring
ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
rd = ImageDraw.Draw(ring)
for i, (rr, col, w) in enumerate([
    (R + 6, STEEL + (200,), 2),
    (R + 14, (*BLOOD, 160), 1),
    (R + 22, (*CYAN_EDGE, 100), 1),
]):
    rd.ellipse([CX - rr, CY - rr // 3, CX + rr, CY + rr // 3], outline=col, width=w)
# tilt the ring
ring = ring.rotate(-18, resample=Image.BICUBIC, center=(CX, CY))
base = Image.alpha_composite(base, ring)

# sharp vignette
vig = Image.new("RGBA", (S, S), (0, 0, 0, 0))
vd = ImageDraw.Draw(vig)
for i in range(40):
    a = int(200 * (i / 40) ** 2)
    vd.rectangle([i, i, S - 1 - i, S - 1 - i], outline=(0, 0, 0, a))
base = Image.alpha_composite(base, vig)

# slight contrast punch
rgb = base.convert("RGB")
rgb = ImageEnhance.Contrast(rgb).enhance(1.25)
rgb = ImageEnhance.Color(rgb).enhance(1.15)
out = rgb.convert("RGBA")

path = os.path.join(OUT, "server_icon.png")
out.save(path, "PNG")
print(f"wrote {path}")
