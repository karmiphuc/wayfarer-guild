import assert from 'node:assert/strict';
import { ITEMS, MATS } from '../js/data.js';
import { newGame, migrate, maxHp } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { UI } from '../js/ui.js';

function setup() {
  const s = newGame(805), sim = new Sim(s), a = s.advs[0];
  s.stars = 5; s.gold = 50000; s.mons = []; s.advs = [a];
  s.mats = Object.fromEntries(Object.keys(MATS).map(k => [k, 1000]));
  const shop = { id: s.nextId++, type: 'item', x: 35, y: 25, lv: 1, occ: [], visits: 0, sales: 0 };
  s.buildings = [shop, { id: s.nextId++, type: 'smith', x: 40, y: 25, lv: 1, occ: [] }];
  Object.assign(a, { resident: true, job: 'warrior', persona: [], perks: [], gold: 10000, hunger: 0, energy: 100, fun: 100, potions: 3 });
  a.eq = { weapon: 'woodSword', armor: 'cloth', offhand: 'ironCap', acc: 'luckyCharm', blessing: null }; a.hp = maxHp(a, s);
  return { s, sim, a, shop };
}
{
  const { s, sim } = setup(), before = JSON.stringify([s.gold, s.mats]);
  s.stars = 4; assert(sim.develop('phoenixSigil')); assert.equal(JSON.stringify([s.gold, s.mats]), before);
  s.stars = 5; s.gold = 14999; assert(sim.develop('phoenixSigil')); assert(!s.unlocked.phoenixSigil);
  s.gold = 50000; s.mats.crystal = 499; assert(sim.develop('phoenixSigil')); assert.equal(s.gold, 50000);
  s.mats.crystal = 1000; assert.equal(sim.develop('phoenixSigil'), null);
  assert.equal(s.gold, 35000);
  for (const [k, n] of Object.entries(ITEMS.phoenixSigil.dev)) assert.equal(s.mats[k], 1000 - n);
  const paid = JSON.stringify([s.gold, s.mats]); assert(sim.develop('phoenixSigil')); assert.equal(JSON.stringify([s.gold, s.mats]), paid);
  delete s.unlocked.phoenixSigil;
  assert(!sim.merchantPool().includes('phoenixSigil'));
  for (const id of Object.keys(ITEMS)) if (id !== 'phoenixSigil') s.unlocked[id] = true;
  sim.treasure({ lv: 99, x: 1, y: 1 }, s.advs[0]); assert(!s.unlocked.phoenixSigil, 'research must not be bypassed by loot');
}
{
  const { s, sim, a, shop } = setup(), gear = structuredClone(a.eq);
  sim.settleVisit(a, shop, { buy: 'phoenixSigil' }); assert(!a.reviveCharge); assert.equal(a.gold, 10000);
  s.unlocked = { phoenixSigil: true };
  assert.equal(sim.decide(a).buy, 'phoenixSigil');
  a.gold = 9999; sim.settleVisit(a, shop, { buy: 'phoenixSigil' }); assert(!a.reviveCharge); assert.equal(a.gold, 9999);
  a.gold = 10000; sim.settleVisit(a, shop, { buy: 'phoenixSigil' });
  assert.equal(a.gold, 0); assert.equal(shop.sales, 10000); assert.equal(a.reviveCharge, true); assert.deepEqual(a.eq, gear);
  a.gold = 20000; sim.settleVisit(a, shop, { buy: 'phoenixSigil' }); assert.equal(a.gold, 20000); assert.notEqual(sim.decide(a).buy, 'phoenixSigil');
  const copy = migrate(JSON.parse(JSON.stringify(s))); assert.equal(copy.advs[0].reviveCharge, true);
  sim.R.chance = () => false;
  sim.hurtAdv(a, 999999, 'test'); assert.equal(a.hp, Math.round(maxHp(a, s) / 2)); assert(!a.ko); assert.equal(a.reviveCharge, false);
  assert.equal(migrate(JSON.parse(JSON.stringify(s))).advs[0].reviveCharge, false);
  sim.hurtAdv(a, 999999, 'test'); assert(a.ko); assert.equal(a.hp, 0);
}
{
  const { s, sim, a, shop } = setup(); s.unlocked = { phoenixSigil: true, woodSword: true };
  a.eq.weapon = null;
  s.buildings.push({ id: s.nextId++, type: 'weapon', x: 30, y: 25, lv: 1, occ: [] });
  sim.settleVisit(a, shop, { buy: 'phoenixSigil' }); assert(!a.reviveCharge); assert.equal(a.gold, 10000, 'basic gear savings come first');
}
{
  const { s, sim, a, shop } = setup(); s.unlocked.phoenixSigil = true; s.charter = 'market';
  const price = sim.shopPrice('phoenixSigil'); a.gold = price;
  sim.settleVisit(a, shop, { buy: 'phoenixSigil' }); assert.equal(a.gold, 0); assert.equal(shop.sales, price);
}
{
  const { s, sim, a } = setup(); a.reviveCharge = true; a.perks = ['undying']; sim.R.chance = () => false;
  sim.hurtAdv(a, 999999, 'test'); assert(a.revived); assert(a.reviveCharge, 'innate perk is used before the paid charge');
  sim.hurtAdv(a, 999999, 'test'); assert(!a.reviveCharge); assert(!a.ko);
  sim.hurtAdv(a, 999999, 'test'); assert(a.ko);
}
{
  const { s, sim, a } = setup(); a.reviveCharge = true; a.dungeon = true; a.potions = 0;
  const q = { id: 99, kind: 'dungeon', zone: 4, ft: 6, floor: 0, floors: 99, t: 70, spot: [35, 25], members: [a.id] };
  s.activeQuests = [q]; sim.R.range = () => 1; sim.gainXp = () => {};
  sim.dungeonTick(q, [a]); assert(!a.ko); assert(!a.reviveCharge); assert.equal(a.hp, Math.round(maxHp(a, s) / 2));
  q.ft = 6; sim.dungeonTick(q, [a]); assert(a.ko);
}
{
  const { s, sim, a } = setup(); delete a.reviveCharge; migrate(s); assert.equal(a.reviveCharge, false);
  const once = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), once);
  a.reviveCharge = true; const ui = Object.create(UI.prototype); ui.game = { s, sim }; ui.devTab = 'item';
  assert(ui.inspAdv(a).includes('1 charge ready')); assert(ui.panel_develop().includes('One stored charge per pawn'));
}
console.log('resurrection: paid research, autonomous single-charge purchases, reserves, field/cave revival, perk priority and persistence passed');
