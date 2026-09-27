# Packs every runtime sprite into a few texture atlases.
#
#   uv run --with pillow python3 v2/tools/pack_atlas.py        (or: pip install pillow; python3 v2/tools/pack_atlas.py)
#
# Reads the loader's asset list (node v2/tests/asset-list.mjs), writes
#   v2/assets/atlas/atlas{N}.png  +  v2/assets/atlas/atlas.json  {sheets:[...], frames:{"assets/...png":[sheet,x,y,w,h]}}
# RUN THIS AFTER ADDING OR CHANGING ANY SPRITE. The game prefers the atlas; if a sprite is missing from it the loader
# falls back to the single file, but deploys only ship the atlas, so a stale atlas = invisible sprites in production.
import json, os, subprocess, sys
from PIL import Image

V2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(V2)
paths = json.loads(subprocess.check_output(['node', 'tests/asset-list.mjs'], text=True))
ims = []
for p in paths:
    if not os.path.exists(p):
        sys.exit(f'MISSING sprite referenced by js/assets.js: {p}')
    ims.append((p, Image.open(p).convert('RGBA')))
ims.sort(key=lambda t: (-t[1].size[1], -t[1].size[0]))      # tallest first: simple shelf packing

MAXW, MAXH, PAD = 1024, 2048, 1
sheets, frames = [], {}
cur = None; x = y = rowh = 0

def new_sheet():
    global cur, x, y, rowh
    cur = Image.new('RGBA', (MAXW, MAXH), (0, 0, 0, 0)); sheets.append([cur, 0]); x = y = rowh = 0

new_sheet()
for p, im in ims:
    w, h = im.size
    if x + w > MAXW: x, y, rowh = 0, y + rowh + PAD, 0
    if y + h > MAXH: new_sheet()
    cur.paste(im, (x, y)); frames[p] = [len(sheets) - 1, x, y, w, h]
    sheets[-1][1] = max(sheets[-1][1], y + h); x += w + PAD; rowh = max(rowh, h)

os.makedirs('assets/atlas', exist_ok=True)
for f in os.listdir('assets/atlas'):
    os.remove(os.path.join('assets/atlas', f))
names = []
for i, (sh, used) in enumerate(sheets):
    n = f'atlas{i}.png'; sh.crop((0, 0, MAXW, used)).save(f'assets/atlas/{n}', optimize=True); names.append(n)
json.dump({'sheets': names, 'frames': frames}, open('assets/atlas/atlas.json', 'w'), separators=(',', ':'))
print(len(frames), 'sprites ->', len(names), 'sheets', [os.path.getsize('assets/atlas/' + n) for n in names])
