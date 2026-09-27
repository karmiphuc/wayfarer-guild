import assert from 'node:assert/strict';
import { ITEMS, JOBS, SHOP_SLOTS } from '../js/data.js';
import { newGame, migrate, makeAdventurer, gearSum, maxHp } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { UI } from '../js/ui.js';

for (const id of ['buckler', 'ironHelm', 'kiteShield', 'hornHelm', 'bronzeShield', 'aegis']) {
  const s = newGame(2026), a = s.advs[0];
  delete a.eq.offhand; a.eq.armor = id;
  const before = gearSum(a, 'def');
  migrate(s);
  assert.equal(a.eq.armor, null); assert.equal(a.eq.offhand, id);
  assert.equal(gearSum(a, 'def'), before, 'migration must not duplicate or lose old armor stats');
  const once = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), once);
}
{
  const s = newGame(2026), a = s.advs[0];
  a.eq.armor = 'dragonMail'; a.eq.offhand = 'aegis'; a.eq.acc = 'luckyCharm';
  migrate(s);
  assert.equal(a.eq.armor, 'dragonMail'); assert.equal(a.eq.offhand, 'aegis');
  assert.equal(gearSum(a, 'def'), 56); assert.equal(gearSum(a, 'hp'), 70);
  assert.equal(gearSum(a, 'crit'), 0.05);
  assert(s.unlocked.ironCap, 'starter head protection is stocked in old and new saves');
}
{
  const s = newGame(2026), sim = new Sim(s), a = s.advs[0];
  a.resident = true; a.gold = 500; a.eq = { weapon: 'woodSword', armor: 'cloth', acc: null, offhand: null };
  const shop = { id: s.nextId++, type: 'armor', x: 30, y: 30, lv: 1, occ: [], sales: 0, visits: 0 };
  s.buildings.push(shop); s.unlocked = { cloth: true, ironCap: true, luckyCharm: true };
  assert.equal(sim.basicGearNeeds(a)[0].id, 'ironCap');
  sim.settleVisit(a, shop, { buy: 'ironCap' });
  assert.equal(a.eq.offhand, 'ironCap'); assert.equal(a.eq.armor, 'cloth');
  sim.settleVisit(a, shop, { buy: 'luckyCharm' });
  assert.equal(a.eq.acc, 'luckyCharm'); assert.equal(a.eq.offhand, 'ironCap');
  assert(SHOP_SLOTS.armor.includes('offhand'));
  const ui = Object.create(UI.prototype); ui.game = { s, sim };
  ui.devTab = 'offhand'; const html = ui.panel_develop();
  assert(html.includes('Iron Cap')); assert(!html.includes('Traveler Garb'));
  assert(ui.inspAdv(a).includes('Helm / shield'));
}
// Every tier-3 path leads onward; new promotions are legal only after their prerequisites are mastered.
for (const [id, j] of Object.entries(JOBS)) {
  if (j.tier === 3) assert(Object.values(JOBS).some(next => next.tier === 4 && next.req?.includes(id)), `${id} has no tier-4 successor`);
}
for (const id of ['ranger', 'sharpshooter', 'shogun', 'grandmaster', 'empress', 'sovereign', 'nightblade', 'warden']) {
  const s = newGame(2026), sim = new Sim(s), a = makeAdventurer(s, sim.R, 'villager');
  a.resident = true; a.jobLv.villager = 10; s.advs.push(a); s.tp = 1000;
  assert(sim.canChangeJob(a, id), `${id} ignored its prerequisites`);
  for (const req of JOBS[id].req) a.jobLv[req] = 10;
  assert.equal(sim.canChangeJob(a, id), null); assert.equal(sim.changeJob(a, id), null);
  assert.equal(a.job, id); assert(a.hp <= maxHp(a, s));
  a.jobLv[id] = 9; a.jobXp = 154; sim.gainXp(a, 10, true);
  assert.equal(a.jobLv[id], 10); assert(a.perks.includes(JOBS[id].perk));
  assert.equal(sim.changeJob(a, 'villager'), null);
  assert(a.perks.includes(JOBS[id].perk), 'mastery perk must survive a later class change');
}
console.log('equipment: independent armor slots, save migration, shop priorities and complete class paths passed');
