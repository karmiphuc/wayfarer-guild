import assert from 'node:assert/strict';
import { newGame, maxHp, place } from '../js/state.js';
import { Sim, WEEK_SECONDS } from '../js/sim.js';

function setup() {
  const s = newGame(42), sim = new Sim(s), a = s.advs[0];
  s.mons = []; s.buildings = []; s.props = []; s.advs = [a];
  Object.assign(a, { resident: true, hunger: 0, energy: 80, gold: 0, fun: 100, persona: [], potions: 3, task: null, x: 38, y: 28 });
  a.hp = maxHp(a, s); const home = place(s, 'house', 35, 25); a.home = home.id; sim.rebuildGrid();
  return { s, sim, a, home };
}
{
  const { s, sim, a, home } = setup();
  assert.equal(sim.nightRest(a), null); assert.equal(sim.decide(a).type, 'hunt');
  s.time.t = WEEK_SECONDS * 0.75;
  assert.equal(sim.decide(a).b, home.id); assert(sim.decide(a).sleep);
  a.task = { type: 'hunt', zone: 1, dur: 60 }; a.path = [[38, 27]];
  s.tick = (10 - a.id % 10) % 10; sim.advStep(a);
  assert(a.task.night && a.task.sleep, 'routine hunts must yield at dusk without waiting 60 seconds');
  // Sleep actually restores energy and stays in the home through the short night.
  const before = a.energy;
  a.inside = { b: home.id, t: 12, task: a.task }; home.occ = [a.id];
  for (let i = 0; i < 60; i++) sim.insideStep(a);
  assert(a.inside); assert(a.energy > before);
}
{
  const { s, sim, a } = setup(); s.time.t = 25;
  s.activeQuests = [{ id: 5, members: [a.id] }]; assert.equal(sim.nightRest(a), null); s.activeQuests = [];
  a.task = { type: 'rescue' }; assert.equal(sim.nightRest(a), null); a.task = null;
  a.hunger = 90; assert.equal(sim.nightRest(a), null); a.hunger = 0;
  a.energy = 100; assert.equal(sim.nightRest(a), null); a.energy = 80;
  const m = sim.spawnMonster(1, 'slime', [a.x + 2, a.y]); assert.equal(sim.nightRest(a), null); m.hp = 0;
  const p = sim.spawnRaider([100, 80], 3, { raid: 'patrol', expiresAt: 9000 });
  assert(sim.nightRest(a), 'distant patrols must not keep the whole village awake');
  p.x = 39; p.y = 28; assert.equal(sim.nightRest(a), null);
}
{
  const { s, sim, a } = setup(); s.time.t = 25; a.home = null; a.gold = 60;
  place(s, 'weapon', 42, 19); place(s, 'inn', 32, 22); sim.rebuildGrid();
  s.unlocked = { woodSword: true }; a.job = 'warrior'; a.eq.weapon = null;
  const task = sim.nightRest(a); assert.equal(task.type, 'camp'); assert.equal(a.gold, 60);
  a.x = 70; a.y = 45;
  assert(sim.nightRest(a).dest, 'a camper outside town heads to village territory first');
}
console.log('night rest: dusk priorities, interrupted routine hunts, actual sleep, emergencies and gear savings passed');
