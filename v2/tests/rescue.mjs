import assert from 'node:assert/strict';
import { makeAdventurer, maxHp, migrate, newGame, place } from '../js/state.js';
import { Sim } from '../js/sim.js';

function setup(seed = 7301) {
  const s = newGame(seed);
  s.props = []; s.advs = []; s.mons = []; s.monsters = []; s.folk = []; s.animals = []; s.npcs = [];
  const sim = new Sim(s, {});
  return { s, sim };
}

function adventurer(s, sim, name, x, y) {
  const a = makeAdventurer(s, sim.R, 'warrior');
  Object.assign(a, { name, resident: true, x, y, hp: maxHp(a, s), hunger: 0, energy: 100, fun: 100, task: null, path: null });
  s.advs.push(a);
  return a;
}

function knockOut(a, task = null) {
  Object.assign(a, { hp: 0, ko: true, koT: 0, task, path: null, rescueBy: null, rescueRetry: 0 });
}

function tick(s, sim, count = 1) {
  for (let i = 0; i < count; i++) {
    s.tick++;
    for (const a of [...s.advs]) sim.advStep(a);
  }
}

function drive(s, sim, done, limit = 2400) {
  for (let i = 0; i < limit; i++) {
    tick(s, sim);
    if (done()) return i + 1;
  }
  return null;
}

// A fallen pawn remains where it fell. With nobody available to help, it gets up
// slowly in the field instead of pathing while unconscious.
{
  const { s, sim } = setup(), fallen = adventurer(s, sim, 'Solo', 44, 34), at = [fallen.x, fallen.y];
  knockOut(fallen);
  tick(s, sim, 590);
  assert(fallen.ko, 'field recovery happened before the slow fallback');
  assert.deepEqual([fallen.x, fallen.y], at, 'KO pawn drifted toward a building');
  assert(drive(s, sim, () => !fallen.ko, 30), 'field recovery never completed');
  assert.deepEqual([fallen.x, fallen.y], at);
  assert(fallen.hp >= 1 && fallen.task?.type === 'camp');
}

// The first healthy nearby pawn reserves the body, carries it to its own home,
// and no second helper can claim the same casualty or depart on a quest meanwhile.
{
  const { s, sim } = setup(), fallen = adventurer(s, sim, 'Fallen', 43, 34);
  const first = adventurer(s, sim, 'First', 39, 34), second = adventurer(s, sim, 'Second', 40, 35);
  const home = s.buildings.find(b => b.type === 'house'); fallen.home = home.id;
  knockOut(fallen);
  assert(drive(s, sim, () => first.task?.type === 'rescue' || second.task?.type === 'rescue', 80));
  const rescuer = first.task?.type === 'rescue' ? first : second, other = rescuer === first ? second : first;
  assert.equal(fallen.rescueBy, rescuer.id);
  assert.notEqual(other.task?.type, 'rescue');
  assert(!sim.questCandidates().includes(rescuer));
  assert(drive(s, sim, () => rescuer.task?.carrying, 300), 'rescuer never reached the body');
  assert.equal(fallen.x, rescuer.x); assert.equal(fallen.y, rescuer.y);
  assert(drive(s, sim, () => fallen.inside, 1200), 'rescuer never delivered the body');
  assert.equal(fallen.inside.b, home.id);
  assert.equal(fallen.ko, false); assert.equal(fallen.hp, 1); assert.equal(fallen.rescueBy, null);
  assert(home.occ.includes(fallen.id));
}

// A raid rally leaves an active carry intact, even after the casualty has been
// down long enough that losing its carrier would trigger immediate field recovery.
{
  const { s, sim } = setup(), fallen = adventurer(s, sim, 'Raid Fallen', 42, 34), rescuer = adventurer(s, sim, 'Raid Carrier', 41, 34);
  knockOut(fallen);
  assert(drive(s, sim, () => rescuer.task?.carrying, 120));
  fallen.koT = 70;
  const rescueTask = rescuer.task;
  assert.equal(sim.startHappening('bandits'), null);
  assert.equal(rescuer.task, rescueTask);
  assert(rescuer.task.carrying); assert.equal(fallen.rescueBy, rescuer.id);
  tick(s, sim);
  assert(fallen.ko); assert.equal(fallen.rescueBy, rescuer.id);
}

// Knocking out a carrier drops the casualty at the carrier's current tile and
// releases the reservation so another recovery path can take over.
{
  const { s, sim } = setup(), fallen = adventurer(s, sim, 'Dropped', 42, 34), rescuer = adventurer(s, sim, 'Carrier', 41, 34);
  knockOut(fallen);
  assert(drive(s, sim, () => rescuer.task?.carrying, 120));
  sim.hurtAdv(rescuer, 99999, 'test foe');
  assert(rescuer.ko); assert.equal(rescuer.task, null);
  assert.equal(fallen.rescueBy, null);
  assert.deepEqual([fallen.x, fallen.y], [rescuer.x, rescuer.y]);
}

// An unreachable body is never pulled through barriers. The approach gives up
// in bounded time and the stationary field fallback still resolves the KO.
{
  const { s, sim: initial } = setup(), fallen = adventurer(s, initial, 'Blocked', 48, 34), rescuer = adventurer(s, initial, 'Outside', 44, 34);
  for (const [x, y] of [[48, 33], [49, 34], [48, 35], [47, 34]]) place(s, 'palisade', x, y);
  const sim = new Sim(s, {}), at = [fallen.x, fallen.y];
  knockOut(fallen);
  assert.equal(sim.grid.find(44, 34, 48, 34), null);
  tick(s, sim, 590);
  assert(fallen.ko); assert.deepEqual([fallen.x, fallen.y], at);
  assert(drive(s, sim, () => !fallen.ko, 40), 'blocked casualty never used field recovery');
  assert.deepEqual([fallen.x, fallen.y], at);
  assert.notEqual(rescuer.task?.type, 'rescue');
}

// A valid carry survives plain-JSON save/load and resumes with rebuilt paths.
// A missing carrier is also reconciled without leaving a permanent reservation.
{
  const { s, sim } = setup(), fallen = adventurer(s, sim, 'Saved Fallen', 43, 34), rescuer = adventurer(s, sim, 'Saved Carrier', 42, 34);
  knockOut(fallen);
  assert(drive(s, sim, () => rescuer.task?.carrying, 120));
  const raw = JSON.stringify(s), loaded = migrate(JSON.parse(raw)), restored = new Sim(loaded, {});
  const lf = loaded.advs.find(a => a.id === fallen.id), lr = loaded.advs.find(a => a.id === rescuer.id);
  assert.equal(lf.rescueBy, lr.id); assert.equal(lr.task.type, 'rescue'); assert(lr.task.carrying);
  assert(drive(loaded, restored, () => lf.inside, 1200), 'loaded rescue did not finish');

  const missing = migrate(JSON.parse(raw)), mf = missing.advs.find(a => a.id === fallen.id);
  missing.advs = missing.advs.filter(a => a.id !== rescuer.id);
  const missingSim = new Sim(missing, {});
  tick(missing, missingSim);
  assert.equal(mf.rescueBy, null);
  assert(drive(missing, missingSim, () => !mf.ko, 700));
}

// Remote frontier pickups receive a route-sized deadline rather than the local
// 45-second allowance, and remain carried after that local allowance expires.
{
  const { s, sim } = setup(), fallen = adventurer(s, sim, 'Remote Fallen', 140, 100), rescuer = adventurer(s, sim, 'Remote Carrier', 139, 100);
  knockOut(fallen);
  assert(drive(s, sim, () => rescuer.task?.carrying, 120));
  assert(rescuer.task.carryLimit > 45);
  tick(s, sim, 500);
  assert(rescuer.task?.carrying, 'remote rescue was dropped on the local carry deadline');
  assert.equal(fallen.rescueBy, rescuer.id);
  assert(drive(s, sim, () => fallen.inside, 2400), 'remote rescue did not reach shelter within its distance-aware deadline');
}

// Active quest casualties remain owned by that quest: village helpers do not
// hijack them and field recovery does not alter the quest failure lifecycle.
{
  const { s, sim } = setup(), fallen = adventurer(s, sim, 'Quest Fallen', 42, 34), helper = adventurer(s, sim, 'Village Helper', 41, 34);
  const qid = 9999;
  knockOut(fallen, { type: 'quest', qid });
  s.activeQuests.push({ id: qid, kind: 'outbreak', members: [fallen.id], t: 0, mobs: [] });
  const at = [fallen.x, fallen.y];
  tick(s, sim, 700);
  assert(fallen.ko); assert.deepEqual([fallen.x, fallen.y], at);
  assert.equal(fallen.rescueBy, null); assert.notEqual(helper.task?.type, 'rescue');
  assert(!sim.questCandidates().includes(fallen));
}

console.log('rescue: stationary KO, exclusive carry, carrier drop, blocked fallback, save/load and quest ownership passed');
