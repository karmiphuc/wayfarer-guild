// Founding-only geography. Saved layouts are authoritative; old villages keep the original map.
import { MAP_W, MAP_H, HOME_W, HOME_H, FRONTIERS, TOWN0 } from './data.js';
import { makeRng } from './rng.js';

export function getFrontiers(s) { return s.world?.frontierSites || FRONTIERS; }
export function regionAt(s, x, y) {
  // Retain established home hunting terrain; new barriers belong to frontier territories and the wider world.
  if (x < HOME_W && y < HOME_H && !getFrontiers(s).some(f => x >= f.land.x0 && x < f.land.x1 && y >= f.land.y0 && y < f.land.y1)) return null;
  if (x >= TOWN0.x0 - 2 && x <= TOWN0.x1 + 1 && y >= TOWN0.y0 - 2 && y <= TOWN0.y1 + 1) return null;
  return s.world?.regions?.find(r => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) || null;
}

export function generateWorld(s) {
  if (s.world.frontierSites) return;
  const R = makeRng({ seed: s.world.code ^ 0x574f524c });
  const east = R.int(73, 79), far = R.int(107, 113), south = R.int(56, 60), low = R.int(79, 85), cross = R.int(52, 55);
  const lands = [
    [50, 18, east, 38], [26, 38, 50, south], [east, 12, far, cross], [26, south, east, low],
    [far, 12, 148, cross], [east, cross, far, low], [26, low, far, 108], [far, cross, 148, 108],
  ];
  const occupants = FRONTIERS.map(f => f.id);
  for (const [a, b] of [[0, 1], [2, 3], [4, 5]]) if (R.chance(0.5)) [occupants[a], occupants[b]] = [occupants[b], occupants[a]];
  const slots = FRONTIERS.map((f, i) => {
    const [x0, y0, x1, y1] = lands[i];
    return { id: occupants[i], land: { x0, y0, x1, y1 }, x: R.int(x0 + 7, x1 - 7), y: R.int(y0 + 7, y1 - 7),
      requires: f.requires.map(id => occupants[FRONTIERS.findIndex(p => p.id === id)]) };
  });
  // Keep identity order stable for reward rolls; only the slot and its prerequisites move.
  s.world.frontierSites = FRONTIERS.map(f => ({ ...f, bonus: { ...f.bonus }, ...slots.find(p => p.id === f.id) }));
  s.world.generation = 1;
  const biome = ['meadow', 'meadow', 'forest', 'hills', 'ashen'];
  const patterns = ['forest', 'clearing', 'pass', 'ruins'];
  s.world.regions = getFrontiers(s).map(f => ({ ...f.land, biome: f.id === 'frostveil' ? 'snow' : biome[f.zone], pattern: R.pick(patterns) }));
  for (let y = 0; y < MAP_H; y += 24) for (let x = 0; x < MAP_W; x += 26) {
    const pattern = R.pick(patterns);
    s.world.regions.push({ x0: x, y0: y, x1: Math.min(MAP_W, x + 26), y1: Math.min(MAP_H, y + 24),
      biome: pattern === 'forest' ? 'forest' : pattern === 'clearing' ? 'meadow' : R.pick(['hills', 'ashen']), pattern });
  }
  // Protect the starting village, facilities, roads and cave; replace wilderness as complete region patterns.
  const protectedCell = (x, y) => !regionAt(s, x, y) || s.roads[y * MAP_W + x] === '1'
    || (Math.abs(x - s.world.cave.x - 1) <= 3 && Math.abs(y - s.world.cave.y) <= 3);
  s.props = s.props.filter(p => p.k === 'cave' || !regionAt(s, p.x, p.y));
  const ground = s.ground.split('');
  const trees = { meadow: 'treeGreen', forest: 'treePine', hills: 'treeYellow', ashen: 'treeDead', snow: 'treeWhite' };
  for (const r of s.world.regions) {
    // A clearing and two interrupted ridges give each patch a readable shape, not uniform scatter.
    const cx = R.int(r.x0 + 5, r.x1 - 5), cy = R.int(r.y0 + 5, r.y1 - 5), gap = R.int(r.x0 + 3, r.x1 - 4);
    for (let y = Math.max(2, r.y0); y < Math.min(MAP_H - 2, r.y1); y++) for (let x = Math.max(2, r.x0); x < Math.min(MAP_W - 2, r.x1); x++) {
      if (regionAt(s, x, y) !== r || protectedCell(x, y)) continue;
      const d = Math.hypot((x - cx) / 1.4, y - cy), ridge = (y === r.y0 + 5 || y === r.y1 - 6) && Math.abs(x - gap) > 2;
      const ruin = Math.abs(x - cx) <= 5 && Math.abs(y - cy) <= 4
        && (Math.abs(x - cx) === 5 || Math.abs(y - cy) === 4) && !(Math.abs(x - cx) <= 1 || Math.abs(y - cy) <= 1);
      let k = null;
      if (r.pattern === 'forest' && d > 5 && R.chance(0.20)) k = trees[r.biome];
      else if (r.pattern === 'pass' && ridge) k = 'rock';
      else if (r.pattern === 'ruins' && ruin) k = R.chance(0.6) ? 'rock' : 'stump';
      else if (R.chance(r.pattern === 'clearing' ? 0.015 : 0.025)) k = R.pick([trees[r.biome], 'rock', 'bush2']);
      ground[y * MAP_W + x] = R.chance(r.pattern === 'clearing' ? 0.2 : 0.08) ? String(R.int(1, 6)) : '0';
      if (k) s.props.push({ k, x, y, w: 1, block: true });
    }
  }
  s.ground = ground.join('');
}

// Carve once, after camp locations are fixed. Never called by migration or on a played village.
export function finishWorldPaths(s) {
  if (!s.world.frontierSites) return;
  const R = makeRng({ seed: s.world.code ^ 0x50415448 }), open = new Uint8Array(MAP_W * MAP_H);
  const mark = (x, y) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) open[y * MAP_W + x] = 1; };
  const line = (ax, ay, bx, by) => {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(ax + (bx - ax) * (n ? i / n : 0)), y = Math.round(ay + (by - ay) * (n ? i / n : 0));
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(x + dx, y + dy);
    }
  };
  const t = s.town, left = t.x0 - 2, right = t.x1 + 1, top = t.y0 - 2, bottom = t.y1 + 1;
  line(left, top, right, top); line(left, bottom, right, bottom);
  line(left, top, left, bottom); line(right, top, right, bottom);
  const cave = s.world.cave;
  for (const p of [...getFrontiers(s), ...(s.banditCamps || []), { x: cave.x + 1, y: cave.y + 1 }]) {
    const ax = p.x < left ? left : p.x > right ? right : p.x, ay = p.y < top ? top : p.y > bottom ? bottom : p.y;
    if (R.chance(0.5)) { line(ax, ay, p.x, ay); line(p.x, ay, p.x, p.y); }
    else { line(ax, ay, ax, p.y); line(ax, p.y, p.x, p.y); }
  }
  s.props = s.props.filter(p => p.k === 'cave' || !Array.from({ length: p.w }, (_, dx) => open[p.y * MAP_W + p.x + dx]).some(Boolean));
}
