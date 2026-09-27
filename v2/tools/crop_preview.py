# usage: uv run --with pillow python3 crops.py <tileset.png> <out.png> "name:c,r,w,h" ...
import sys
from PIL import Image, ImageDraw
src, out, specs = sys.argv[1], sys.argv[2], sys.argv[3:]
im = Image.open(src).convert('RGBA'); T=16; S=3
tiles=[]
for s in specs:
    n, r = s.split(':'); c, rr, w, h = map(int, r.split(','))
    tiles.append((n, im.crop((c*T, rr*T, (c+w)*T, (rr+h)*T))))
W = sum(t.size[0]*S+20 for _, t in tiles)+10; H = max(t.size[1]*S for _, t in tiles)+30
sheet = Image.new('RGBA', (W, H), (110, 170, 90, 255)); d = ImageDraw.Draw(sheet); x = 10
for n, t in tiles:
    sheet.alpha_composite(t.resize((t.size[0]*S, t.size[1]*S), Image.NEAREST), (x, 5))
    d.text((x, H-20), n, fill=(0, 0, 0, 255)); x += t.size[0]*S+20
sheet.save(out)
