import assert from 'node:assert/strict';
import { FAC, ITEMS } from '../js/data.js';
import { makeAdventurer, maxHp, newGame } from '../js/state.js';
import { Sim } from '../js/sim.js';

function setup(job = 'warrior', seed = 20260927) {
  const s = newGame(seed);
  s.buildings = []; s.advs = []; s.mons = []; s.unlocked = {};
  const sim = new Sim(s, {}), a = makeAdventurer(s, sim.R, job);
  Object.assign(a, { resident: true, x: 38, y: 28, gold: 1000, hunger: 0, energy: 100, fun: 100, persona: [], potions: 3 });
  a.eq = { weapon: null, armor: null, acc: null }; a.hp = maxHp(a, s); s.advs.push(a);
  return { s, sim, a };
}

function add(s, type, x = 30, y = 30) {
  const b = { id: s.nextId++, type, x, y, lv: 1, sales: 0, visits: 0, occ: [] };
  s.buildings.push(b); return b;
}

// Residents fill empty slots with the cheapest usable stock before considering a stronger upgrade.
{
  const { s, sim, a } = setup();
  const weapon = add(s, 'weapon'), armor = add(s, 'armor'), item = add(s, 'item');
  Object.assign(s.unlocked, { ironSword: true, luckyCharm: true, woodSword: true, cloth: true });
  assert.deepEqual(sim.basicGearNeeds(a).map(g => g.id), ['cloth', 'woodSword', 'luckyCharm']);
  assert.deepEqual(sim.decide(a), { type: 'visit', b: armor.id, dur: 4, buy: 'cloth' });
  a.eq.armor = 'cloth';
  assert.equal(sim.decide(a).buy, 'woodSword');
  a.eq.weapon = 'woodSword';
  const charm = sim.decide(a);
  assert.equal(charm.buy, 'luckyCharm'); assert([armor.id, item.id].includes(charm.b));

  a.eq = { weapon: 'woodSword', armor: null, acc: 'luckyCharm' };
  assert.equal(sim.bestGearFor(a).id, 'ironSword');
  assert.equal(sim.decide(a).buy, 'cloth', 'an upgrade displaced missing basic armor');
  assert.equal(weapon.type, 'weapon');
}

// Item Shops stock unlocked accessories; bow specialists prioritize a bow over cheaper melee stock.
{
  const one = setup(), item = add(one.s, 'item');
  one.a.eq.weapon = 'woodSword'; one.a.eq.armor = 'cloth'; one.s.unlocked.luckyCharm = true;
  assert.deepEqual(one.sim.basicGearNeeds(one.a).map(g => g.id), ['luckyCharm']);
  assert.deepEqual(one.sim.decide(one.a), { type: 'visit', b: item.id, dur: 4, buy: 'luckyCharm' });

  const two = setup('archer'); add(two.s, 'weapon');
  Object.assign(two.s.unlocked, { woodSword: true, shortBow: true });
  assert.deepEqual(two.sim.basicGearNeeds(two.a).map(g => g.id), ['shortBow']);
  assert.equal(two.sim.decide(two.a).buy, 'shortBow');
}

// A poor resident keeps basic-gear savings instead of repeatedly buying optional meals, lessons or potions.
{
  const { s, sim, a } = setup();
  add(s, 'weapon'); add(s, 'food'); add(s, 'dojo'); add(s, 'item');
  s.unlocked.woodSword = true; s.unlocked.potion = true;
  Object.assign(a, { gold: 55, hunger: 55, potions: 0 });
  for (let i = 0; i < 40; i++) assert.notEqual(sim.decide(a).type, 'visit');
}

// Urgent needs can use savings. While saving, food choice favours the cheapest filling meal and home rest stays free/preferred.
{
  const { s, sim, a } = setup();
  add(s, 'weapon'); const food = add(s, 'food'), bakery = add(s, 'bakery'), tavern = add(s, 'tavern');
  s.unlocked.woodSword = true;
  Object.assign(a, { gold: 60, hunger: 90, persona: ['glutton'] }); s.happen = [{ id: 'rain', weeks: 1, data: {} }];
  const meal = sim.decide(a);
  assert.deepEqual(meal, { type: 'visit', b: food.id, dur: 5 });
  assert(sim.visitPrice(a, food) < sim.visitPrice(a, bakery));
  assert(sim.visitPrice(a, bakery) < sim.visitPrice(a, tavern));

  a.hunger = 0; a.energy = 10; const home = add(s, 'house'); a.home = home.id;
  assert.deepEqual(sim.decide(a), { type: 'visit', b: home.id, dur: 12, sleep: true });

  a.home = null; a.energy = 100; a.hp = maxHp(a, s) * 0.2; const shrine = add(s, 'shrine');
  assert.deepEqual(sim.decide(a), { type: 'visit', b: shrine.id, dur: 4 });
}

// Budgeting uses the same sale, village bonus, royal aura, rain and personality multipliers as checkout.
{
  const { s, sim, a } = setup();
  const weapon = add(s, 'weapon'), food = add(s, 'food');
  s.unlocked.woodSword = true; s.charter = 'market'; s.frontier.completed.frostveil = true;
  s.events = [{ id: 'sale', weeks: 1 }]; s.happen = [{ id: 'rain', weeks: 1, data: {} }]; a.persona = ['glutton'];
  const royal = makeAdventurer(s, sim.R, 'royal'); royal.resident = true; royal.perks = ['royalaura']; s.advs.push(royal);
  const gearCost = Math.round(ITEMS.woodSword.price * 1.23 * 1.5 * 1.08);
  assert.equal(sim.shopPrice('woodSword'), gearCost);
  assert.equal(sim.visitPrice(a, food), Math.round(sim.price(food) * 1.6 * 1.08 * 1.25));
  a.gold = gearCost; sim.settleVisit(a, weapon, { buy: 'woodSword' });
  assert.equal(a.eq.weapon, 'woodSword'); assert.equal(a.gold, 0); assert.equal(weapon.sales, gearCost);

  a.eq.weapon = null; a.gold = gearCost - 1; sim.settleVisit(a, weapon, { buy: 'woodSword' });
  assert.equal(a.eq.weapon, null); assert.equal(a.gold, gearCost - 1);
}

// Stale optional visits respect reserves; a class change no longer prevents a planned weapon purchase.
{
  const { s, sim, a } = setup();
  const weapon = add(s, 'weapon'), dojo = add(s, 'dojo');
  Object.assign(s.unlocked, { woodSword: true, ironSword: true }); a.gold = 70;
  const beforeXp = a.jobXp; sim.settleVisit(a, dojo, { train: true });
  assert.equal(a.gold, 70); assert.equal(a.jobXp, beforeXp);

  a.job = 'archer'; a.gold = 1000; sim.settleVisit(a, weapon, { buy: 'woodSword' });
  assert.equal(a.eq.weapon, 'woodSword'); assert.equal(a.gold, 1000 - sim.shopPrice('woodSword'));
}

// Non-preferred stock still fills an empty slot, and raids take priority over shopping.
{
  const { s, sim, a } = setup('archer');
  add(s, 'weapon'); s.unlocked.woodSword = true;
  assert.equal(sim.basicGearNeeds(a)[0].id, 'woodSword');
  for (let i = 0; i < 100; i++) assert(sim.decide(a)?.type);

  s.unlocked.shortBow = true; a.gold = 1000;
  s.mons.push({ id: s.nextId++, raid: 'bandits', hp: 10, x: 80, y: 20 });
  const task = sim.decide(a);
  assert.equal(task.type, 'hunt'); assert.equal(task.defend, true);
}

// Rest delivered during a visit still gets paid; free home rest is never blocked by a gear reserve.
{
  const { s, sim, a } = setup();
  add(s, 'weapon'); s.unlocked.woodSword = true;
  const inn = add(s, 'inn'), home = add(s, 'house');
  a.gold = 55; a.energy = 10;
  const task = sim.decide(a);
  assert.equal(task.b, inn.id);
  a.inside = { b: inn.id, t: 12, task }; inn.occ = [a.id];
  const bill = sim.visitPrice(a, inn);
  for (let i = 0; a.inside && i < 130; i++) sim.insideStep(a);
  assert.equal(a.inside, null); assert.equal(a.gold, 55 - bill); assert.equal(inn.sales, bill);
  a.home = home.id; a.gold = 0; const sat = a.sat;
  sim.settleVisit(a, home, { sleep: true });
  assert.equal(a.gold, 0); assert(a.sat > sat);
}

console.log('economy: resident basics, reserve and exact-price checks passed');
