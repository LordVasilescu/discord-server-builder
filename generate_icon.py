# © 2026 Mathew. All rights reserved.
"""Server icon: Grillonia Prime as a neon ecumenopolis planet seen from orbit (PIL).
Writes art/server_icon.png (512x512). City-lights sphere + atmospheric rim glow."""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter

random.seed(42)
OUT = os.path.join(os.path.dirname(__file__), "art")
os.makedirs(OUT, exist_ok=True)

S = 512                      # canvas
CX = CY = S // 2
R = 210                      # planet radius
LIGHT = (-0.55, -0.45)       # light direction (upper-left), normalized below
PINK = (255, 42, 109)
CYAN = (5, 217, 232)
GOLD = (255, 225, 77)
PURPLE = (176, 38, 255)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

# normalize light
_ln = math.hypot(*LIGHT)
LX, LY = LIGHT[0] / _ln, LIGHT[1] / _ln

base = Image.new("RGBA", (S, S), (3, 1, 8, 255))
bd = ImageDraw.Draw(base)

# deep-space stars
for _ in range(220):
    x, y = random.randint(0, S), random.randint(0, S)
    if math.hypot(x - CX, y - CY) < R + 14:   # keep space clear of planet
        continue
    b = random.randint(90, 230)
    tone = random.choice([(b, b, b), lerp((b, b, b), CYAN, 0.4), lerp((b, b, b), PINK, 0.3)])
    bd.point((x, y), fill=tone + (255,))

# --- planet sphere base (dark, shaded by light direction) ---
planet = Image.new("RGBA", (S, S), (0, 0, 0, 0))
pd = ImageDraw.Draw(planet)
for y in range(CY - R, CY + R):
    for_dx = int(math.sqrt(max(0, R * R - (y - CY) ** 2)))
    for x in range(CX - for_dx, CX + for_dx):
        nx = (x - CX) / R; ny = (y - CY) / R
        nz = math.sqrt(max(0, 1 - nx * nx - ny * ny))
        diff = max(0, -(nx * LX + ny * LY))         # lambert, light from upper-left
        shade = 0.10 + 0.30 * diff                  # night planet, lit crescent
        col = lerp((14, 8, 30), (70, 30, 110), shade)
        pd.point((x, y), fill=col + (255,))
base = Image.alpha_composite(base, planet)

# --- city lights on the sphere ---
lights = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ld = ImageDraw.Draw(lights)
def sphere_pt():
    while True:
        nx, ny = random.uniform(-1, 1), random.uniform(-1, 1)
        if nx * nx + ny * ny <= 0.985:
            return nx, ny
# dense glowing megacity clusters
for _ in range(60):
    cnx, cny = sphere_pt()
    cluster_col = random.choice([PINK, CYAN, GOLD, PURPLE, CYAN, PINK])
    # bright hot core of the metroplex
    hcx = CX + cnx * R; hcy = CY + cny * R
    ld.ellipse([hcx - 4, hcy - 4, hcx + 4, hcy + 4],
               fill=lerp(cluster_col, (255, 255, 255), 0.5) + (255,))
    for _ in range(random.randint(90, 220)):
        nx = cnx + random.gauss(0, 0.10)
        ny = cny + random.gauss(0, 0.10)
        if nx * nx + ny * ny > 0.985:
            continue
        nz = math.sqrt(max(0, 1 - nx * nx - ny * ny))
        edge = nz                                    # dim lights near the limb
        x = CX + nx * R; y = CY + ny * R
        b = random.uniform(0.65, 1.0) * (0.5 + 0.5 * edge)
        ld.point((x, y), fill=lerp((0, 0, 0), cluster_col, min(1, b)) + (255,))
# scattered single lights everywhere
for _ in range(5000):
    nx, ny = sphere_pt()
    nz = math.sqrt(max(0, 1 - nx * nx - ny * ny))
    x = CX + nx * R; y = CY + ny * R
    c = random.choice([PINK, CYAN, GOLD, CYAN, PINK])
    b = random.uniform(0.25, 0.8) * (0.45 + 0.55 * nz)
    ld.point((x, y), fill=lerp((0, 0, 0), c, b) + (255,))

glow = lights.filter(ImageFilter.GaussianBlur(3))
base = Image.alpha_composite(base, glow)
base = Image.alpha_composite(base, glow)
base = Image.alpha_composite(base, lights)

# --- atmospheric rim glow (neon halo) ---
rim = Image.new("RGBA", (S, S), (0, 0, 0, 0))
rd = ImageDraw.Draw(rim)
rd.ellipse([CX - R, CY - R, CX + R, CY + R], outline=CYAN + (255,), width=10)
halo = rim.filter(ImageFilter.GaussianBlur(16))
for _ in range(4):
    base = Image.alpha_composite(base, halo)
rim2 = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(rim2).ellipse([CX - R + 1, CY - R + 1, CX + R - 1, CY + R - 1],
                             outline=lerp(CYAN, PINK, 0.5) + (255,), width=4)
rim2 = rim2.filter(ImageFilter.GaussianBlur(5))
for _ in range(3):
    base = Image.alpha_composite(base, rim2)
# crisp bright limb on the lit side
limb = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(limb).arc([CX - R, CY - R, CX + R, CY + R], start=150, end=330,
                         fill=lerp(CYAN, (255, 255, 255), 0.4) + (255,), width=3)
base = Image.alpha_composite(base, limb.filter(ImageFilter.GaussianBlur(1)))

# subtle vignette
vig = Image.new("L", (S, S), 0)
ImageDraw.Draw(vig).ellipse([-S * 0.15, -S * 0.15, S * 1.15, S * 1.15], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(90))
dark = Image.new("RGBA", (S, S), (0, 0, 0, 120))
base = Image.alpha_composite(base, Image.composite(Image.new("RGBA", (S, S), (0, 0, 0, 0)), dark, vig))

base.convert("RGB").save(os.path.join(OUT, "server_icon.png"))
print("  + art/server_icon.png  [512x512 neon planet]")
