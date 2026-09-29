import assert from 'node:assert/strict';
import { newGame, maxHp, place } from '../js/state.js';
import { Sim } from '../js/sim.js';

function setup(job = 'warrior') {
  const s = newGame(4242), sim = new Sim(s), c = s.banditCamps[0], a = s.advs[0];
  Object.assign(c, { x: 100, y: 80 }); s.mons = []; s.advs = [a];
  Object.assign(a, { x: 105.4, y: 80, lv: 50, inside: null, dungeon: false, ko: false }); a.hp = maxHp(a, s);
  sim.grid.cost.fill(1);
  const m = sim.spawnRaider([104.5, 80], 8, { job, raid: 'campGuard', sourceCamp: c.id });
  return { s, sim, c, a, m };
}
for (const job of ['warrior', 'archer', 'mage']) {
  const { s, sim, a, m } = setup(job), hp = a.hp;
  sim.hitMonster(m, 1, a); sim.monStep(m);
  assert(a.hp < hp, job + ' must retaliate against an adjacent attacker outside the roaming circle');
  assert.equal(m.target, a.id);
  a.x = 108; a.hp = maxHp(a, s); const before = a.hp;
  for (let i = 0; i < 180 && a.hp === before; i++) { s.tick++; sim.monStep(m); }
  assert(a.hp < before, job + ' must pursue and attack within the camp defense area');
  a.x = 112; sim.monStep(m); assert.equal(m.target, null, 'do not chase beyond the defense area');
  for (let i = 0; i < 150; i++) { s.tick++; sim.monStep(m); }
  assert(Math.hypot(m.x - 100, m.y - 80) <= 5.001, 'return to the normal roaming area');
  assert(!sim.villageThreat(m), 'camp defense must not rally the village');
}
{
  const { s, sim, c, a, m } = setup();
  m.x = 96; a.x = 104; const hp = a.hp;
  for (let i = 0; i < 180 && a.hp === hp; i++) { s.tick++; sim.monStep(m); }
  assert(a.hp < hp, 'guard detects intruders anywhere inside its camp');
  m.x = 104; m.y = 80; m.target = null; m.path = null; a.x = 109;
  const partner = sim.spawnRaider([104.5, 80], 8, { job: 'warrior', raid: 'campGuard', sourceCamp: c.id });
  sim.hitMonster(partner, 1, a); sim.monStep(m);
  assert.equal(m.target, a.id, 'the second guard helps its attacked campmate');
  a.ko = true; sim.monStep(m); sim.monStep(partner);
  assert.equal(m.target, null); assert.equal(partner.target, null, 'guards release a knocked-out target');
}
{
  const { s, sim, a, m } = setup();
  a.x = 130; m.x = 113; m.path = null; m.target = a.id;
  for (let i = 0; i < 180; i++) { s.tick++; sim.monStep(m); }
  assert(Math.hypot(m.x - 100, m.y - 80) <= 5.001, 'an old displaced guard can path home');
}
{
  const { s, sim, a, m } = setup(); a.x = 109.9; a.y = 80.9;
  sim.hitMonster(m, 1, a); const hp = a.hp;
  for (let i = 0; i < 180 && a.hp === hp; i++) { s.tick++; sim.monStep(m); }
  assert(a.hp < hp, 'rounding an edge target outside the circle must not stall pursuit');
}
{
  const { s, sim, a, m } = setup(); s.advs = [];
  const b = place(s, 'tower', 107, 80); sim.rebuildGrid();
  sim.towerStep(); assert.equal(m.towerTarget, b.id);
  for (let i = 0; i < 180 && b.hp === 50; i++) { s.tick++; sim.monStep(m); }
  assert(b.hp < 50, 'guard retaliates against a tower just beyond the roaming circle');
}
console.log('camp guards: boundary retaliation, melee/ranged/magic pursuit, intrusion detection, campmate aid, return home and tower defense passed');
