import assert from 'node:assert/strict';
import { newGame, migrate, maxHp } from '../js/state.js';
import { Sim, WEEK_SECONDS, DT } from '../js/sim.js';
import { FRONTIERS } from '../js/data.js';

const week = WEEK_SECONDS / DT;
function setup() {
  const s = newGame(4242), sim = new Sim(s);
  s.stars = 5; s.mons = []; s.tick = 1000; s.flags.nextCampPatrol = 0;
  for (const c of s.banditCamps) c.patrolAt = 0;
  return { s, sim };
}
{
  const { s, sim } = setup(), other = setup();
  sim.campPatrols(); other.sim.campPatrols();
  assert.deepEqual(s.mons, other.s.mons, 'patrol classes and counts must replay from the seed');
  assert(s.mons.length >= 2 && s.mons.length <= 4);
  const c = s.banditCamps.find(c => c.id === s.mons[0].sourceCamp);
  assert(s.mons.every(m => m.job && m.raid === 'patrol' && m.x === c.x && m.y === c.y && m.expiresAt > s.tick));
  assert(c.patrolAt - s.tick >= 2 * week && c.patrolAt - s.tick <= 4 * week);
  const before = s.mons.length; sim.campPatrols(); assert.equal(s.mons.length, before, 'waves must be staggered');
  for (let i = 0; i < 80; i++) { s.tick += week / 2; sim.campPatrols(); }
  assert(s.mons.length <= 12);
  for (const camp of s.banditCamps) assert(s.mons.filter(m => m.sourceCamp === camp.id).length <= 4);
  const copy = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(copy.mons, s.mons); assert.deepEqual(copy.banditCamps, s.banditCamps);
  s.tick = Math.max(...s.mons.map(m => m.expiresAt));
  for (const m of s.mons) sim.monStep(m);
  assert(s.mons.every(m => m.hp === 0), 'unresolved patrols must expire');
}
// Camps inside captured territory still send guards toward the built village, not their own doorstep.
{
  const { s, sim } = setup();
  for (const f of FRONTIERS) sim.captureFrontier(f.id);
  sim.campPatrols(); const m = s.mons.find(m => m.raid === 'patrol'), before = [m.x, m.y];
  assert.notDeepEqual(m.raidGoal, before);
  s.advs = [];
  for (let i = 0; i < 100; i++) sim.monStep(m);
  assert(Math.hypot(m.x - before[0], m.y - before[1]) > 2);
}
// Only currently challengeable live camps dispatch; a cooldown, active challenge, or locked tier stops it.
for (const block of ['new-village', 'cooldown', 'challenge', 'tier']) {
  const { s, sim } = setup(); const c = s.banditCamps[0]; s.banditCamps = [c];
  if (block === 'new-village') s.stars = 0;
  if (block === 'cooldown') c.readyAt = s.tick + 8 * week;
  if (block === 'challenge') s.activeQuests = [{ camp: c.id, members: [] }];
  if (block === 'tier') { s.stars = 1; c.tier = 2; }
  sim.campPatrols(); assert.equal(s.mons.length, 0, block);
}
// Clearing recalls only that camp's patrols, pays the bounty once, and preserves the 8-20 week respite.
{
  const { s, sim } = setup(), c = s.banditCamps[0];
  sim.campPatrols(); const patrol = s.mons.filter(m => m.sourceCamp === c.id); assert(patrol.length >= 2);
  const unrelated = sim.spawnRaider([100, 80], 3, { raid: 'patrol', sourceCamp: s.banditCamps[1].id, expiresAt: 9000 });
  const a = s.advs[0]; a.resident = true; a.lv = 60; a.hp = maxHp(a, s); s.gold = 100000;
  assert.equal(sim.startQuest('camp:' + c.id, [a.id]), null);
  const q = s.activeQuests.find(q => q.camp === c.id);
  for (const m of s.mons) if (m.quest === q.id) m.hp = 0;
  sim.checkQuest(q);
  assert(patrol.every(m => m.hp === 0)); assert(unrelated.hp > 0);
  assert(c.cooldownWeeks >= 8 && c.cooldownWeeks <= 20); assert(c.patrolAt >= c.readyAt + 2 * week);
}
// Guard patrols are local encounters, never a village-wide alarm (including guards already inside town).
{
  const { s, sim } = setup(), a = s.advs[0]; s.advs = [a];
  Object.assign(a, { x: 28, y: 20, energy: 80, hunger: 0, task: { type: 'stroll', dur: 20 } });
  a.hp = maxHp(a, s); s.time.t = WEEK_SECONDS * 0.75;
  const guard = sim.spawnRaider([44, 28], 3, { raid: 'patrol', expiresAt: s.tick + week });
  const task = a.task; let rallies = 0; sim.rally = () => { rallies++; };
  sim.monStep(guard);
  assert.equal(rallies, 0, 'approaching guards must not rally pawns');
  assert.equal(a.task, task); assert(!sim.villageThreat(guard));
  assert(sim.nightRest(a), 'patrol elsewhere in town must not block bedtime');
  for (let i = 0; i < 10; i++) assert(!sim.decide(a).defend);
  a.task = { type: 'hunt', defend: true, dur: 90 }; sim.defendStep(a, a.task);
  assert.equal(a.task, null, 'old defense orders must end when only patrols remain');
  guard.x = a.x + 1; guard.y = a.y;
  assert.equal(sim.nearestMonster(a, 4), guard, 'nearby guards remain combat targets');
  assert.equal(sim.nightRest(a), null, 'nearby danger still interrupts rest');
  const raid = sim.spawnRaider([45, 28], 3, { raid: 'bandits' });
  assert(sim.villageThreat(raid)); assert.equal(sim.nearestRaider(a), raid, 'real raids retain defense priority');
  raid.raid = 'stampede'; assert(sim.villageThreat(raid));
}
// Old saves get stable schedules without consuming the running RNG or rescheduling on every load.
{
  const s = newGame(17); delete s.flags.nextCampPatrol;
  for (const c of s.banditCamps) delete c.patrolAt;
  const seed = s.seed; migrate(s); assert.equal(s.seed, seed);
  const once = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), once);
}
console.log('patrols: seeded 2-4 guard waves, eligibility, staggering, population/lifetime bounds, capture recall and save migration passed');
