# Marks the detected grip (hand) pixel on every frame of character sheets — mirrors computeHands() in js/assets.js.
#   cd v2/assets/chars && uv run --with pillow python3 ../../tools/hands_preview.py Villager Knight   -> /tmp/hands-detected.png
from PIL import Image, ImageDraw
import sys
def hands(im):
    px = im.load(); out = {}
    for d in range(4):
        for r in range(5):
            ox, oy = d * 16, r * 16
            band = range(11, 15) if r < 4 else range(10, 16)
            best = None
            for y in band:
                xs = [x for x in range(16) if px[ox + x, oy + y][3] > 0]
                if not xs: continue
                if d in (0, 3): cand = (max(xs), y)      # down: screen-right hand; right: front hand
                else: cand = (min(xs), y)                # up: screen-left; left: front hand
                if best is None or (d in (0, 3) and cand[0] > best[0]) or (d in (1, 2) and cand[0] < best[0]): best = cand
            x, y = best
            x += -1 if d in (0, 3) else 1                # step inside the outline
            out[(d, r)] = (x, y)
    return out
S = 9; names = sys.argv[1:]
sheet = Image.new('RGBA', (len(names) * (64 * S + 20), 80 * S), (90, 140, 80, 255)); dr = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    im = Image.open(f'{n}.png').convert('RGBA'); h = hands(im); ox = i * (64 * S + 20)
    sheet.alpha_composite(im.crop((0, 0, 64, 80)).resize((64 * S, 80 * S), Image.NEAREST), (ox, 0))
    for (d, r), (x, y) in h.items():
        cx, cy = ox + (d * 16 + x) * S + S // 2, (r * 16 + y) * S + S // 2
        dr.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], outline=(0, 255, 255, 255), width=2)
out = '/tmp/hands-detected.png'; sheet.save(out); print('wrote', out)
