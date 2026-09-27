// Game state creation, world generation, save/load. State is plain JSON (no class instances).
import { MAP_W, MAP_H, HOME_W, HOME_H, FRONTIERS, TOWN0, FAC, DECOR, JOBS, NAMES, PERSONA, ITEMS, PERKS, VISITOR_JOBS, TITLES, ZONE_MONS, CHARTERS, ROSTER_SIZE, MONSTERS, HAPPENINGS } from './data.js';
import { makeRng } from './rng.js';
import { CAMP_PATROLS } from './data.js';

export const SCHEMA = 1;
const SAVE_KEYS = ['wayfarerV2_a', 'wayfarerV2_b'];

// Chebyshev distance from the town rectangle (0 inside)
export function townDist(s, x, y) {
  let d = Infinity;
  for (const t of buildAreas(s)) {
    const dx = x < t.x0 ? t.x0 - x : x >= t.x1 ? x - t.x1 + 1 : 0;
    const dy = y < t.y0 ? t.y0 - y : y >= t.y1 ? y - t.y1 + 1 : 0;
    d = Math.min(d, Math.max(dx, dy));
  }
  return d;
}
export function buildAreas(s) { return [s.town, ...FRONTIERS.filter(f => s.frontier?.completed[f.id]).map(f => f.land)]; }
// Two three-tile openings per side. The free perimeter sits outside the buildable home rectangle.
export function villageBoundary(s) {
  const t = s.town, walls = [], gates = [], approaches = [];
  const openings = (lo, hi) => [Math.round(lo + (hi - lo - 1) / 3), Math.round(lo + (hi - lo - 1) * 2 / 3)];
  const xs = openings(t.x0, t.x1), ys = openings(t.y0, t.y1);
  const add = (x, y, vertical, open) => {
    const cell = { x, y, vertical };
    if (open) { gates.push(cell); for (let i = -1; i <= 1; i++) approaches.push([x + (vertical ? i : 0), y + (vertical ? 0 : i)]); }
    else if (!buildingAt(s, x, y) && !s.buildings.some(b => FAC[b.type] && x === b.x + (defOf(b.type).fp[0] >> 1) && y === b.y + defOf(b.type).fp[1])) walls.push(cell);
  };
  for (let x = t.x0 - 1; x <= t.x1; x++) for (const y of [t.y0 - 1, t.y1]) add(x, y, false, xs.some(c => Math.abs(x - c) <= 1));
  for (let y = t.y0; y < t.y1; y++) for (const x of [t.x0 - 1, t.x1]) add(x, y, true, ys.some(c => Math.abs(y - c) <= 1));
  return { walls, gates, approaches };
}
export function frontierBonus(s, key) { let v = 0; for (const f of FRONTIERS) if (s.frontier?.completed[f.id]) v += f.bonus[key] || 0; return v; }
// Zone (0 town, 1 meadow, 2 forest, 3 hills, 4 ashen) from distance to the ORIGINAL town rect, so zones stay put.
export function zoneAt(x, y) {
  const t = TOWN0;
  const dx = x < t.x0 ? t.x0 - x : x >= t.x1 ? x - t.x1 + 1 : 0;
  const dy = y < t.y0 ? t.y0 - y : y >= t.y1 ? y - t.y1 + 1 : 0;
  const south = y >= t.y1;
  const d = Math.max(dx, dy * (south ? 0.55 : 1.3));   // the southern approach stays gentle
  if (d <= 0) return 0; if (d <= 7) return 1; if (d <= 13) return 2; if (d <= 19) return 3; return 4;
}
export const ZONE_BIOME = ['meadow', 'meadow', 'forest', 'hills', 'ashen'];

// World codes: the seed written in base 36 ("K7F2QX"). Same code = same map, monster rosters, cave and charter offers.
export const seedCode = seed => (seed >>> 0).toString(36).toUpperCase();
export function parseSeed(text) { const t = String(text || '').trim(); return /^[0-9a-z]{1,6}$/i.test(t) ? parseInt(t, 36) & 0x7fffffff : null; }

export function newGame(seed = (Date.now() & 0x7fffffff)) {
  const s = {
    schema: SCHEMA, seed, tick: 0, nextId: 1,
    time: { week: 1, month: 4, year: 1, t: 0 },
    gold: 3000, tp: 10, pop: 40, stars: 0,
    mats: { wood: 6, hide: 2, herb: 4, ore: 0, crystal: 0 },
    town: { ...TOWN0 }, mapWidth: HOME_W, mapHeight: HOME_H,
    frontier: { completed: {}, relics: {}, petRewards: {} },
    ground: [], roads: '', props: [],
    buildings: [], advs: [], mons: [], monsters: [], fx: [], folk: [], animals: [],
    unlocked: { woodSword: true, cloth: true, ironCap: true, potion: true },
    quests: [], activeQuests: [], cleared: 0, bossesBeaten: {},
    titles: {}, events: [], log: [],
    stats: { income: 0, lastIncome: 0, kills: 0, monthKills: 0, visitorsTotal: 0, spentBuild: 0 },
    flags: { tutorial: 0, nextCampPatrol: 0, patrolScaling: true, bossRematches: 0, alphaUpgrades: 0, pioneer: null, pioneerPet: null },
    world: null, charter: null, charterChoices: [], happen: [], happenLog: [], npcs: [],
  };
  const R = makeRng(s);
  // Seeded world variety: which species live in each zone, and where the Old Cave opens (north hills).
  const zoneMons = {};
  for (const z of Object.keys(ZONE_MONS)) zoneMons[z] = shuffle(R, ZONE_MONS[z]).slice(0, ROSTER_SIZE[z] || ZONE_MONS[z].length);
  s.world = { code: seed, zoneMons, cave: { x: R.int(24, 49), y: R.int(6, 8) } };   // s.seed is the RNG's running state; world.code keeps the original
  s.charterChoices = shuffle(R, CHARTERS.map(c => c.id)).slice(0, 3);
  // ground detail variant per cell (0 = plain grass, 1..6 = tufts)
  const g = new Array(HOME_W * HOME_H);
  for (let i = 0; i < g.length; i++) g[i] = R.chance(0.12) ? R.int(1, 6) : 0;
  s.ground = g.join('');
  s.roads = '0'.repeat(HOME_W * HOME_H);

  // wild props outside the town: density and species by zone
  const ZP = {
    1: { p: 0.05, k: ['treeGreen', 'treeRound', 'bush', 'bush2', 'flowerSun', 'flowerWhite', 'clover', 'rock'] },
    2: { p: 0.13, k: ['treePine', 'treeRound', 'treeBush', 'treePine', 'bush2', 'stump', 'berryBush'] },
    3: { p: 0.10, k: ['rockBig', 'rock', 'treeYellow', 'stump', 'crystalBush', 'treeDead'] },
    4: { p: 0.09, k: ['treeDead', 'rockBig', 'treeWhite', 'rock', 'crystalBush'] },
  };
  const occ = new Uint8Array(HOME_W * HOME_H);
  const big = k => /^tree|rockBig|berry|crystal|stump/.test(k);
  for (let y = 1; y < HOME_H - 1; y++) for (let x = 1; x < HOME_W - 1; x++) {
    const z = zoneAt(x, y); if (!z) continue;
    if (townDist(s, x, y) <= 1) continue;            // breathing room around town
    if (Math.abs(x - 38) <= 1 && y > 37) continue;    // keep the south approach open
    const zp = ZP[z]; if (!R.chance(zp.p)) continue;
    const k = R.pick(zp.k), w = big(k) ? 2 : 1;
    if (occ[y * HOME_W + x] || (w === 2 && occ[y * HOME_W + x + 1])) continue;
    occ[y * HOME_W + x] = 1; if (w === 2) occ[y * HOME_W + x + 1] = 1;
    s.props.push({ k, x, y, w, block: big(k) || k === 'rock' });
  }
  addCave(s);
  // decorative flowers inside town edges
  for (let i = 0; i < 18; i++) {
    const x = R.int(s.town.x0, s.town.x1 - 1), y = R.int(s.town.y0, s.town.y1 - 1);
    if (x > 30 && x < 46 && y > 21 && y < 35) continue;
    s.props.push({ k: R.pick(['flowerSun', 'flowerRed', 'flowerWhite', 'clover']), x, y, w: 1, block: false, soft: true });
  }

  // starting layout: guild in the middle, inn, onigiri stand, a house, road spine
  const cx = 36, cy = 24;
  place(s, 'guild', cx, cy);
  place(s, 'inn', cx - 7, cy + 5);
  place(s, 'food', cx + 6, cy + 5);
  place(s, 'house', cx - 6, cy - 1);
  for (let y = cy + 2; y < 56; y++) setRoad(s, 38, y, true);                  // main street south to map edge
  for (let x = cx - 8; x <= cx + 10; x++) setRoad(s, x, cy + 8, true);          // cross street
  for (let x = cx - 8; x <= cx + 10; x++) setRoad(s, x, cy + 3, true);
  s.props = s.props.filter(p => !propConflicts(s, p));

  for (let i = 0; i < 3; i++) spawnAdventurer(s, R, { x: 38, y: 50 + i * 2 });
  for (const k of ['Chicken', 'Chicken', 'Dog', 'Cat']) s.animals.push({ k, x: R.int(28, 46), y: R.int(20, 36), tx: 0, ty: 0, t: 0, flip: false });
  log(s, 'Welcome, Chief! Build shops, attract adventurers, and grow your village.', 'good');
  expandWorld(s);
  clearFrontierScenery(s);
  seedBanditCamps(s);
  return s;
}

export function legacyGame(previous, pawnId, petId = null, seed) {
  const source = previous.advs.find(a => a.id === pawnId);
  const extra = petId == null ? null : previous.monsters.find(p => p.id === petId && p.frontier);
  if (!source || (petId != null && !extra)) return null;
  const s = newGame(seed), R = makeRng(s), a = makeAdventurer(s, R);
  const masteries = shuffle(R, Object.keys(JOBS).filter(id => (source.jobLv[id] || 0) >= MASTERY)).slice(0, 5);
  Object.assign(a, { name: source.name, spr: source.spr, persona: [...source.persona], base: { ...source.base },
    lv: 1, gold: 0, resident: true, home: s.buildings.find(b => b.type === 'house').id,
    jobLv: { villager: 1 }, perks: [], energy: 100, hunger: 0, x: 38, y: 28, px: 38, py: 28 });
  for (const id of masteries) { a.jobLv[id] = MASTERY; a.perks.push(JOBS[id].perk); }
  // Keep this pawn's identity without duplicating a new visitor's name.
  for (const visitor of s.advs) if (visitor.name === a.name) visitor.name = uniqueName({ advs: [...s.advs, a] }, R);
  const partner = previous.monsters.find(p => p.id === source.partner);
  for (const old of [partner, extra].filter((p, i, pets) => p && pets.indexOf(p) === i)) {
    const p = { id: s.nextId++, type: old.type, name: old.name, bond: old.bond, alpha: old.alpha === true,
      ...(old.frontier ? { frontier: old.frontier } : {}), x: 37, y: 28, tx: 37, ty: 28, dir: 0, anim: 0, path: null, riding: false };
    s.monsters.push(p);
    if (old === partner) a.partner = p.id;
    if (old === extra) s.flags.pioneerPet = p.id;
  }
  s.advs.push(a); s.flags.pioneer = a.id;
  a.hp = maxHp(a, s);
  log(s, `${a.name} begins a new journey as a level 1 Villager. Kept masteries: ${masteries.map(id => JOBS[id].name).join(', ') || 'none'}.`, 'title');
  return s;
}

function clearFrontierScenery(s) {
  s.props = s.props.filter(p => p.k === 'cave' || !FRONTIERS.some(f => !s.frontier?.completed[f.id]
    && Math.abs(p.x - f.x) <= 7 + p.w && Math.abs(p.y - f.y) <= 7));
}

export function seedBanditCamps(s) {
  const patrolRng = makeRng({ seed: (s.world?.code || 4242) ^ 0x50415452 });
  const rules = CAMP_PATROLS[s.stars];
  if (Array.isArray(s.banditCamps)) {
    const R = makeRng({ seed: (s.world?.code || 4242) ^ 0x434f4f4c });
    for (const c of s.banditCamps) {
      c.clears ??= 0; c.readyAt ??= 0;
      if (c.readyAt > s.tick && c.cooldownWeeks == null) {
        c.cooldownWeeks = R.int(8, 20);
        // Old four-week cooldowns: retain elapsed time (300 fixed steps per week).
        c.readyAt += (c.cooldownWeeks - 4) * 300;
      }
      c.cooldownWeeks ??= 0;
      c.patrolAt ??= Math.max(s.tick, c.readyAt) + patrolRng.int(...rules.weeks) * 300;
    }
    return;
  }
  const R = makeRng({ seed: (s.world?.code || 4242) ^ 0x43414d50 });
  const names = ['Red Banner', 'Broken Spear', 'Crow Watch', 'Dust Fang', 'Iron Talon', 'Black Reed', 'Wolf Moon', 'Ash Viper', 'Storm Blade', 'Ghost Lantern', 'Frost Axe', 'Ember Jackal', 'Scarlet Oath', 'Hollow Crown', 'Night Lotus', 'Last Bastion'];
  const candidates = [];
  for (let y = 6; y < MAP_H - 6; y += 8) for (let x = 6; x < MAP_W - 6; x += 8) {
    const xx = x + R.int(-2, 2), yy = y + R.int(-2, 2);
    if (xx < HOME_W && yy < HOME_H) continue;
    if (FRONTIERS.some(f => Math.hypot(xx - f.x, yy - f.y) < 10)) continue;
    if (s.buildings.some(b => { const [w, h] = defOf(b.type).fp; return xx >= b.x - 5 && xx <= b.x + w + 5 && yy >= b.y - 5 && yy <= b.y + h + 5; })) continue;
    if ([-2, -1, 0, 1, 2].some(dy => [-2, -1, 0, 1, 2].some(dx => roadAt(s, xx + dx, yy + dy)))) continue;
    candidates.push([xx, yy]);
  }
  const choices = shuffle(R, candidates);
  // Prefer unclaimed wilderness; never displace an existing building or road on older saves.
  choices.sort((a, b) => +(townDist(s, a[0], a[1]) === 0) - +(townDist(s, b[0], b[1]) === 0));
  s.banditCamps = [];
  for (const [x, y] of choices) {
    if (s.banditCamps.some(c => Math.hypot(c.x - x, c.y - y) < 9)) continue;
    const i = s.banditCamps.length;
    s.banditCamps.push({ id: 'bandit' + (i + 1), name: names[i] + ' Camp', x, y, tier: 1 + Math.floor(i / 4), clears: 0, readyAt: 0, cooldownWeeks: 0, patrolAt: s.tick + patrolRng.int(...rules.weeks) * 300 });
    if (s.banditCamps.length === 16) break;
  }
  s.props = s.props.filter(p => p.k === 'cave' || !s.banditCamps.some(c => Math.abs(c.x - p.x) <= 4 + p.w && Math.abs(c.y - p.y) <= 4));
}

// Preserve every old coordinate and road. Added terrain uses its own RNG, never the simulation's.
export function expandWorld(s) {
  if (s.mapWidth === MAP_W && s.mapHeight === MAP_H) return;
  const oldW = s.mapWidth || HOME_W, oldH = s.mapHeight || HOME_H;
  const terrain = { seed: (s.world?.code || 4242) ^ 0x46524f4e }, R = makeRng(terrain);
  const ground = [], roads = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const old = x < oldW && y < oldH;
    ground.push(old ? s.ground[y * oldW + x] || '0' : R.chance(0.12) ? String(R.int(1, 6)) : '0');
    roads.push(old ? s.roads[y * oldW + x] || '0' : '0');
    if (!old && x > 1 && y > 1 && x < MAP_W - 2 && y < MAP_H - 2 && R.chance(0.035)) {
      const f = FRONTIERS.find(f => x >= f.land.x0 && x < f.land.x1 && y >= f.land.y0 && y < f.land.y1);
      const k = R.pick(f?.zone === 2 ? ['treePine', 'treeRound', 'bush2'] : f?.zone === 3 ? ['rock', 'treeYellow', 'crystalBush'] : ['treeDead', 'rock', 'bush']);
      s.props.push({ k, x, y, w: 1, block: true });
    }
  }
  s.ground = ground.join(''); s.roads = roads.join(''); s.mapWidth = MAP_W; s.mapHeight = MAP_H;
  // Open narrow trails to each den so procedural scenery cannot seal a challenge away.
  s.props = s.props.filter(p => !FRONTIERS.some(f => {
    const parent = FRONTIERS.find(o => o.id === f.requires[0]), sx = parent ? parent.x : 38, sy = parent ? parent.y : 28;
    return (p.x + p.w > Math.min(sx, f.x) - 1 && p.x < Math.max(sx, f.x) + 2 && Math.abs(p.y - sy) <= 1)
      || (p.x + p.w > f.x - 1 && p.x < f.x + 2 && p.y >= Math.min(sy, f.y) - 1 && p.y <= Math.max(sy, f.y) + 1)
      || (p.x + p.w > f.x - 4 && p.x < f.x + 5 && Math.abs(p.y - f.y) <= 4);
  }));
}

export const CAVE = { x: 36, y: 7 };   // default dungeon entrance (old saves); new villages roll s.world.cave. Door = (x+1, y+1)
export function cavePos(s) { const c = s.world && s.world.cave; return c && Number.isInteger(c.x) && Number.isInteger(c.y) ? c : CAVE; }
export function addCave(s) {
  if (s.props.some(p => p.k === 'cave')) return;
  const c = cavePos(s);
  s.props = s.props.filter(p => !(p.x >= c.x - 2 && p.x <= c.x + 3 && p.y >= c.y - 3 && p.y <= c.y + 2));
  s.props.push({ k: 'cave', x: c.x, y: c.y, w: 3, block: true });
}
export function shuffle(R, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function roadAt(s, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  return s.roads.charCodeAt(y * (s.mapWidth || HOME_W) + x) === 49;
}
export function setRoad(s, x, y, on) {
  const i = y * (s.mapWidth || HOME_W) + x;
  s.roads = s.roads.slice(0, i) + (on ? '1' : '0') + s.roads.slice(i + 1);
}

function propConflicts(s, p) {
  for (let dx = 0; dx < p.w; dx++) {
    if (roadAt(s, p.x + dx, p.y)) return true;
    if (buildingAt(s, p.x + dx, p.y)) return true;
  }
  return false;
}

export function defOf(type) { return FAC[type] || DECOR[type]; }

export function buildingAt(s, x, y) {
  for (const b of s.buildings) {
    const [w, h] = defOf(b.type).fp;
    if (x >= b.x && x < b.x + w && y >= b.y && y < b.y + h) return b;
  }
  return null;
}

// Place without cost/validation (world gen and loading). Returns the building.
export function place(s, type, x, y, R) {
  const d = defOf(type);
  const b = { id: s.nextId++, type, x, y, lv: 1, sales: 0, visits: 0, occ: [] };
  if (d.spr && Array.isArray(d.spr)) b.v = (x * 7 + y * 13) % d.spr.length;
  s.buildings.push(b);
  return b;
}

export function makeAdventurer(s, R, jobId = 'villager') {
  const job = JOBS[jobId];
  const personaKeys = Object.keys(PERSONA);
  const a = {
    id: s.nextId++, name: uniqueName(s, R), job: jobId, spr: R.pick(job.sprites),
    lv: R.int(1, 3), xp: 0, jobLv: { [jobId]: 1 }, jobXp: 0,
    base: { hp: JOBS.villager.hp + R.int(-3, 3), atk: JOBS.villager.atk + R.int(-1, 1), def: JOBS.villager.def + R.int(-1, 1), mag: JOBS.villager.mag + R.int(0, 1) },
    hp: 1, gold: R.int(60, 160), sat: R.int(15, 35), work: 100,
    hunger: R.int(20, 50), energy: R.int(60, 90), fun: R.int(30, 60),
    persona: [R.pick(personaKeys)], resident: false, home: null, partner: null,
    eq: { weapon: null, armor: null, offhand: null, acc: null, blessing: null }, perks: [], potions: 1, reviveCharge: false,
    x: 0, y: 0, px: 0, py: 0, dir: 0, path: null, task: null, taskT: 0, cool: 0, stay: R.int(3, 6) * 7, days: 0,
    ko: false, rescueBy: null, rescueRetry: 0, emote: null, emoteT: 0, anim: 0, atkT: 0, bark: null, barkT: 0, kills: 0,
  };
  if (R.chance(0.35)) { const p = R.pick(personaKeys); if (!a.persona.includes(p)) a.persona.push(p); }
  a.hp = maxHp(a);
  return a;
}

function uniqueName(s, R) {
  const used = new Set(s.advs.map(a => a.name));
  const free = NAMES.filter(n => !used.has(n));
  return free.length ? R.pick(free) : R.pick(NAMES) + ' ' + 'IVX'[R.int(0, 2)];
}

// Give an adventurer a job as if they had earned it: prerequisite jobs mastered (with their perks), sprite updated.
export function teachJob(a, jobId, R) {
  a.job = jobId; a.jobLv[jobId] = a.jobLv[jobId] || 1;
  if (R && !JOBS[jobId].sprites.includes(a.spr)) a.spr = R.pick(JOBS[jobId].sprites);
  const teach = j => { for (const r of JOBS[j].req || []) { teach(r); a.jobLv[r] = Math.max(a.jobLv[r] || 0, MASTERY); if (!a.perks.includes(JOBS[r].perk)) a.perks.push(JOBS[r].perk); } };
  teach(jobId);
  if (JOBS[jobId].tier >= 2 && (a.jobLv.villager || 0) < MASTERY) { a.jobLv.villager = MASTERY; if (!a.perks.includes('allround')) a.perks.push('allround'); }
}

export function spawnAdventurer(s, R, at) {
  const pool = VISITOR_JOBS[Math.min(VISITOR_JOBS.length - 1, Math.floor(s.stars / 1.5))];
  const a = makeAdventurer(s, R, R.pick(pool));
  teachJob(a, a.job, R);
  a.x = a.px = at.x; a.y = a.py = at.y;
  s.advs.push(a); s.stats.visitorsTotal++;
  return a;
}

const GROW = { hp: 4, atk: 1, def: 0.8, mag: 0.9 };
const PCT = { hp: 'hpPct', atk: 'atkPct', def: 'defPct', mag: 'magPct' };
export const LV_CAP = 99, JOB_CAP = 99, MASTERY = 10;
// Sum of a bonus key over the town titles earned so far (TITLES[].bonus). Sim uses the same data via Sim.bonus().
export function titleBonus(s, key) { let v = 0; for (const t of TITLES) if (s.titles && s.titles[t.id] && t.bonus[key]) v += t.bonus[key]; return v; }
export function perkSum(a, key) { let v = 0; for (const p of a.perks || []) { const P = PERKS[p]; if (P && P[key]) v += P[key]; } return v; }
export function gearSum(a, key) { let v = 0; for (const slot of ['weapon', 'armor', 'offhand', 'acc', 'blessing']) { const it = a.eq[slot] && ITEMS[a.eq[slot]]; if (it && it[key]) v += it[key]; } return v; }
export function bondedPetBonus(a, k, s) {
  if (!a.partner || !s) return 0;
  const m = s.monsters.find(m => m.id === a.partner);
  if (!m) return 0;
  const base = (m.bond / 20) * (({ hp: 4, atk: 1, def: 1, mag: 1 }[k]) || 0) * (1 + perkSum(a, 'bondPct') * 0.5);
  return base * (m.alpha ? 1.5 : 1);
}
export function stat(a, k, s) {
  const job = JOBS[a.job], v0 = JOBS.villager;
  let v = a.base[k] + (job[k] - v0[k]) + (a.lv - 1) * GROW[k] * (1 + job[k] / 25);
  v += gearSum(a, k);
  // permanent growth from every job level ever earned (DV2: training many jobs makes you stronger)
  const jl = Object.values(a.jobLv).reduce((n, l) => n + l, 0);
  v *= 1 + Math.min(0.6, jl * 0.004) + perkSum(a, 'allPct') + perkSum(a, PCT[k]);
  v *= 1 + (a.work - 100) / 400;
  v += bondedPetBonus(a, k, s);
  if (s) v *= 1 + titleBonus(s, k) + frontierBonus(s, k);
  return Math.max(1, Math.round(v));
}
export const maxHp = (a, s) => stat(a, 'hp', s);

export function log(s, text, kind = '') {
  s.log.unshift({ text, kind, t: `Y${s.time.year} M${s.time.month} W${s.time.week}` });
  if (s.log.length > 60) s.log.length = 60;
}

// ---------- save / load: two rotating slots so a torn write never loses everything ----------
export function save(s) {
  const data = JSON.stringify({ ...s, fx: [] });
  const slot = (s.tick >> 4) & 1;
  try { localStorage.setItem(SAVE_KEYS[slot], data); localStorage.setItem('wayfarerV2_last', String(slot)); return true; }
  catch (e) { console.warn('save failed', e); return false; }
}
export function load() {
  let last = 0; try { last = +localStorage.getItem('wayfarerV2_last') || 0; } catch { return null; }
  for (const k of [SAVE_KEYS[last], SAVE_KEYS[1 - last]]) {
    try { const raw = localStorage.getItem(k); if (!raw) continue; const s = JSON.parse(raw); if (valid(s)) return migrate(s); }
    catch (e) { console.warn('bad save slot', k, e); }
  }
  return null;
}
export function wipeSave() { try { SAVE_KEYS.forEach(k => localStorage.removeItem(k)); localStorage.removeItem('wayfarerV2_last'); } catch {} }
export function valid(s) { return s && typeof s === 'object' && s.schema && Array.isArray(s.buildings) && Array.isArray(s.advs) && typeof s.roads === 'string'; }
const ITEM_RENAME = { wand: 'oakWand', bow: 'shortBow', axe: 'battleAxe', book: 'sutra', bigSword: 'greatSword', scroll: null };
const JOB_RENAME = { princess: 'royal' };
export function migrate(s) {
  s.flags ??= {}; s.flags.nextCampPatrol ??= 0; s.flags.bossRematches ??= 0;
  s.flags.pioneer ??= null; s.flags.pioneerPet ??= null;
  s.fx = []; s.folk = s.folk || []; s.animals = s.animals || [];
  for (const m of s.monsters || []) m.alpha = m.alpha === true;
  s.flags.alphaUpgrades ??= (s.monsters || []).filter(m => m.alpha).length;
  if (!Array.isArray(s.activeQuests)) s.activeQuests = [];
  if (s.quest && !s.activeQuests.some(q => q.id === s.quest.id)) s.activeQuests.push(s.quest);
  delete s.quest;
  s.world = s.world && typeof s.world === 'object' ? s.world : { code: null, zoneMons: null, cave: { ...CAVE } };   // old saves: full rosters, original cave spot
  if (s.world.code === undefined) s.world.code = null;                // unknown for saves made before world codes
  if (!(s.world.cave && Number.isInteger(s.world.cave.x) && Number.isInteger(s.world.cave.y))) s.world.cave = { ...CAVE };
  s.frontier = s.frontier || { completed: {}, relics: {} };
  s.frontier.completed = s.frontier.completed || {}; s.frontier.relics = s.frontier.relics || {};
  s.frontier.petRewards ??= {};
  expandWorld(s);
  clearFrontierScenery(s);
  seedBanditCamps(s);
  if (!s.flags.patrolScaling) {
    const rules = CAMP_PATROLS[s.stars], R = makeRng({ seed: (s.world?.code || 4242) ^ 0x50415453 });
    s.flags.nextCampPatrol = s.tick + R.int(...rules.weeks) * 300;
    for (const c of s.banditCamps) c.patrolAt = Math.max(c.readyAt, s.tick) + R.int(...rules.weeks) * 300;
    for (const m of s.mons || []) if (m.raid === 'patrol' && m.lv > rules.level[1]) {
      const ratio = m.hp / Math.max(1, m.mhp), lv = rules.level[1], tier = lv >= 20 ? 3 : lv >= 8 ? 2 : 1;
      const job = JOBS[m.job]?.tier <= tier ? m.job : 'warrior', J = JOBS[job], k = 0.95 + (lv - 1) * 0.14;
      Object.assign(m, { lv, job, spr: J.sprites[0], weapon: J.weapon, className: J.name, range: J.range, healer: !!J.heal,
        moveSpeed: J.spd, mag: Math.round(J.mag * k), atk: Math.round(J.atk * k), def: Math.round(J.def * k), mhp: Math.round(J.hp * k * 1.25) });
      m.hp = ratio > 0 ? Math.max(1, Math.round(m.mhp * Math.min(1, ratio))) : 0;
    }
    s.flags.patrolScaling = true;
  }
  if (s.world.zoneMons) for (const z of Object.keys(s.world.zoneMons)) {  // drop unknown species; an empty roster falls back to ZONE_MONS
    const l = (Array.isArray(s.world.zoneMons[z]) ? s.world.zoneMons[z] : []).filter(id => MONSTERS[id]);
    if (l.length) s.world.zoneMons[z] = l; else delete s.world.zoneMons[z];
  }
  // replayability fields: defaults for old saves, and drop malformed entries from hand-edited/imported saves
  const arr = v => (Array.isArray(v) ? v : []), obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const cIds = CHARTERS.map(c => c.id), hIds = HAPPENINGS.map(h => h.id);
  s.charter = cIds.includes(s.charter) ? s.charter : null;
  s.charterChoices = arr(s.charterChoices).filter(id => cIds.includes(id));
  s.happen = arr(s.happen).filter(h => h && hIds.includes(h.id)).map(h => ({ id: h.id, weeks: Number.isFinite(h.weeks) ? h.weeks : 1, data: obj(h.data) }));
  for (const h of s.happen) { if ('offer' in h.data) h.data.offer = arr(h.data.offer).filter(o => o && ITEMS[o.id] && Number.isFinite(o.price)); if ('mobs' in h.data) h.data.mobs = arr(h.data.mobs); }
  s.happenLog = arr(s.happenLog).filter(l => l && hIds.includes(l.id));
  s.npcs = arr(s.npcs).filter(n => n && (n.kind === 'merchant' || n.kind === 'bard') && Number.isFinite(n.x) && Number.isFinite(n.y));
  addCave(s);
  const ren = id => (id in ITEM_RENAME ? ITEM_RENAME[id] : id);
  const unl = {}; for (const id in s.unlocked) { const n = ren(id); if (n && ITEMS[n]) unl[n] = true; } s.unlocked = unl;
  s.unlocked.ironCap = true;
  for (const a of s.advs) {
    a.rescueBy ??= null; a.rescueRetry ??= 0;
    a.reviveCharge = a.reviveCharge === true;
    a.perks = a.perks || []; a.eq = a.eq || {}; a.eq.acc = a.eq.acc || null;
    a.eq.blessing ??= null;
    // Older saves used the body slot for helmets and shields. Move the exact owned item once.
    if (a.eq.offhand === undefined) {
      a.eq.offhand = ITEMS[a.eq.armor]?.slot === 'offhand' ? a.eq.armor : null;
      if (a.eq.offhand) a.eq.armor = null;
    }
    for (const k of ['weapon', 'armor']) { const n = a.eq[k] && ren(a.eq[k]); a.eq[k] = n && ITEMS[n] ? n : null; }
    if (JOB_RENAME[a.job]) a.job = JOB_RENAME[a.job];
    for (const j in a.jobLv) { if (JOB_RENAME[j]) { a.jobLv[JOB_RENAME[j]] = a.jobLv[j]; delete a.jobLv[j]; } }
    if (!JOBS[a.job]) a.job = 'villager';
    for (const j in a.jobLv) if (a.jobLv[j] >= MASTERY && JOBS[j] && !a.perks.includes(JOBS[j].perk)) a.perks.push(JOBS[j].perk);
  }
  for (const a of s.advs) {
    if (a.rescueBy != null && !s.advs.some(r => r.id === a.rescueBy && !r.ko && r.task?.type === 'rescue' && r.task.target === a.id)) a.rescueBy = null;
    if (a.task?.type === 'rescue' && !s.advs.some(f => f.id === a.task.target && f.ko && f.rescueBy === a.id)) { a.task = null; a.path = null; }
  }
  // The reward ledger is authoritative: one relic per completed site, one equipped copy at most.
  for (const f of FRONTIERS) {
    delete s.unlocked[f.relic];
    const owner = s.frontier.completed[f.id] && s.advs.find(a => a.id === s.frontier.relics[f.relic] && a.resident);
    if (s.frontier.completed[f.id]) s.frontier.relics[f.relic] = owner ? owner.id : null;
    else delete s.frontier.relics[f.relic];
    for (const a of s.advs) {
      if (a.eq.acc === f.relic) {
        if (a === owner && !a.eq.blessing) a.eq.blessing = f.relic;
        a.eq.acc = null;
      }
      if (a.eq.blessing === f.relic && a !== owner) a.eq.blessing = null;
    }
    if (owner && owner.eq.blessing !== f.relic) s.frontier.relics[f.relic] = null;
  }
  return s;
}
