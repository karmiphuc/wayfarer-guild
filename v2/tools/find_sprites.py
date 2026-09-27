# Detect opaque connected components in a tileset; write labeled sheet + JSON of pixel bboxes.
import sys, json
from PIL import Image, ImageDraw
src, out, jout = sys.argv[1:4]
minsz = int(sys.argv[4]) if len(sys.argv) > 4 else 10
im = Image.open(src).convert('RGBA'); W, H = im.size; px = im.load()
seen = [[False]*W for _ in range(H)]; boxes = []
for y in range(H):
    for x in range(W):
        if seen[y][x] or px[x, y][3] < 10: continue
        st = [(x, y)]; seen[y][x] = True; x0 = x1 = x; y0 = y1 = y
        while st:
            cx, cy = st.pop()
            x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = cx+dx, cy+dy
                if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx] and px[nx, ny][3] >= 10:
                    seen[ny][nx] = True; st.append((nx, ny))
        if (x1-x0+1) >= minsz and (y1-y0+1) >= minsz: boxes.append([x0, y0, x1-x0+1, y1-y0+1])
S = 3; big = Image.new('RGBA', (W*S, H*S), (110, 170, 90, 255))
big.alpha_composite(im.resize((W*S, H*S), Image.NEAREST)); d = ImageDraw.Draw(big)
for i, (x, y, w, h) in enumerate(boxes):
    d.rectangle([x*S, y*S, (x+w)*S-1, (y+h)*S-1], outline=(255, 0, 0, 255))
    d.rectangle([x*S, y*S, x*S+18, y*S+11], fill=(0, 0, 0, 200)); d.text((x*S+2, y*S), str(i), fill=(255, 255, 0, 255))
big.save(out); json.dump(boxes, open(jout, 'w'))
print(len(boxes), 'components')
