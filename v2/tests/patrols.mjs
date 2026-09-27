import assert from 'node:assert/strict';
import { newGame, migrate, maxHp, townDist } from '../js/state.js';
import { Sim, WEEK_SECONDS, DT } from '../js/sim.js';
import { FRONTIERS, CAMP_PATROLS, JOBS } from '../js/data.js';

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
  assert(s.mons.length >= 2 && s.mons.length <= 3);
  const c = s.banditCamps.find(c => c.id === s.mons[0].sourceCamp);
  assert(s.mons.every(m => m.job && m.raid === 'patrol' && m.x === c.x && m.y === c.y && m.expiresAt > s.tick));
  assert(c.patrolAt - s.tick >= 2 * week && c.patrolAt - s.tick <= 4 * week);
  const before = s.mons.length; sim.campPatrols(); assert.equal(s.mons.length, before, 'waves must be staggered');
  for (let i = 0; i < 80; i++) { s.tick += week / 2; sim.campPatrols(); }
  assert(s.mons.length <= 12);
  for (const camp of s.banditCamps) assert(s.mons.filter(m => m.sourceCamp === camp.id).length <= 3);
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
// Rank bounds apply even with level-99 visitors, and no other camp can bypass the global cooldown.
for (let rank = 1; rank <= 5; rank++) {
  const { s, sim } = setup(); s.stars = rank; for (const a of s.advs) a.lv = 99;
  const rules = CAMP_PATROLS[rank]; sim.campPatrols();
  assert(s.mons.length >= rules.count[0] && s.mons.length <= Math.max(1, rank - 2));
  assert(s.mons.every(m => m.lv >= rules.level[0] && m.lv <= rules.level[1]));
  assert(s.flags.nextCampPatrol - s.tick >= (7 - rank) * week);
  assert(s.flags.nextCampPatrol - s.tick <= (9 - rank) * week);
  const before = s.mons.length; s.tick = s.flags.nextCampPatrol - 1;
  sim.campPatrols(); assert.equal(s.mons.length, before);
  s.tick++; sim.campPatrols(); assert(s.mons.length > before, 'another eligible camp can dispatch after the interval');
}
// Local self-defense actually damages attackers while preserving the interrupted routine.
for (const type of ['visit', 'stroll', 'camp', 'hunt', 'quest', 'rescue', 'leave']) {
  const { s, sim } = setup(), a = s.advs[0]; s.advs = [a];
  Object.assign(a, { x: 38, y: 28, job: 'warrior', cool: 0, energy: 80, hunger: 0, task: { type, zone: 1, dur: 20 } });
  a.hp = maxHp(a, s); const task = a.task;
  const guard = sim.spawnRaider([39, 28], 3, { raid: 'patrol', target: a.id, expiresAt: s.tick + week });
  const hp = guard.hp; sim.advStep(a);
  assert(guard.hp < hp, type + ' must fight back'); assert.equal(a.task, task); assert(!a.task.defend);
  guard.hp = 0; a.task = { type: 'camp', dur: 20 }; const energy = a.energy;
  sim.advStep(a); assert(a.energy > energy, 'routine resumes when danger ends');
}
// Melee pawns close the gap to ranged attackers inside town, without chasing beyond its boundary.
{
  const { s, sim } = setup(), a = s.advs[0]; s.advs = [a];
  Object.assign(a, { x: 38, y: 32, job: 'warrior', cool: 0, task: { type: 'camp', dur: 50 }, energy: 80 });
  a.hp = maxHp(a, s);
  const guard = sim.spawnRaider([41, 32], 3, { raid: 'patrol', job: 'archer', target: a.id, expiresAt: s.tick + week });
  const hp = guard.hp;
  for (let i = 0; i < 50; i++) { s.tick++; sim.advStep(a); }
  assert(guard.hp < hp, 'melee pawn must approach and hit a ranged attacker');
  a.x = 28; a.y = 20; a.path = null; guard.x = 25; guard.y = 20;
  a.task = { type: 'camp', dur: 50 };
  for (let i = 0; i < 50; i++) { s.tick++; sim.advStep(a); assert.equal(townDist(s, Math.round(a.x), Math.round(a.y)), 0); }
}
// Nearby guards and attacks on someone else never interrupt routine rest.
for (const target of [null, -1]) {
  const { s, sim } = setup(), a = s.advs[0]; s.advs = [a];
  Object.assign(a, { x: 38, y: 28, energy: 70, task: { type: 'camp', dur: 30 } }); a.hp = maxHp(a, s);
  const guard = sim.spawnRaider([39, 28], 3, { raid: 'patrol', target, expiresAt: s.tick + week }), hp = guard.hp;
  sim.advStep(a); assert.equal(guard.hp, hp); assert(a.energy > 70, 'uninvolved pawn should continue resting');
}
// Self-defense must not bypass existing quest, rescue, retreat or indoor/cave behavior.
for (const type of ['return', 'carrying', 'inside', 'dungeon']) {
  const { s, sim } = setup(), a = s.advs[0]; s.advs = [a];
  Object.assign(a, { x: 38, y: 28, energy: 80, task: { type, dur: 30 } }); a.hp = maxHp(a, s);
  const guard = sim.spawnRaider([39, 28], 3, { raid: 'patrol', target: a.id, expiresAt: s.tick + week }), hp = guard.hp;
  if (type === 'inside') a.inside = { b: s.buildings[0].id, t: 10, task: { type: 'visit', sleep: true } };
  if (type === 'dungeon') a.dungeon = true;
  if (type === 'carrying') a.task = { type: 'rescue', carrying: true };
  let continued = false;
  sim.questStep = sim.rescueStep = sim.huntStep = sim.walkTo = () => { continued = true; };
  sim.advStep(a); assert.equal(guard.hp, hp, type + ' must retain existing behavior');
  if (!['inside', 'dungeon'].includes(type)) assert(continued, type + ' should continue');
}
{
  const { s, sim } = setup(), a = s.advs[0]; s.advs = [a];
  Object.assign(a, { x: 38, y: 28, energy: 80, potions: 1, task: { type: 'hunt', zone: 1, dur: 30 } });
  a.hp = maxHp(a, s) * 0.2;
  const guard = sim.spawnRaider([39, 28], 3, { raid: 'patrol', target: a.id }), hp = guard.hp;
  sim.advStep(a); assert.equal(a.potions, 0, 'critical hunters must still use potions'); assert.equal(guard.hp, hp);
  a.hp = maxHp(a, s); a.energy = 5; sim.advStep(a);
  assert.equal(a.task?.type, 'return', 'exhausted hunters must still retreat');
}
{
  const { s, sim } = setup(), a = s.advs[0]; s.advs = [a];
  Object.assign(a, { x: 38, y: 28, energy: 80, potions: 1, task: { type: 'quest', qid: 123 } });
  a.hp = maxHp(a, s) * 0.2;
  s.activeQuests = [{ id: 123, members: [a.id], kind: 'outbreak', spot: [38, 28] }];
  const guard = sim.spawnRaider([39, 28], 3, { raid: 'patrol', target: a.id }), hp = guard.hp;
  sim.advStep(a); assert.equal(a.potions, 0, 'quest healing must run before retaliation'); assert.equal(guard.hp, hp);
  assert.equal(a.task.qid, 123); assert.deepEqual(s.activeQuests[0].members, [a.id]);
}
// A real rescue reservation survives retaliation and resumes the pickup.
{
  const { s, sim } = setup(), [a, fallen] = s.advs; s.advs = [a, fallen];
  Object.assign(a, { x: 39, y: 34, job: 'warrior', energy: 80, cool: 0, taskT: 0, task: { type: 'rescue', target: fallen.id, carrying: false } });
  a.hp = maxHp(a, s);
  Object.assign(fallen, { x: 43, y: 34, hp: 0, ko: true, koT: 10, rescueBy: a.id });
  const guard = sim.spawnRaider([40, 34], 3, { raid: 'patrol', target: a.id }), task = a.task, hp = guard.hp;
  sim.advStep(a); assert(guard.hp < hp); assert.equal(a.task, task); assert.equal(a.taskT, 0);
  guard.hp = 0;
  for (let i = 0; i < 200 && !task.carrying; i++) { s.tick++; sim.advStep(a); }
  assert(task.carrying, 'rescuer must resume and pick up its reserved casualty'); assert.equal(fallen.rescueBy, a.id);
}
// Existing overpowering guards and rapid schedules are corrected once, without rerolling on each load.
{
  const { s, sim } = setup(); s.stars = 3; delete s.flags.patrolScaling;
  const guard = sim.spawnRaider([40, 28], 55, { raid: 'patrol', job: 'samurai' }); guard.hp = Math.round(guard.mhp / 2);
  const raid = sim.spawnRaider([42, 28], 55, { raid: 'bandits' });
  const seed = s.seed; migrate(s);
  assert.equal(guard.lv, 8); assert(JOBS[guard.job].tier <= 2); assert(guard.hp > 0 && guard.hp < guard.mhp);
  assert.equal(raid.lv, 55, 'migration must not change unrelated quest or raid enemies');
  assert.equal(s.seed, seed); assert(s.flags.nextCampPatrol >= s.tick + 4 * week);
  const once = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), once);
}
console.log('patrols: rank-scaled guard waves, shared cooldown, local self-defense, bounds, capture recall and migration passed');
