import assert from 'node:assert/strict';
import { newGame, migrate, place, buildingMaxHp } from '../js/state.js';
import { Sim } from '../js/sim.js';

function setup() {
  const s = newGame(4242); s.mons = []; s.advs = []; s.gold = 10000;
  const b = place(s, 'tower', 40, 34), sim = new Sim(s);
  return { s, b, sim };
}
for (const kind of ['wild', 'stampede', 'melee', 'ranged', 'caster', 'boss']) {
  const { s, b, sim } = setup();
  const m = kind === 'boss' ? sim.spawnBoss('giantSlime', [44, 34]) : ['wild', 'stampede'].includes(kind) ? sim.spawnMonster(1, 'slime', [44, 34], kind === 'stampede' ? { raid: 'stampede', charge: true } : {}) : sim.spawnRaider([44, 34], 8, { job: kind === 'melee' ? 'warrior' : kind === 'ranged' ? 'archer' : 'mage', raid: 'patrol', expiresAt: 10000 });
  m.hp = m.mhp = 10000; m.atk = 20; m.mag = 20;
  const gold = s.gold, safe = s.traits.Safe;
  for (let i = 0; i < 1200 && s.buildings.includes(b); i++) { s.tick++; sim.monStep(m); sim.towerStep(); }
  assert(!s.buildings.includes(b), kind + ' must destroy the tower');
  assert.equal(s.gold, gold, 'destruction gives no demolition refund');
  assert(s.traits.Safe < safe); assert(sim.grid.walkable(b.x, b.y)); assert.equal(m.towerTarget, null);
  const hp = m.hp; s.tick = 1200; sim.towerStep(); assert.equal(m.hp, hp, 'destroyed tower stops firing');
}
{
  const { s, b, sim } = setup();
  const m = sim.spawnRaider([46, 34], 8, { job: 'warrior' }); m.hp = 10000;
  sim.towerStep(); assert.equal(m.towerTarget, b.id); assert.equal(m.target, null, 'tower must not blame an unrelated pawn');
  sim.hitMonster(m, 1, { id: 123, dead: false }); assert.equal(m.target, 123); assert.equal(m.towerTarget, null);
  b.hp = 20; sim.upgrade(b); assert.equal(b.hp, 45); assert.equal(buildingMaxHp(b), 75);
  const loaded = migrate(JSON.parse(JSON.stringify(s))); assert.equal(loaded.buildings.find(o => o.id === b.id).hp, 45);
  const overCap = JSON.parse(JSON.stringify(s)); overCap.buildings.find(o => o.id === b.id).hp = 110; migrate(overCap);
  assert.equal(overCap.buildings.find(o => o.id === b.id).hp, 75, 'old over-cap health is clamped');
  const damaged = JSON.parse(JSON.stringify(s)); damaged.buildings.find(o => o.id === b.id).hp = 10; migrate(damaged);
  assert.equal(damaged.buildings.find(o => o.id === b.id).hp, 10, 'existing tower damage is preserved');
  const old = JSON.parse(JSON.stringify(s)); delete old.buildings.find(o => o.id === b.id).hp; migrate(old);
  assert.equal(old.buildings.find(o => o.id === b.id).hp, 75);
  const once = JSON.stringify(old); migrate(old); assert.equal(JSON.stringify(old), once);
}
{
  const { s, b, sim } = setup();
  for (let x = 39; x <= 42; x++) for (const y of [33, 35]) place(s, 'palisade', x, y);
  for (const x of [39, 42]) place(s, 'palisade', x, 34);
  sim.rebuildGrid(); const m = sim.spawnRaider([44, 34], 1, { job: 'warrior' }); m.towerTarget = b.id;
  for (let i = 0; i < 100; i++) { s.tick++; sim.monStep(m); }
  assert.equal(b.hp, 50, 'melee enemies cannot hit through a sealed wall');
  assert(m.x >= 43, 'cannot walk through palisades');
}
{
  const { s, b, sim } = setup();
  const c = s.banditCamps[0], m = sim.spawnRaider([b.x + 2, b.y], 1, { raid: 'campGuard', sourceCamp: c.id, towerTarget: b.id });
  sim.monStep(m); assert.equal(b.hp, 50, 'camp guards keep their camp leash');
  sim.demolish(b); sim.monStep(m); assert(!s.buildings.includes(b));
  assert(s.buildings.filter(o => o.type !== 'tower').every(o => o.hp === undefined));
}
console.log('towers: hostile melee/ranged/magic/boss attacks, retaliation, destruction, routing, guard leash, upgrades and save migration passed');
