import { getFrontiers } from '../js/world.js';
import assert from 'node:assert/strict';
import { DECOR, FRONTIERS, MAP_W, MONSTERS } from '../js/data.js';
import { makeAdventurer, maxHp, migrate, newGame, place, villageBoundary } from '../js/state.js';
import { Sim } from '../js/sim.js';

function bare(seed = 6101) {
  const s = newGame(seed);
  s.props = []; s.buildings = []; s.advs = []; s.mons = []; s.monsters = [];
  s.folk = []; s.animals = []; s.npcs = []; s.gold = 100_000; s.tp = 1_000;
  return { s, sim: new Sim(s, {}) };
}

function adventurer(s, sim, x, y) {
  const a = makeAdventurer(s, sim.R, 'warrior');
  a.resident = true; a.x = x; a.y = y; a.hp = maxHp(a, s); a.task = null; a.path = null;
  s.advs.push(a); return a;
}

function groups(cells) {
  const left = new Map(cells.map(c => [`${c.x},${c.y}`, c])), out = [];
  while (left.size) {
    const todo = [left.values().next().value], group = []; left.delete(`${todo[0].x},${todo[0].y}`);
    while (todo.length) {
      const c = todo.pop(); group.push(c);
      for (const [x, y] of [[c.x - 1, c.y], [c.x + 1, c.y], [c.x, c.y - 1], [c.x, c.y + 1]]) {
        const k = `${x},${y}`, n = left.get(k); if (n) { left.delete(k); todo.push(n); }
      }
    }
    out.push(group);
  }
  return out;
}

function drive(s, fn, limit = 2400) {
  for (let i = 0; i < limit; i++) { s.tick++; if (fn()) return i + 1; }
  return null;
}

function key(x, y) { return `${Math.round(x)},${Math.round(y)}`; }

assert.equal(DECOR.palisade?.barrier, true);
assert.deepEqual(DECOR.palisade.fp, [1, 1]);

// Eight three-tile openings sit in a complete one-tile perimeter outside the home rectangle.
{
  const s = newGame(1), b = villageBoundary(s), gateGroups = groups(b.gates);
  assert.equal(gateGroups.length, 8);
  assert(gateGroups.every(g => g.length === 3));
  assert.equal(new Set(b.gates.map(c => key(c.x, c.y))).size, 24);
  assert.equal(new Set([...b.walls, ...b.gates].map(c => key(c.x, c.y))).size, 2 * ((s.town.x1 - s.town.x0) + (s.town.y1 - s.town.y0) + 2));
  assert([...b.walls, ...b.gates].every(c => c.x === s.town.x0 - 1 || c.x === s.town.x1 || c.y === s.town.y0 - 1 || c.y === s.town.y1));
  assert(!b.walls.some(c => b.gates.some(g => g.x === c.x && g.y === c.y)));
}

// A normal generated village has working ingress and egress. Movement may route around a
// solid wall section, but it may cross the perimeter only through a gate cell.
{
  const s = newGame(220), sim = new Sim(s, {}), a = s.advs[0], b = villageBoundary(s);
  const gates = new Set(b.gates.map(c => key(c.x, c.y))), walls = new Set(b.walls.map(c => key(c.x, c.y)));
  const crossedIn = new Set();
  assert(drive(s, () => {
    const done = sim.walkTo(a, 38, 30), k = key(a.x, a.y);
    assert(!walls.has(k), `adventurer crossed wall at ${k}`);
    if (Math.round(a.y) === s.town.y1) crossedIn.add(k);
    return done;
  }));
  assert([...crossedIn].some(k => gates.has(k)), 'ingress did not use a gate');
  const crossedOut = new Set();
  assert(drive(s, () => {
    const done = sim.walkTo(a, 38, 50), k = key(a.x, a.y);
    assert(!walls.has(k), `adventurer crossed wall at ${k}`);
    if (Math.round(a.y) === s.town.y1) crossedOut.add(k);
    return done;
  }));
  assert([...crossedOut].some(k => gates.has(k)), 'egress did not use a gate');
}

// The shared pathing used by adventurers, townsfolk, monsters and pets routes through a gap.
{
  const { s, sim } = bare(), top = groups(sim.gates).find(g => g.every(c => c.y === s.town.y0 - 1));
  const gx = top.map(c => c.x).sort((a, b) => a - b)[1], outside = [gx, s.town.y0 - 4], inside = [gx, s.town.y0 + 3];

  const a = adventurer(s, sim, ...outside);
  assert(drive(s, () => sim.walkTo(a, ...inside)));
  assert(Math.round(a.y) >= s.town.y0);

  const f = { id: s.nextId++, spr: 'Child', x: outside[0], y: outside[1], dir: 1, anim: 0, path: null, task: { dest: inside }, taskT: 0 };
  s.folk.push(f);
  assert(drive(s, () => { sim.folkStep(f); return !f.task; }));
  assert(Math.hypot(f.x - inside[0], f.y - inside[1]) < 0.6);

  const target = adventurer(s, sim, ...inside), m = { id: s.nextId++, x: outside[0], y: outside[1], dir: 0, path: null };
  assert(drive(s, () => sim.stepToward(m, target.x, target.y, 0.15)));
  assert(Math.round(m.y) >= s.town.y0);

  const pet = { id: s.nextId++, type: Object.keys(MONSTERS)[0], name: 'Route Pet', bond: 0, x: outside[0], y: outside[1], tx: outside[0], ty: outside[1], dir: 0, anim: 0, path: null, riding: false };
  target.partner = pet.id; s.monsters.push(pet);
  assert(drive(s, () => { sim.petStep(pet); return Math.hypot(pet.x - target.x, pet.y - target.y) <= 1.2; }));
  assert(Math.round(pet.y) >= s.town.y0);
}

// A sealed actor never falls back to straight-line teleporting. Removing one saved barrier
// invalidates the failed path and opens a real route.
{
  const { s, sim: before } = bare(), a = adventurer(s, before, 38, 28);
  const ring = [[38, 27], [39, 28], [38, 29], [37, 28]].map(([x, y]) => place(s, 'palisade', x, y));
  const sim = new Sim(s, {}), start = [a.x, a.y];
  assert.equal(sim.grid.find(38, 28, 42, 28), null);
  for (let i = 0; i < 600; i++) { s.tick++; assert.equal(sim.walkTo(a, 42, 28), false); }
  assert.deepEqual([a.x, a.y], start);
  assert.equal(sim.demolish(ring[1]), null);
  assert(drive(s, () => sim.walkTo(a, 42, 28)));
  assert(Math.hypot(a.x - 42, a.y - 28) < 0.6);
}

// Every rejected placement is atomic: gate approaches, existing barriers, facility doors,
// actors and a barrier under a proposed door all reject without charging or mutating state.
{
  const { s, sim } = bare(), top = groups(sim.gates).find(g => g.every(c => c.y === s.town.y0 - 1));
  const gx = top.map(c => c.x).sort((a, b) => a - b)[1];
  assert.equal(sim.build('palisade', 28, 22), null);
  place(s, 'house', 32, 20);                         // door = 33,22
  place(s, 'palisade', 45, 24);                      // blocks proposed house door at 45,24
  const actor = adventurer(s, sim, 40, 22); sim.rebuildGrid();
  const reject = (type, x, y, pattern) => {
    const before = { gold: s.gold, spent: s.stats.spentBuild, buildings: s.buildings.length, roads: s.roads };
    const error = sim.build(type, x, y);
    assert.match(error, pattern);
    assert.deepEqual({ gold: s.gold, spent: s.stats.spentBuild, buildings: s.buildings.length, roads: s.roads }, before);
  };
  reject('palisade', gx, s.town.y0, /opening/i);
  reject('palisade', 28, 22, /occupied/i);
  reject('palisade', 33, 22, /entrance/i);
  reject('palisade', Math.round(actor.x), Math.round(actor.y), /standing/i);
  reject('house', 44, 22, /door is blocked/i);
}

// Save/load preserves player walls and clears every serialized route before any actor moves.
{
  const { s, sim } = bare();
  assert.equal(sim.build('palisade', 28, 22), null);
  const a = adventurer(s, sim, 30, 22);
  s.mons.push({ id: s.nextId++, x: 24, y: 15, path: [[1, 1]] });
  s.monsters.push({ id: s.nextId++, x: 30, y: 24, path: [[1, 1]] });
  s.folk.push({ id: s.nextId++, x: 31, y: 24, path: [[1, 1]] });
  s.animals.push({ id: s.nextId++, x: 32, y: 24, path: [[1, 1]] });
  s.npcs.push({ id: s.nextId++, kind: 'merchant', x: 33, y: 24, path: [[1, 1]] });
  a.path = [[1, 1]];
  const loaded = migrate(JSON.parse(JSON.stringify(s))), once = JSON.stringify(loaded);
  migrate(loaded); assert.equal(JSON.stringify(loaded), once);
  const restored = new Sim(loaded, {}), wall = loaded.buildings.find(b => b.type === 'palisade' && b.x === 28 && b.y === 22);
  assert(wall); assert.equal(restored.barriers[22 * MAP_W + 28], 1); assert.equal(restored.grid.walkable(28, 22), false);
  for (const group of ['advs', 'mons', 'monsters', 'folk', 'animals', 'npcs']) assert(loaded[group].every(e => e.path == null), `${group} kept a saved route`);
}

// Expansion moves the generated perimeter and all eight openings without moving buildings.
// Captured frontier land remains reachable from the enlarged home.
{
  const s = newGame(812), sim = new Sim(s, {}), oldTown = { ...s.town }, oldBoundary = new Set(sim.boundary.map(c => key(c.x, c.y)));
  const buildings = s.buildings.map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y }));
  s.tp = 1_000; assert.equal(sim.runEvent('expand'), null);
  assert.deepEqual(s.buildings.map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y })), buildings);
  assert.notDeepEqual(s.town, oldTown); assert.equal(groups(sim.gates).length, 8);
  assert(sim.boundary.every(c => !oldBoundary.has(key(c.x, c.y))));
  sim.captureFrontier(FRONTIERS[0].id);
  const goal = sim.grid.nearestWalkable(getFrontiers(s)[0].x, getFrontiers(s)[0].y);
  assert(goal); assert(sim.grid.find(38, 28, goal[0], goal[1])?.length, 'captured frontier was unreachable after expansion');
}

console.log('palisades: perimeter gates, routed actors, sealed barriers, atomic placement, save/load and expansion passed');
