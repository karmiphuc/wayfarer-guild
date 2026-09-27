import assert from 'node:assert/strict';
import { FRONTIERS, HOME_H, HOME_W, MAP_H, MAP_W, BOSSES, ITEMS } from '../js/data.js';
import { buildAreas, frontierBonus, makeAdventurer, maxHp, migrate, newGame, roadAt, townDist } from '../js/state.js';
import { Sim, DT, WEEK_SECONDS } from '../js/sim.js';

const SOAK = process.argv.includes('--soak');

function setup(seed = 8831) {
  const s = newGame(seed), sim = new Sim(s, {});
  s.stars = 5; s.gold = 10_000_000; s.advs = [];
  for (let i = 0; i < 8; i++) {
    const a = makeAdventurer(s, sim.R, 'warrior');
    a.lv = 60; a.resident = true; a.x = 38; a.y = 36; a.hp = maxHp(a, s);
    s.advs.push(a);
  }
  return { s, sim, party: s.advs.slice(0, 4).map(a => a.id) };
}

function settleDead(sim, frontierId) {
  for (let i = 0; i < 40 && sim.s.mons.some(m => m.frontier === frontierId); i++) sim.step();
  assert(!sim.s.mons.some(m => m.frontier === frontierId), `retained boss actor for ${frontierId}`);
}

function failChallenge(s, sim, f, party) {
  const qid = `frontier:${f.id}`;
  assert.equal(sim.startQuest(qid, party), null);
  const active = s.activeQuests.find(q => q.frontier === f.id);
  assert(active);
  s.advs.filter(a => party.includes(a.id)).forEach(a => { a.ko = true; a.hp = 0; });
  sim.checkQuest(active);
  assert(!s.activeQuests.some(q => q.frontier === f.id));
  assert(!s.frontier.completed[f.id]);
  settleDead(sim, f.id);
  s.advs.filter(a => party.includes(a.id)).forEach(a => { a.ko = false; a.hp = maxHp(a, s); a.task = null; });
}

function timeoutChallenge(s, sim, f, party) {
  assert.equal(sim.startQuest(`frontier:${f.id}`, party), null);
  const active = s.activeQuests.find(q => q.frontier === f.id);
  active.t = WEEK_SECONDS * 20 + 1;
  sim.checkQuest(active);
  assert(!s.activeQuests.some(q => q.frontier === f.id));
  assert(!s.frontier.completed[f.id]);
  settleDead(sim, f.id);
}

// Frontier definitions stay dormant until challenged, enforce progression, retry cleanly,
// capture land once, and award exactly one ledger-backed relic each.
{
  const { s, sim, party } = setup();
  assert.equal(FRONTIERS.length, 8);
  assert(!s.mons.some(m => m.frontier));
  assert(sim.frontierBlock('ironvale'));
  assert.equal(sim.frontierQuest('missing'), null);

  const first = FRONTIERS[0];
  const firstBuild = [first.land.x0 + 2, first.land.y0 + 2];
  assert(sim.build('road', ...firstBuild), 'uncaptured frontier tile was buildable');
  assert(!roadAt(s, ...firstBuild));
  const firstQuest = sim.frontierQuest(first.id);
  const firstBossCount = s.mons.length;
  assert.deepEqual(sim.autoQuestParty(firstQuest.id).length, 4);
  assert.equal(s.mons.length, firstBossCount, 'inspecting or selecting a party spawned a boss');
  failChallenge(s, sim, first, party);

  // A frontier boss does not consume or suppress the ordinary one-time boss ladder entry.
  const rec = BOSSES[first.boss].rec;
  for (const [id, boss] of Object.entries(BOSSES)) if (boss.rec < rec) s.bossesBeaten[id] = true;
  assert.equal(sim.startQuest(firstQuest.id, party), null);
  sim.refreshQuests();
  assert(s.quests.some(q => !q.frontier && q.boss === first.boss));
  const failed = s.activeQuests.find(q => q.frontier === first.id);
  s.advs.filter(a => failed.members.includes(a.id)).forEach(a => { a.ko = true; a.hp = 0; });
  sim.checkQuest(failed); settleDead(sim, first.id);
  s.advs.forEach(a => { a.ko = false; a.hp = maxHp(a, s); a.task = null; });
  timeoutChallenge(s, sim, first, party);

  for (const f of FRONTIERS) {
    const qid = `frontier:${f.id}`;
    assert.equal(sim.frontierBlock(f.id), null, `unexpected block for ${f.id}`);
    assert(townDist(s, f.x, f.y) > 0, `${f.id} was buildable before capture`);
    const before = { gold: s.gold, tp: s.tp, pop: s.pop, cleared: s.cleared };
    assert.equal(sim.startQuest(qid, party), null);
    const q = s.activeQuests.find(q => q.frontier === f.id);
    const bosses = s.mons.filter(m => m.frontier === f.id && m.hp > 0);
    assert.equal(bosses.length, 1, `${f.id} did not spawn exactly one live boss`);
    assert(sim.startQuest(qid, s.advs.slice(4).map(a => a.id)), 'duplicate challenge started');
    bosses[0].hp = 0;
    sim.checkQuest(q);
    assert.equal(s.frontier.completed[f.id], true);
    assert(Object.hasOwn(s.frontier.relics, f.relic));
    assert.equal(s.frontier.relics[f.relic], null);
    assert.equal(townDist(s, f.x, f.y), 0, `${f.id} land did not become buildable`);
    assert(buildAreas(s).some(a => a.x0 === f.land.x0 && a.y0 === f.land.y0 && a.x1 === f.land.x1 && a.y1 === f.land.y1));
    assert.equal(s.gold, before.gold - f.fee + q.reward.gold);
    assert.equal(s.tp, before.tp + q.reward.tp);
    assert(s.pop >= before.pop + q.reward.pop); // party satisfaction also raises popularity
    assert.equal(s.cleared, before.cleared + 1);
    if (f === first) { assert.equal(sim.build('road', ...firstBuild), null); assert(roadAt(s, ...firstBuild)); }
    const once = JSON.stringify({ frontier: s.frontier, gold: s.gold, tp: s.tp, pop: s.pop, cleared: s.cleared });
    sim.checkQuest(q); sim.captureFrontier(f.id);
    assert.equal(JSON.stringify({ frontier: s.frontier, gold: s.gold, tp: s.tp, pop: s.pop, cleared: s.cleared }), once);
    assert(sim.startQuest(qid, party), 'completed frontier could be challenged again');
    settleDead(sim, f.id);
  }

  assert.equal(Object.keys(s.frontier.completed).length, FRONTIERS.length);
  assert.equal(Object.keys(s.frontier.relics).length, FRONTIERS.length);
  assert.equal(s.activeQuests.filter(q => q.frontier).length, 0);
  assert.equal(s.mons.filter(m => m.frontier).length, 0);
  for (const key of new Set(FRONTIERS.flatMap(f => Object.keys(f.bonus)))) {
    assert.equal(frontierBonus(s, key), FRONTIERS.reduce((n, f) => n + (f.bonus[key] || 0), 0));
  }

  const relic = FRONTIERS[0].relic, [a, b] = s.advs;
  assert.equal(sim.equipRelic(relic, a.id), null);
  assert.equal(a.eq.blessing, relic); assert.equal(s.frontier.relics[relic], a.id);
  const sameOwner = JSON.stringify({ relics: s.frontier.relics, eq: s.advs.map(x => x.eq), hp: s.advs.map(x => x.hp) });
  assert.equal(sim.equipRelic(relic, a.id), null);
  assert.equal(JSON.stringify({ relics: s.frontier.relics, eq: s.advs.map(x => x.eq), hp: s.advs.map(x => x.hp) }), sameOwner);
  assert.equal(sim.equipRelic(relic, b.id), null);
  assert.equal(a.eq.blessing, null); assert.equal(b.eq.blessing, relic); assert.equal(s.frontier.relics[relic], b.id);

  // Accessories can now be bought alongside the permanent blessing.
  const shop = { id: s.nextId++, type: 'item', x: 31, y: 31, lv: 1, occ: [b.id], visits: 0, sales: 0 };
  s.buildings.push(shop); s.unlocked.luckyCharm = true; b.gold = 10_000;
  const pending = { type: 'visit', b: shop.id, dur: 0, buy: 'luckyCharm' };
  b.task = pending; b.inside = { b: shop.id, t: 0, task: pending };
  sim.insideStep(b);
  assert.equal(b.eq.acc, 'luckyCharm'); assert.equal(b.eq.blessing, relic); assert.equal(s.frontier.relics[relic], b.id);

  assert.equal(sim.equipRelic(relic, null), null);
  assert.equal(b.eq.acc, 'luckyCharm'); assert.equal(b.eq.blessing, null); assert.equal(s.frontier.relics[relic], null);
  s.buildings.push({ id: s.nextId++, type: 'smith', x: 27, y: 32, lv: 1, occ: [] });
  assert(sim.develop(relic), 'a legendary relic was developable');
  assert(!s.unlocked[relic]);
  assert(ITEMS[relic].legendary);

  // A visit to a captured far-side facility is not abandoned at the old 45-second limit.
  assert.equal(sim.build('item', 120, 80), null);
  const farShop = s.buildings.find(x => x.type === 'item' && x.x === 120 && x.y === 80), traveler = s.advs[2];
  assert(farShop);
  traveler.x = 38; traveler.y = 28; traveler.inside = null; traveler.ko = false; traveler.dungeon = false;
  traveler.task = { type: 'visit', b: farShop.id, dur: 2, buy: 'potion' }; traveler.taskT = 0;
  sim.advStep(traveler);
  assert(traveler.task.travelLimit > 45);
  traveler.taskT = 46; sim.advStep(traveler);
  assert.equal(traveler.task?.type, 'visit');
  traveler.taskT = 0; traveler.path = null;
  for (let i = 0; i < 1800 && traveler.task && !traveler.inside; i++) sim.advStep(traveler);
  assert.equal(traveler.inside?.b, farShop.id, 'adventurer did not reach the far-side shop');
  const folk = { id: s.nextId++, x: 38, y: 38, dir: 1, anim: 0, path: null, task: { b: farShop.id }, taskT: 0 };
  const visitsBefore = farShop.visits;
  for (let i = 0; i < 1800 && folk.task && !folk.inside; i++) sim.folkStep(folk);
  assert(folk.inside > 0, 'townsfolk abandoned the far-side shop before arrival');
  assert.equal(farShop.visits, visitsBefore + 1);

  const copy = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(copy.frontier, s.frontier);
  assert.equal(Object.keys(copy.frontier.completed).length, FRONTIERS.length);

  // Completed older saves recover missing vault entries without replaying a conquest or duplicating rewards.
  const missing = JSON.parse(JSON.stringify(s));
  delete missing.frontier.relics;
  migrate(missing);
  assert.deepEqual(missing.frontier.relics, Object.fromEntries(FRONTIERS.map(f => [f.relic, null])));
  const repaired = JSON.stringify(missing);
  migrate(missing);
  assert.equal(JSON.stringify(missing), repaired);
}

// A pre-frontier 76x56 save expands without changing any old tile stride, RPG
// coordinate, or ongoing quest payload.
{
  const old = newGame(771);
  old.ground = Array.from({ length: HOME_H }, (_, y) => old.ground.slice(y * MAP_W, y * MAP_W + HOME_W)).join('');
  old.roads = Array.from({ length: HOME_H }, (_, y) => old.roads.slice(y * MAP_W, y * MAP_W + HOME_W)).join('');
  const road = 55 * HOME_W + 75;
  old.roads = old.roads.slice(0, road) + '1' + old.roads.slice(road + 1);
  old.props = old.props.filter(p => p.x < HOME_W && p.y < HOME_H);
  old.advs[0].x = 71.25; old.advs[0].y = 52.75;
  old.activeQuests = [{ id: 98765, kind: 'boss', boss: 'bamboo', members: [old.advs[0].id], spot: [60, 42], mobs: [], t: 12 }];
  old.advs[0].task = { type: 'quest', qid: 98765 };
  const expectedGround = old.ground, expectedRoads = old.roads;
  const expectedAdv = { x: old.advs[0].x, y: old.advs[0].y, task: { ...old.advs[0].task } };
  const expectedQuest = structuredClone(old.activeQuests[0]);
  const expectedSeed = old.seed;
  delete old.mapWidth; delete old.mapHeight; delete old.frontier;

  const s = migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(s.mapWidth, MAP_W); assert.equal(s.mapHeight, MAP_H);
  assert.equal(s.ground.length, MAP_W * MAP_H); assert.equal(s.roads.length, MAP_W * MAP_H);
  for (let y = 0; y < HOME_H; y++) for (let x = 0; x < HOME_W; x++) {
    assert.equal(s.ground[y * MAP_W + x], expectedGround[y * HOME_W + x]);
    assert.equal(s.roads[y * MAP_W + x], expectedRoads[y * HOME_W + x]);
  }
  assert(roadAt(s, 75, 55));
  assert.deepEqual({ x: s.advs[0].x, y: s.advs[0].y, task: s.advs[0].task }, expectedAdv);
  assert.deepEqual(s.activeQuests[0], expectedQuest);
  assert.deepEqual(s.frontier, { completed: {}, relics: {} });
  assert.equal(s.seed, expectedSeed, 'migration consumed simulation RNG state');
  const once = JSON.stringify(s); migrate(s);
  assert.equal(s.seed, expectedSeed, 'idempotent migration consumed simulation RNG state');
  assert.equal(JSON.stringify(s), once, 'migration was not idempotent');
}

// The old 6,000-expansion ceiling cannot reject a route across the expanded map.
{
  const { s, sim } = setup(555);
  const far = FRONTIERS.at(-1), target = sim.grid.nearestWalkable(far.x, far.y) || [far.x, far.y];
  const path = sim.grid.find(38, 28, target[0], target[1]);
  assert(path?.length, 'no path to the farthest frontier');
  assert.deepEqual(path.at(-1), target);
  assert(path.length > 60, 'farthest-frontier path did not exercise large-map routing');
  assert.equal(s.mapWidth * s.mapHeight, MAP_W * MAP_H);
}

if (SOAK) {
  assert(global.gc, 'run frontier soak with node --expose-gc');
  const { s, sim, party } = setup(991), f = FRONTIERS[0];
  const retrySamples = [];
  // Ambient visitors can acquire burn/double-hit perks while challenges are retried.
  // Verify every pending callback expires on schedule rather than requiring combat to stop.
  const step = sim.step.bind(sim);
  sim.step = () => {
    const pending = (sim.timers || []).map(timer => ({ timer, remaining: timer.t }));
    step();
    const live = sim.timers || [];
    for (const { timer, remaining } of pending) {
      if (remaining <= 1) assert(!live.includes(timer), 'expired combat callback retained');
      else { assert(live.includes(timer)); assert.equal(timer.t, remaining - 1, 'combat callback failed to age'); }
    }
    assert(live.length < 64, `retry timer queue grew to ${live.length}`);
    assert(live.every(timer => timer.t > 0 && timer.t <= 6), 'combat callback exceeded its bounded lifetime');
  };
  for (let i = 0; i < 240; i++) {
    failChallenge(s, sim, f, party);
    assert.equal(Object.keys(s.frontier.completed).length, 0);
    assert.equal(Object.keys(s.frontier.relics).length, 0);
    assert.equal(s.activeQuests.filter(q => q.frontier).length, 0);
    assert.equal(s.mons.filter(m => m.frontier).length, 0);
    assert(s.log.length <= 60 && s.happenLog.length <= 24);
    if (i >= 39 && i % 40 === 39) { global.gc(); retrySamples.push(process.memoryUsage().heapUsed); }
  }
  assert.equal(FRONTIERS.length, 8);
  assert(JSON.stringify(s).length < 1_500_000);
  if (retrySamples.length > 2) {
    const drift = Math.max(...retrySamples.slice(-3)) - Math.min(...retrySamples.slice(0, 3));
    assert(drift < 8 * 1024 * 1024, `forced-GC heap drifted ${(drift / 1024 / 1024).toFixed(1)} MiB`);
  }

  // Three hours of continuing simulation with the default eight-resident fixture.
  // Nothing is manually cleared: normal actor, timer, FX and log cleanup must hold the plateau.
  const long = setup(992), total = Math.round(3 * 60 * 60 / DT), interval = Math.round(15 * 60 / DT), samples = [];
  for (let i = 1; i <= total; i++) {
    long.sim.step();
    if (i % interval !== 0) continue;
    global.gc();
    const saveBytes = JSON.stringify(long.s).length;
    const sample = { minute: i * DT / 60, heap: process.memoryUsage().heapUsed, advs: long.s.advs.length, mons: long.s.mons.length, pets: long.s.monsters.length, folk: long.s.folk.length, fx: long.s.fx.length, timers: long.sim.timers?.length || 0, active: long.s.activeQuests.length, props: long.s.props.length, buildings: long.s.buildings.length, saveBytes };
    samples.push(sample);
    assert(!long.s.mons.some(m => m.frontier), 'dormant frontier retained an actor');
    assert(!long.s.activeQuests.some(q => q.frontier), 'dormant frontier created an active quest');
    assert(sample.timers < 64, `timer queue grew to ${sample.timers}`);
    assert(long.s.log.length <= 60 && long.s.happenLog.length <= 24);
    assert(saveBytes < 1_500_000);
  }
  const postWarmup = samples.slice(1), heapDrift = Math.max(...postWarmup.slice(-3).map(x => x.heap)) - Math.min(...postWarmup.slice(0, 3).map(x => x.heap));
  assert(heapDrift < 8 * 1024 * 1024, `three-hour forced-GC heap drifted ${(heapDrift / 1024 / 1024).toFixed(1)} MiB`);
  console.log('frontier soak samples:', JSON.stringify(samples));
}

console.log(`frontier: dormant sites, retries, one-time land/relic rewards, migration and far-map paths passed${SOAK ? ' (soak)' : ''}`);
