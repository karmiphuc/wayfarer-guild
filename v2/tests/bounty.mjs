import assert from 'node:assert/strict';
import { newGame, migrate, maxHp, spawnAdventurer } from '../js/state.js';
import { Sim, DT, WEEK_SECONDS } from '../js/sim.js';

const week = WEEK_SECONDS / DT;
function setup(seed = 4242) {
  const s = newGame(seed), sim = new Sim(s);
  s.gold = 10000; s.mons = [];
  while (s.advs.length < 5) spawnAdventurer(s, sim.R, { x: 38, y: 34 });
  for (const a of s.advs) Object.assign(a, { x: 38, y: 34, hp: maxHp(a, s), energy: 100, hunger: 0, task: null, inside: null });
  return { s, sim };
}
{
  const { s, sim } = setup(), copy = setup();
  assert.equal(sim.placeBounty(38, 34), null); assert.equal(copy.sim.placeBounty(38, 34), null);
  assert.deepEqual(s.bounty, copy.s.bounty); assert.equal(s.gold, 9500);
  assert(s.bounty.members.length >= 2 && s.bounty.members.length <= 4);
  assert.equal(s.bounty.expiresAt, s.tick + 2 * week);
  assert(!sim.questCandidates().some(a => s.bounty.members.includes(a.id)));
  const seed = s.seed; assert(sim.placeBounty(70, 50)); assert.equal(s.gold, 9500); assert.equal(s.seed, seed);
  const saved = migrate(JSON.parse(JSON.stringify(s))), loaded = new Sim(saved);
  assert.deepEqual(saved.bounty, s.bounty);
  saved.tick = saved.bounty.expiresAt - 1; loaded.updateBounty(); assert(saved.bounty);
  const ids = saved.bounty.members.slice(); saved.tick++; loaded.updateBounty(); assert.equal(saved.bounty, null);
  assert(ids.every(id => saved.advs.find(a => a.id === id).task.type === 'return'));
}
for (const block of ['gold', 'health', 'rescue', 'rest', 'blocked', 'outside']) {
  const { s, sim } = setup();
  if (block === 'gold') s.gold = 499;
  if (block === 'health') for (const a of s.advs.slice(1)) a.hp = 1;
  if (block === 'rescue') for (const a of s.advs.slice(1)) a.task = { type: 'rescue' };
  if (block === 'rest') for (const a of s.advs.slice(1)) a.task = { type: 'visit', sleep: true };
  if (block === 'blocked') sim.grid.cost.fill(0);
  const gold = s.gold, seed = s.seed;
  assert(sim.placeBounty(block === 'outside' ? -1 : 38, 34), block);
  assert.equal(s.gold, gold); assert.equal(s.seed, seed); assert.equal(s.bounty, null);
}
{
  const { s, sim } = setup();
  assert.equal(sim.placeBounty(100, 80), null, 'outside town is allowed');
  const a = s.advs.find(a => sim.bountyForPawn(a.id));
  a.hp = 1; a.potions = 1; sim.advStep(a); assert(a.hp > 1); assert.equal(a.potions, 0); assert(sim.bountyForPawn(a.id));
  a.hp = 1; sim.advStep(a); assert.equal(a.task.type, 'return'); assert(!sim.bountyForPawn(a.id));
  for (const a of s.advs) if (sim.bountyForPawn(a.id)) a.ko = true;
  sim.updateBounty(); assert.equal(s.bounty, null, 'lost party releases the one-flag limit');
}
{
  const { s, sim } = setup();
  sim.grid.cost.fill(1); sim.placeBounty(38, 34);
  const a = s.advs.find(a => sim.bountyForPawn(a.id));
  sim.advStep(a); assert(a.task.arrived);
  const foe = sim.spawnRaider([39, 34], 1, { raid: 'patrol' });
  const hp = foe.hp; a.cool = 0; sim.advStep(a); assert(foe.hp < hp, 'patrol attacks nearby stragglers');
  foe.x = 44; foe.y = 34; const untouched = foe.hp;
  for (let i = 0; i < 200; i++) { s.tick++; sim.advStep(a); assert(Math.hypot(a.x - 38, a.y - 34) <= 5.001, 'no chasing outside circle'); }
  assert.equal(foe.hp, untouched);
  sim.endBounty(); assert.equal(s.bounty, null); assert.equal(a.task.type, 'return');
}
{
  const picks = new Set();
  for (let seed = 1; seed <= 12; seed++) { const { s, sim } = setup(seed); sim.placeBounty(38, 34); picks.add(s.bounty.members.map(id => s.advs.findIndex(a => a.id === id)).join(',')); }
  assert(picks.size > 3, 'selection varies instead of choosing veterans');
}
{
  const { s, sim } = setup(), killer = s.advs[0]; s.advs = [];
  sim.campGuards(); assert.equal(s.mons.length, 32);
  for (let i = 0; i < 100; i++) sim.campGuards(); assert.equal(s.mons.length, 32, 'two per camp, no accumulation');
  const c = s.banditCamps[0], guards = s.mons.filter(m => m.sourceCamp === c.id);
  for (let i = 0; i < 600; i++) { s.tick++; for (const m of guards) { sim.monStep(m); assert(Math.hypot(m.x - c.x, m.y - c.y) <= 5.001); } }
  assert(guards.every(m => m.job && !sim.villageThreat(m)));
  const m = guards[0]; sim.killMonster(m, killer); const count = s.mons.length;
  sim.campGuards(); assert.equal(s.mons.length, count, 'no instant guard replacement');
  s.tick = c.guardAt; sim.campGuards(); assert.equal(s.mons.filter(m => m.sourceCamp === c.id && m.hp > 0).length, 2);
  c.readyAt = s.tick + 8 * week; sim.campGuards(); assert(s.mons.filter(m => m.sourceCamp === c.id).every(m => m.hp === 0));
  s.tick = c.readyAt; sim.campGuards(); assert.equal(s.mons.filter(m => m.sourceCamp === c.id && m.hp > 0).length, 2);
  s.activeQuests.push({ camp: c.id, members: [] }); sim.campGuards(); assert(s.mons.filter(m => m.sourceCamp === c.id).every(m => m.hp === 0));
}
{
  const s = newGame(17); delete s.bounty; for (const c of s.banditCamps) delete c.guardAt;
  migrate(s); assert.equal(s.bounty, null); assert(s.banditCamps.every(c => c.guardAt === 0));
  const once = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), once);
}
console.log('bounty: random parties, cost, health, availability, expiry, patrol combat/leash, save migration and bounded camp guards passed');
