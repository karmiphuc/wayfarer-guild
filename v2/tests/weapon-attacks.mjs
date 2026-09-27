import assert from 'node:assert/strict';
import { JOBS } from '../js/data.js';
import { makeAdventurer, maxHp, newGame, stat } from '../js/state.js';
import { Sim } from '../js/sim.js';

function setup(job = 'archer', weapon = 'woodSword') {
  const s = newGame(6401); s.buildings = []; s.advs = []; s.mons = []; s.unlocked = {};
  const sim = new Sim(s), a = makeAdventurer(s, sim.R, job);
  Object.assign(a, { resident: true, x: 38, y: 28, lv: 20, cool: 0, energy: 100, hunger: 0, fun: 100,
    gold: 10000, persona: [], perks: [], partner: null, potions: 3 });
  a.eq = { weapon, armor: 'cloth', offhand: 'ironCap', acc: 'luckyCharm' };
  a.hp = maxHp(a, s); s.advs = [a]; s.fx = []; s.time.t = 0;
  sim.R.range = () => 1; sim.R.chance = () => false;
  return { s, sim, a };
}
function add(s, type) {
  const b = { id: s.nextId++, type, x: 30, y: 30, lv: 1, sales: 0, visits: 0, occ: [] };
  s.buildings.push(b); return b;
}
const bowJobs = ['scout', 'archer', 'ranger', 'sharpshooter', 'warden'];

// Equipment determines physical attacks for every class; only innate attacks survive empty hands.
for (const job of bowJobs) {
  const { sim, a } = setup(job);
  assert.deepEqual(sim.attackProfile(a), { range: 1, magic: false, projectile: null }, job + ' sword');
  a.eq.weapon = null;
  assert.deepEqual(sim.attackProfile(a), { range: 1, magic: false, projectile: null }, job + ' empty hands');
  a.eq.weapon = 'shortBow';
  assert.deepEqual(sim.attackProfile(a), { range: Math.max(3, JOBS[job].range), magic: false, projectile: 'arrow' }, job + ' bow');
}
for (const job of Object.keys(JOBS)) {
  const { sim, a } = setup(job, 'longBow'), p = sim.attackProfile(a);
  assert.equal(p.projectile, 'arrow', job); assert.equal(p.magic, false, job);
  assert.equal(p.range, bowJobs.includes(job) ? Math.max(3, JOBS[job].range) : 3, job);
}
for (const job of ['ninja', 'assassin', 'nightblade', 'bomber', 'tengu']) {
  const { sim, a } = setup(job);
  for (const weapon of ['woodSword', null]) {
    a.eq.weapon = weapon;
    assert.deepEqual(sim.attackProfile(a), { range: JOBS[job].range, magic: false, projectile: 'shuriken' }, job);
  }
}
for (const job of ['mage', 'monk', 'shaman', 'onmyoji', 'royal', 'empress', 'demon', 'spirit']) {
  const { sim, a } = setup(job);
  assert.deepEqual(sim.attackProfile(a), { range: JOBS[job].range, magic: true, projectile: 'fire' }, job);
}
for (const weapon of ['spear', 'trident', 'whip']) {
  const { sim, a } = setup('warrior', weapon);
  assert.deepEqual(sim.attackProfile(a), { range: 2, magic: false, projectile: null });
  a.perks = ['eagleeye', 'deadeye'];
  assert.deepEqual(sim.attackProfile(a), { range: 4, magic: false, projectile: null });
}

// Real hits use the profile's range, damage stat and visual, not the old class-only rules.
for (const [job, weapon, distance, hit, projectile, magic, perks] of [
  ['archer', 'woodSword', 3, false, null, false, []],
  ['archer', null, 0.8, true, null, false, []],
  ['warrior', 'shortBow', 3, true, 'arrow', false, []],
  ['ninja', 'woodSword', 2.8, true, 'shuriken', false, []],
  ['mage', 'woodSword', 2.8, true, 'fire', true, []],
  ['mage', 'shortBow', 2.8, true, 'arrow', false, []],
  ['warrior', 'woodSword', 2.8, true, null, false, ['eagleeye', 'deadeye']],
]) {
  const { s, sim, a } = setup(job, weapon); a.perks = perks;
  const m = { id: 999, x: a.x + distance, y: a.y, hp: 10000, mhp: 10000, def: 4 };
  let approaches = 0; sim.walkTo = () => { approaches++; return true; };
  sim.fight(a, m);
  if (!hit) { assert.equal(m.hp, 10000); assert.equal(approaches, 1); assert.equal(s.fx.length, 0); continue; }
  const normal = Math.max(1, Math.round((magic ? stat(a, 'mag', s) * 1.25 : stat(a, 'atk', s)) - 2));
  assert.equal(10000 - m.hp, sim.weaponMatch(a) ? Math.round(normal * 1.1) : normal, job + ' damage');
  assert.equal(a.cool, 1.1 / (JOBS[job].spd + (sim.weaponMatch(a) ? 1 : 0)));
  assert.equal(s.fx.find(f => f.k === 'proj')?.p || null, projectile, job + ' visual');
  assert.equal(s.fx.some(f => f.k === 'slash'), projectile === null);
}

// Defense uses equipped reach, and retaliation preserves the pawn's interrupted routine.
for (const [job, weapon, hits] of [['warrior', 'shortBow', true], ['archer', 'woodSword', false]]) {
  const { s, sim, a } = setup(job, weapon);
  const m = sim.spawnRaider([41, 28], 3, { raid: 'bandits', job: 'archer' });
  let attacks = 0, walks = 0; sim.fight = () => { attacks++; }; sim.walkTo = () => { walks++; };
  sim.defendStep(a, { type: 'hunt', defend: true });
  assert.equal(attacks, hits ? 1 : 0); assert.equal(walks, hits ? 0 : 1);
  assert(s.mons.includes(m));
}
{
  const { s, sim, a } = setup('warrior', 'shortBow');
  a.task = { type: 'camp', dur: 30 }; const task = a.task;
  const m = sim.spawnRaider([41, 28], 3, { raid: 'patrol', job: 'archer', target: a.id, expiresAt: s.tick + 500 });
  const hp = m.hp; sim.advStep(a);
  assert(m.hp < hp); assert.equal(a.task, task); assert(s.fx.some(f => f.k === 'proj' && f.p === 'arrow'));
}

// Human raider sprites (especially Bow2) obey the same profile without trusting stale saved range.
for (const [job, weapon, range, projectile] of [
  ['archer', 'Sword', 1, null], ['archer', 'Bow2', 4, 'arrow'],
  ['warrior', 'Bow2', 3, 'arrow'], ['knight', 'Lance', 2, null],
  ['mage', 'Bow2', 3, 'arrow'], ['ninja', 'Ninjaku', 3, 'shuriken'],
]) {
  const { s, sim, a } = setup('warrior');
  const m = sim.spawnRaider([40, 28], 8, { raid: 'bandits', job, target: a.id });
  Object.assign(m, { weapon, range: 99, cd: 0, delay: 0 });
  assert.deepEqual(sim.attackProfile(m), { range, magic: false, projectile });
  const hp = a.hp; sim.monStep(m);
  if (range === 1) assert.equal(a.hp, hp, 'sword raider must approach first');
  else {
    assert(a.hp < hp, job + ' raider must hit at equipped range');
    assert.equal(s.fx.find(f => f.k === 'proj')?.p || null, projectile);
  }
}

// A needed bow outranks cheaper empty armor and stronger melee gear, then stays equipped.
for (const job of bowJobs) {
  const { s, sim, a } = setup(job, 'dragonSlayer'), shop = add(s, 'weapon'); add(s, 'armor');
  Object.assign(s.unlocked, { shortBow: true, longBow: true, dragonSlayer: true, cloth: true });
  a.eq.armor = null;
  assert.equal(sim.basicGearNeeds(a)[0].id, 'shortBow', job);
  const task = sim.decide(a); assert.equal(task.buy, 'shortBow', job);
  sim.settleVisit(a, shop, task); assert.equal(a.eq.weapon, 'shortBow');
  a.eq.armor = 'cloth';
  assert.equal(sim.bestGearFor(a).id, 'longBow');
  sim.settleVisit(a, shop, { buy: 'longBow' });
  for (let i = 0; i < 10; i++) assert.equal(sim.bestGearFor(a), null, 'no switching back to a stronger sword');
  const gold = a.gold; sim.settleVisit(a, shop, { buy: 'dragonSlayer' });
  assert.equal(a.eq.weapon, 'longBow', 'stale melee purchase must not undo the bow preference'); assert.equal(a.gold, gold);
  delete s.unlocked.shortBow; delete s.unlocked.longBow;
  assert.equal(sim.bestGearFor(a), null, 'an equipped bow is retained even when bow stock disappears');
}

// Missing shop or locked bows retain the normal fallback; newly stocked bows are reconsidered.
{
  const { s, sim, a } = setup(); s.unlocked.shortBow = true;
  assert.equal(sim.basicGearNeeds(a).length, 0, 'no imaginary shop reserve');
  const shop = add(s, 'weapon'); delete s.unlocked.shortBow; s.unlocked.woodSword = true;
  assert.equal(sim.basicGearNeeds(a).length, 0); assert.equal(a.eq.weapon, 'woodSword');
  a.eq.weapon = null; assert.equal(sim.basicGearNeeds(a)[0].id, 'woodSword');
  sim.settleVisit(a, shop, { buy: 'woodSword' });
  s.unlocked.shortBow = true; assert.equal(sim.basicGearNeeds(a)[0].id, 'shortBow');
  s.tp = 1000; a.jobLv.warrior = 10;
  assert.equal(sim.changeJob(a, 'warrior'), null); assert.equal(a.eq.weapon, 'woodSword');
  assert.equal(sim.basicGearNeeds(a).length, 0, 'leaving bow class clears its special reserve');
  assert.equal(sim.changeJob(a, 'archer'), null); assert.equal(sim.basicGearNeeds(a)[0].id, 'shortBow');
}
for (const job of ['ninja', 'mage']) {
  const { s, sim, a } = setup(job); add(s, 'weapon'); s.unlocked.shortBow = true;
  assert.equal(sim.basicGearNeeds(a).length, 0, job + ' must not save for an unnecessary bow');
}

// Saving covers a replacement bow, including stale optional visits and urgent exceptions.
{
  const { s, sim, a } = setup(), shop = add(s, 'weapon'), food = add(s, 'food'), shrine = add(s, 'shrine'), inn = add(s, 'inn');
  add(s, 'dojo'); add(s, 'item'); Object.assign(s.unlocked, { shortBow: true, potion: true });
  a.gold = sim.shopPrice('shortBow') - 1; a.hunger = 55; a.potions = 0;
  for (let i = 0; i < 20; i++) assert.notEqual(sim.decide(a).type, 'visit', 'optional spending consumed bow savings');
  const gold = a.gold; sim.settleVisit(a, food, {}); assert.equal(a.gold, gold);
  sim.settleVisit(a, shop, { buy: 'shortBow' }); assert.equal(a.eq.weapon, 'woodSword'); assert.equal(a.gold, gold);
  a.hunger = 90; assert.equal(sim.decide(a).b, food.id);
  sim.settleVisit(a, food, {}); assert(a.gold < gold, 'urgent food can use reserved gold');
  a.hunger = 0; a.energy = 10; assert.equal(sim.decide(a).b, inn.id);
  a.energy = 100; a.hp = maxHp(a, s) * 0.2; assert.equal(sim.decide(a).b, shrine.id);
  a.hp = maxHp(a, s); a.gold = sim.shopPrice('shortBow');
  sim.settleVisit(a, shop, { buy: 'shortBow' }); assert.equal(a.eq.weapon, 'shortBow'); assert.equal(a.gold, 0);
  assert.equal(sim.basicGearNeeds(a).length, 0);
}

console.log('weapon attacks: equipment range, innate abilities, visuals, damage, defense, raiders and bow shopping passed');
