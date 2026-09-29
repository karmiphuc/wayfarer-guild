import { getFrontiers } from '../js/world.js';
import assert from 'node:assert/strict';
import { FRONTIERS, JOBS, MAP_W, MAP_H, MONSTERS } from '../js/data.js';
import { makeAdventurer, maxHp, migrate, newGame, place, seedBanditCamps } from '../js/state.js';
import { Sim, DT, WEEK_SECONDS } from '../js/sim.js';

for (const seed of [1, 17, 4242, 81299]) {
  const s = newGame(seed), same = newGame(seed), sim = new Sim(s);
  assert.equal(s.banditCamps.length, 16);
  assert.deepEqual(s.banditCamps, same.banditCamps);
  assert.equal(new Set(s.banditCamps.map(c => c.id)).size, 16);
  assert(!s.mons.some(m => m.camp));
  for (const c of s.banditCamps) {
    assert(c.x > 2 && c.y > 2 && c.x < MAP_W - 3 && c.y < MAP_H - 3);
    assert(getFrontiers(s).every(f => Math.hypot(c.x - f.x, c.y - f.y) >= 10));
    assert(sim.grid.find(38, 28, c.x, c.y)?.length, `${c.name} unreachable in world ${seed}`);
  }
}
assert.notDeepEqual(newGame(1).banditCamps, newGame(17).banditCamps);

// Legacy four-week cooldowns retain elapsed time, extend once with isolated RNG,
// and leave already available camps available.
{
  const old = newGame(314), week = WEEK_SECONDS / DT;
  old.tick = 2 * week;
  for (const c of old.banditCamps) delete c.cooldownWeeks;
  old.banditCamps[0].clears = 1; old.banditCamps[0].readyAt = 4 * week;
  old.banditCamps[1].clears = 1; old.banditCamps[1].readyAt = week;
  const seed = old.seed, copy = structuredClone(old);
  migrate(old); migrate(copy);
  const c = old.banditCamps[0];
  assert(Number.isInteger(c.cooldownWeeks) && c.cooldownWeeks >= 8 && c.cooldownWeeks <= 20);
  assert.equal(c.readyAt - old.tick, (c.cooldownWeeks - 2) * week);
  assert.equal(old.banditCamps[1].readyAt, week);
  assert.equal(old.banditCamps[1].cooldownWeeks, 0);
  assert.equal(old.seed, seed); assert.deepEqual(old.banditCamps, copy.banditCamps);
  const once = JSON.stringify(old); migrate(old); assert.equal(JSON.stringify(old), once);
}

// Older villages gain camps without consuming the simulation RNG or moving buildings/roads.
{
  const s = newGame(91);
  delete s.banditCamps;
  for (const f of getFrontiers(s)) s.frontier.completed[f.id] = true;
  place(s, 'house', 90, 60);
  const seed = s.seed, buildings = JSON.stringify(s.buildings), roads = s.roads;
  seedBanditCamps(s);
  assert.equal(s.seed, seed); assert.equal(JSON.stringify(s.buildings), buildings); assert.equal(s.roads, roads);
  assert.equal(s.banditCamps.length, 16);
  const once = JSON.stringify(migrate(s)); migrate(s); assert.equal(JSON.stringify(s), once);
}

const s = newGame(4242), sim = new Sim(s);
s.stars = 5; s.gold = 1_000_000; s.advs = [];
for (let i = 0; i < 8; i++) {
  const a = makeAdventurer(s, sim.R, i % 2 ? 'archer' : 'warrior');
  a.lv = 60; a.resident = true; a.hp = maxHp(a, s); s.advs.push(a);
}
const c = s.banditCamps[0], d = s.banditCamps[1], qid = 'camp:' + c.id;
assert.equal(sim.campBlock(c.id), null);
assert.equal(sim.startQuest(qid, s.advs.slice(0, 4).map(a => a.id)), null);
let q = s.activeQuests.find(q => q.camp === c.id);
assert(q); assert.equal(q.mobs.length, q.n);
assert(s.mons.filter(m => m.camp === c.id).every(m => MONSTERS[m.type].human && JOBS[m.job] && JOBS[m.job].sprites.includes(m.spr)));
const paid = s.gold;
assert.match(sim.instantQuest(qid), /already/); assert.equal(s.gold, paid);
assert.equal(sim.startQuest('camp:' + d.id, s.advs.slice(4).map(a => a.id)), null);
const activeCopy = migrate(JSON.parse(JSON.stringify(s))), restored = new Sim(activeCopy);
assert.equal(activeCopy.activeQuests.length, 2);
assert.equal(activeCopy.mons.filter(m => m.camp === c.id).length, q.n);
assert.match(restored.campBlock(c.id), /already/);

// Clear once, loot once; cooldown is persisted and does not spawn replacements by itself.
for (const m of s.mons) if (m.camp === c.id) m.hp = 0;
const before = s.gold, ore = s.mats.ore;
sim.checkQuest(q);
assert.equal(c.clears, 1); assert(s.gold >= before + q.reward.gold);
assert.equal(s.activeQuests.filter(q => q.camp === d.id).length, 1);
assert.equal(s.mats.ore, ore + q.reward.materials.ore);
const after = JSON.stringify({ gold: s.gold, mats: s.mats, clears: c.clears });
sim.checkQuest(q); assert.equal(JSON.stringify({ gold: s.gold, mats: s.mats, clears: c.clears }), after);
assert.match(sim.campBlock(c.id), /returns/);
assert(Number.isInteger(c.cooldownWeeks) && c.cooldownWeeks >= 8 && c.cooldownWeeks <= 20);
assert.equal(c.readyAt, s.tick + Math.round(c.cooldownWeeks * WEEK_SECONDS / DT));
const reloaded = migrate(JSON.parse(JSON.stringify(s)));
assert.equal(reloaded.banditCamps[0].readyAt, c.readyAt);
assert.equal(reloaded.banditCamps[0].cooldownWeeks, c.cooldownWeeks);
s.tick = c.readyAt; assert.equal(sim.campBlock(c.id), null);
assert(!s.mons.some(m => m.camp === c.id && m.hp > 0));

// Failure/retry removes active enemies without paying the success reward or growing ledgers.
for (let retry = 0; retry < 40; retry++) {
  for (const a of s.advs.slice(0, 4)) { a.ko = false; a.hp = maxHp(a, s); a.task = null; }
  assert.equal(sim.startQuest(qid, s.advs.slice(0, 4).map(a => a.id)), null);
  q = s.activeQuests.find(q => q.camp === c.id);
  const money = s.gold;
  q.t = 601; sim.checkQuest(q);
  assert.equal(s.gold, money); assert.equal(c.clears, 1);
  assert(!s.activeQuests.some(q => q.camp === c.id));
  for (let i = 0; i < 20; i++) sim.step();
  assert(!s.mons.some(m => m.camp === c.id));
}
assert.equal(s.banditCamps.length, 16);

// Camp footprint remains clear even when its surrounding territory is captured.
for (const f of getFrontiers(s)) s.frontier.completed[f.id] = true;
const inLand = s.banditCamps.find(c => getFrontiers(s).some(f => c.x >= f.land.x0 && c.x < f.land.x1 && c.y >= f.land.y0 && c.y < f.land.y1));
if (inLand) assert.match(sim.canPlace('road', inLand.x, inLand.y), /camp entrance/);
console.log('camps: 16 seeded dormant sites, human classes, parallel battles, loot/cooldown, migration and bounded retries passed');
