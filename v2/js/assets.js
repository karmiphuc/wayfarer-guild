// Image loading. Every sprite comes from assets/ (Ninja Adventure, CC0).
import { JOBS, MONSTERS, BOSSES, ITEMS, MATS, HAPPENINGS, CHARTERS } from './data.js';

export const IMG = {};
export const HANDS = {};   // sheetKey -> [dir][row] = [x, y] grip pixel inside the 16x16 frame

// Find the weapon hand in every frame: the outermost opaque pixel on the facing side, in the band
// below the (wide chibi) head, stepped one pixel inside the outline. Rows 0-3 walk, row 4 attack.
function computeHands(key, im) {
  if (im.height < 80) return;
  const c = document.createElement('canvas'); c.width = 64; c.height = 80;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  let data; try { data = g.getImageData(0, 0, 64, 80).data; } catch { return; }
  const op = (x, y) => data[(y * 64 + x) * 4 + 3] > 0;
  const t = [];
  for (let d = 0; d < 4; d++) {
    t[d] = [];
    for (let r = 0; r < 5; r++) {
      const right = d === 0 || d === 3; let best = null;
      for (let y = r < 4 ? 11 : 10; y <= (r < 4 ? 14 : 15); y++) {
        for (let i = 0; i < 16; i++) {
          const x = right ? 15 - i : i;
          if (op(d * 16 + x, r * 16 + y)) { if (!best || (right ? x > best[0] : x < best[0])) best = [x, y]; break; }
        }
      }
      if (!best) best = [right ? 12 : 3, 12];
      t[d][r] = [best[0] + (right ? -1 : 1), best[1]];
    }
  }
  HANDS[key] = t;
}
export const EMOTE = { happy: 6, love: 27, zzz: 28, star: 29, exclaim: 22, annoyed: 9, sad: 16, hungry: 1, skull: 15, heart: 27, fire: 7, question: 23, cross: 30, music: 11 };

function load(key, src) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => { IMG[key] = im; if (key.startsWith('c_')) computeHands(key, im); res(); };
    im.onerror = () => { console.warn('missing asset', src); res(); };
    im.src = src;
  });
}

export function assetList() {
  const list = [
    ['floor', 'assets/tiles/Floor.png'], ['nature', 'assets/tiles/Nature.png'], ['house', 'assets/tiles/House.png'],
    ['element', 'assets/tiles/Element.png'], ['towers', 'assets/tiles/Towers.png'], ['field', 'assets/tiles/Field.png'],
    ['shadow', 'assets/chars/Shadow.png'],
    ['fx_slash', 'assets/fx/Slash/SpriteSheet.png'], ['fx_claw', 'assets/fx/Claw/SpriteSheet.png'], ['fx_smoke', 'assets/fx/Smoke/SpriteSheet.png'],
    ['fx_spark', 'assets/fx/Spark/SpriteSheet.png'], ['fx_circle', 'assets/fx/Circle/SpriteSheetOrange.png'], ['fx_aura', 'assets/fx/Aura/SpriteSheetWhite.png'],
    ['p_arrow', 'assets/fx/p_Arrow.png'], ['pt_Leaf', 'assets/fx/pt_Leaf.png'], ['pt_LeafPink', 'assets/fx/pt_LeafPink.png'], ['pt_Snow', 'assets/fx/pt_Snow.png'], ['pt_Rain', 'assets/fx/pt_Rain.png'], ['fog', 'assets/fx/fog.png'], ['p_fire', 'assets/fx/p_Fireball.png'], ['p_shuriken', 'assets/fx/p_Shuriken.png'],
    ['chest', 'assets/items/LittleTreasureChest.png'], ['deco_fountain', 'assets/tiles/mf_fountain.png'], ['deco_basin', 'assets/tiles/mf_basin.png'], ['deco_statue', 'assets/tiles/mf_statue.png'], ['deco_castle', 'assets/tiles/mf_castle.png'], ['coin', 'assets/items/GoldCoin.png'],
  ];
  for (const k of ['Chicken', 'Dog', 'Cat', 'Cow']) list.push(['an_' + k, `assets/monsters/animal_${k}.png`]);
  const chars = new Set(['Child', 'OldMan2', 'Inspector', 'OldMan']); for (const j of Object.values(JOBS)) j.sprites.forEach(c => chars.add(c));
  for (const m of Object.values(MONSTERS)) if (m.human) chars.add(m.spr);          // outlaws use character sheets
  for (const c of chars) { list.push(['c_' + c, `assets/chars/${c}.png`], ['f_' + c, `assets/chars/${c}.face.png`]); }
  for (const m of Object.values(MONSTERS)) if (!m.human) list.push(['m_' + m.spr, `assets/monsters/${m.spr}.png`], ['mf_' + m.spr, `assets/monsters/${m.spr}.face.png`]);
  for (const [id, b] of Object.entries(BOSSES)) list.push(['b_' + id, `assets/bosses/${b.dir}/${b.idle}`], ['bf_' + id, `assets/bosses/${b.dir}/Faceset.png`]);
  for (const e of new Set(Object.values(EMOTE))) list.push(['e' + e, `assets/ui/emote/emote${e}.png`]);
  const icons = new Set([...Object.values(ITEMS).map(i => i.icon), ...Object.values(MATS).map(m => m.icon)]);
  for (const o of [...HAPPENINGS, ...CHARTERS]) if (o.icon.startsWith('i_')) icons.add(o.icon.slice(2));   // top-bar chips, charter cards
  for (const ic of icons) list.push(['i_' + ic, `assets/items/${ic}.png`]);
  const hands = new Set([...Object.values(ITEMS).filter(i => i.hand).map(i => i.hand), ...Object.values(JOBS).map(j => j.weapon), ...Object.values(MONSTERS).filter(m => m.human).map(m => m.weapon)]);
  for (const h of hands) list.push(['h_' + h, h.startsWith('Bow') ? `assets/items/w_${h}.png` : `assets/items/h_${h}.png`]);
  return list;
}

// Prefer the packed atlas (a handful of big PNGs, built by tools/pack_atlas.py); fall back to single files.
async function loadAtlas(list, onProgress) {
  let meta; try { const r = await fetch('assets/atlas/atlas.json'); if (!r.ok) return false; meta = await r.json(); } catch { return false; }
  const sheets = await Promise.all(meta.sheets.map(src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'assets/atlas/' + src; })));
  if (sheets.some(s => !s)) return false;
  let done = 0; const missing = [];
  for (const [k, s] of list) {
    const r = meta.frames[s]; if (!r) { missing.push([k, s]); continue; }
    const c = document.createElement('canvas'); c.width = r[3]; c.height = r[4];
    c.getContext('2d').drawImage(sheets[r[0]], r[1], r[2], r[3], r[4], 0, 0, r[3], r[4]);
    IMG[k] = c; if (k.startsWith('c_')) computeHands(k, c);
    onProgress && onProgress(++done / list.length);
  }
  await Promise.all(missing.map(([k, s]) => load(k, s)));
  return true;
}

export async function loadAll(onProgress) {
  const list = assetList();
  if (await loadAtlas(list, onProgress)) return;
  let done = 0;
  await Promise.all(list.map(([k, s]) => load(k, s).then(() => onProgress && onProgress(++done / list.length))));
}

// Small canvas helper used by the DOM UI to show sprites as <canvas> icons.
// Hue-rotated copies of a sprite (higher-tier gear recolours). Cached per key+degrees.
const TINTS = {};
export function tinted(key, deg) {
  if (!deg) return IMG[key];
  const id = key + '@' + deg; if (TINTS[id]) return TINTS[id];
  const im = IMG[key]; if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  try {
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data, rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    // standard hue-rotation matrix; leaves near-grey pixels (outline, steel) mostly untouched
    const m = [0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
               0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
               0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072];
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue; const r = p[i], gg = p[i + 1], b = p[i + 2];
      p[i] = Math.max(0, Math.min(255, m[0] * r + m[1] * gg + m[2] * b));
      p[i + 1] = Math.max(0, Math.min(255, m[3] * r + m[4] * gg + m[5] * b));
      p[i + 2] = Math.max(0, Math.min(255, m[6] * r + m[7] * gg + m[8] * b));
    }
    g.putImageData(d, 0, 0);
  } catch { return im; }
  return (TINTS[id] = c);
}
// Solid-gold copy of a sprite (the Golden Slime): luminance mapped onto a gold ramp, dark outline kept. Cached.
export function goldified(key) {
  const id = key + '@gold'; if (TINTS[id]) return TINTS[id];
  const im = IMG[key]; if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  try {
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    const ramp = [[92, 52, 12], [178, 112, 18], [236, 172, 36], [255, 214, 72], [255, 244, 170]];
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue; const L = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
      if (L < 40) continue;                                   // keep the outline
      const [r, gg, b] = ramp[Math.min(4, Math.floor(L / 52))]; p[i] = r; p[i + 1] = gg; p[i + 2] = b;
    }
    g.putImageData(d, 0, 0);
  } catch { return im; }
  return (TINTS[id] = c);
}
// Square crop of any loaded image as a small <canvas> (chips, charter cards). Particle strips use their first frame.
export function keyIcon(key, px = 16) {
  const im = IMG[key], sz = im ? Math.min(im.width, im.height, 16) : 16;
  return iconCanvas(key, 0, 0, sz, sz, Math.max(1, Math.round(px / sz)));
}
export function itemIcon(id, scale = 2) {
  const it = ITEMS[id]; if (!it) return null;
  const im = tinted('i_' + it.icon, it.tint); if (!im) return null;
  const c = document.createElement('canvas'); const w = Math.min(im.width, 16), h = Math.min(im.height, 16);
  c.width = w * scale; c.height = h * scale; c.className = 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, w, h, 0, 0, w * scale, h * scale);
  return c;
}
export function iconCanvas(key, sx, sy, sw, sh, scale = 3) {
  const c = document.createElement('canvas'); c.width = sw * scale; c.height = sh * scale; c.className = 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const im = IMG[key]; if (im) g.drawImage(im, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
  return c;
}
export function iconURL(key, sx, sy, sw, sh, scale = 3) { return iconCanvas(key, sx, sy, sw, sh, scale).toDataURL(); }
