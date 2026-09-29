import assert from 'node:assert/strict';
import { FRONTIERS, MAP_W, MAP_H, HOME_W, HOME_H, SPR, TOWN0 } from '../js/data.js';
import { buildAreas, buildingAt, cavePos, migrate, newGame, townDist, villageBoundary } from '../js/state.js';
import { generateWorld, getFrontiers, regionAt } from '../js/world.js';
import { Sim } from '../js/sim.js';

const copy = s => JSON.parse(JSON.stringify(s));
const terrain = s => JSON.stringify({ ground: s.ground, roads: s.roads, props: s.props, buildings: s.buildings,
  town: s.town, cave: s.world.cave, sites: getFrontiers(s), regions: s.world.regions, camps: s.banditCamps });
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const layouts = new Set(), geography = new Set(), choices = new Set();
const seeds = [0, 1, 4242, 8831, 0x7fffffff, ...Array.from({ length: 43 }, (_, i) => (i + 1) * 7919)];
for (const seed of seeds) {
  const s = newGame(seed), replay = newGame(seed), sites = getFrontiers(s);
  assert.equal(terrain(s), terrain(replay), `founding replay ${seed}`);
  assert.equal(s.seed, replay.seed);
  assert.equal(s.world.generation, 1);
  assert.deepEqual(sites.map(f => f.id), FRONTIERS.map(f => f.id));
  assert.deepEqual(s.town, TOWN0);
  assert.equal(s.ground.length, MAP_W * MAP_H);
  assert.match(s.ground, /^[0-6]+$/);
  assert(s.props.length < 2400, 'bounded scenery count');
  assert(JSON.stringify(s).length < 500_000, 'bounded saved layout');
  layouts.add(JSON.stringify(sites.map(f => [f.x, f.y, f.land])));
  geography.add(JSON.stringify(s.world.regions));
  choices.add(JSON.stringify(sites.map(f => f.requires)));
  assert.equal(regionAt(s, 38, 28), null, 'safe village is unpainted');
  for (const f of sites) {
    const original = FRONTIERS.find(o => o.id === f.id), { land } = f;
    for (const key of ['boss', 'bossName', 'relic', 'bonus', 'star', 'rec', 'fee', 'zone']) assert.deepEqual(f[key], original[key]);
    assert(land.x0 >= 0 && land.y0 >= 0 && land.x1 <= MAP_W && land.y1 <= MAP_H);
    assert(f.x >= land.x0 + 6 && f.x < land.x1 - 5 && f.y >= land.y0 + 6 && f.y < land.y1 - 5);
    assert(!overlap(land, s.town));
    for (const other of sites) if (f !== other) assert(!overlap(land, other.land), `${seed}: overlap ${f.id}/${other.id}`);
    assert.equal(f.requires.length, original.requires.length);
    for (const id of f.requires) assert(sites.find(o => o.id === id)?.star < f.star, 'progression is acyclic');
    assert(regionAt(s, f.x, f.y), 'den belongs to a region');
  }
  for (const p of s.props) {
    assert(SPR[p.k], `known sprite ${p.k}`);
    assert(p.x >= 0 && p.y >= 0 && p.x + p.w <= MAP_W && p.y < MAP_H);
    for (let dx = 0; dx < p.w; dx++) assert(!buildingAt(s, p.x + dx, p.y), 'scenery overlaps building');
  }
  assert.equal(s.banditCamps.length, 16);
  const sim = new Sim(s, {}), c = cavePos(s);
  assert(!s.mons.some(m => m.boss || m.frontier), 'no guardian before challenge');
  for (const p of [...sites, ...s.banditCamps, { id: 'cave', x: c.x + 1, y: c.y + 1 }, ...villageBoundary(s).gates]) {
    const path = sim.grid.find(38, 28, p.x, p.y);
    assert(path, `${seed}: route to ${p.id || 'gate'} at ${p.x},${p.y}`);
    for (const [x, y] of path) assert(sim.grid.walkable(x, y));
  }
  for (const f of sites) {
    assert(sim.frontierBlock(f.id), 'star zero cannot challenge');
    assert.deepEqual(sim.frontierQuest(f.id).spot, [f.x, f.y], 'quest uses saved den');
  }
  assert(!s.mons.some(m => m.frontier), 'inspection does not spawn guardians');
  const before = terrain(s), current = migrate(copy(s));
  assert.equal(terrain(current), before, 'current load preserves geography');
  assert.deepEqual(migrate(copy(current)), current, 'current migration is idempotent');
  const oldSeed = s.seed;
  generateWorld(s);
  assert.equal(s.seed, oldSeed, 'founding does not consume simulation randomness');
  assert.equal(terrain(s), before, 'generation cannot replace an existing layout');
  const fresh = copy(s), home = state => JSON.stringify({ buildings: state.buildings, roads: state.roads, cave: cavePos(state),
    ground: Array.from({ length: TOWN0.y1 - TOWN0.y0 + 4 }, (_, dy) =>
      state.ground.slice((TOWN0.y0 - 2 + dy) * MAP_W + TOWN0.x0 - 2, (TOWN0.y0 - 2 + dy) * MAP_W + TOWN0.x1 + 2)) });
  const homeBefore = home(fresh);
  const homeEcology = state => {
    const cells = [];
    for (let y = 0; y < HOME_H; y++) for (let x = 0; x < HOME_W; x++) {
      if (sites.some(f => x >= f.land.x0 && x < f.land.x1 && y >= f.land.y0 && y < f.land.y1)) continue;
      cells.push([x, y, state.ground[y * MAP_W + x]]);
      assert.equal(regionAt(state, x, y), null, 'home ecology uses its established terrain');
    }
    return { cells, props: state.props.filter(p => p.x < HOME_W && p.y < HOME_H && !sites.some(f =>
      p.x >= f.land.x0 && p.x < f.land.x1 && p.y >= f.land.y0 && p.y < f.land.y1)) };
  };
  const ecologyBefore = homeEcology(fresh);
  delete fresh.world.frontierSites; delete fresh.world.regions;
  generateWorld(fresh);
  assert.equal(fresh.seed, oldSeed, 'actual terrain generation uses an independent RNG');
  assert.equal(home(fresh), homeBefore, 'founding preserves home ground, roads, buildings and cave');
  assert.deepEqual(homeEcology(fresh), ecologyBefore, 'founding preserves original home hunting terrain outside frontiers');
  s.stars = 5;
  for (const f of sites) {
    assert.equal(sim.frontierBlock(f.id), null, 'progressive slot order remains playable');
    assert(townDist(s, f.x, f.y) > 0);
    sim.captureFrontier(f.id);
    assert(buildAreas(s).some(a => JSON.stringify(a) === JSON.stringify(f.land)));
    assert.equal(townDist(s, f.x, f.y), 0, 'capture grants generated land');
    assert(Object.hasOwn(s.frontier.relics, f.relic), 'identity reward retained');
  }
}
assert.equal(layouts.size, seeds.length, 'different codes produce different land/den layouts');
assert.equal(geography.size, seeds.length, 'region pattern layouts vary');
assert(choices.size >= 4, 'expansion dependencies vary within progression bands');

// A pre-generation village may contain player scenery at any original den. Loading must leave it intact.
{
  const s = newGame(73);
  delete s.world.frontierSites; delete s.world.regions; delete s.world.generation;
  s.props.push({ k: 'rock', x: FRONTIERS[0].x, y: FRONTIERS[0].y, w: 1, block: true });
  const before = { ...JSON.parse(terrain(s)), regions: null };
  const loaded = migrate(copy(s));
  assert.equal(getFrontiers(loaded), FRONTIERS, 'old villages retain the original definitions');
  assert.equal(loaded.world.frontierSites, null);
  assert.equal(loaded.world.regions, null);
  assert.equal(regionAt(loaded, 90, 30), null);
  assert.deepEqual(JSON.parse(terrain(loaded)), before, 'old terrain, roads, buildings, cave and camps unchanged');
  assert.deepEqual(migrate(copy(loaded)), loaded, 'old migration is idempotent');
}
console.log(`worlds: ${seeds.length} deterministic, varied layouts; all den/camp/cave/gate routes; capture and migration passed`);
