import assert from 'node:assert/strict';
import { FRONTIERS, ITEMS } from '../js/data.js';
import { newGame, migrate, gearSum, maxHp } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { UI } from '../js/ui.js';

// Every legacy assigned accessory migrates once, retaining its owner and exact stat contribution.
for (const f of FRONTIERS) {
  const s = newGame(412), [a, b] = s.advs;
  a.resident = b.resident = true;
  s.frontier.completed[f.id] = true; s.frontier.relics[f.relic] = a.id;
  delete a.eq.blessing; a.eq.acc = f.relic;
  b.eq.blessing = f.relic; b.eq.acc = 'heroCrest'; // reject an unowned duplicate
  const before = ['hp', 'atk', 'def', 'mag', 'spd', 'crit'].map(k => gearSum(a, k));
  migrate(s);
  assert.equal(a.eq.blessing, f.relic); assert.equal(a.eq.acc, null);
  assert.equal(b.eq.blessing, null); assert.equal(b.eq.acc, 'heroCrest');
  assert.deepEqual(['hp', 'atk', 'def', 'mag', 'spd', 'crit'].map(k => gearSum(a, k)), before);
  const once = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), once);
}
{
  const s = newGame(412), sim = new Sim(s), [a, b] = s.advs;
  a.resident = b.resident = true;
  for (const f of FRONTIERS) sim.captureFrontier(f.id);
  a.eq.acc = 'heroCrest'; b.eq.acc = 'luckyCharm';
  assert.equal(sim.equipRelic('paleEmber', a.id), null);
  assert.equal(a.eq.acc, 'heroCrest'); assert.equal(a.eq.blessing, 'paleEmber');
  assert.equal(gearSum(a, 'def'), ITEMS.heroCrest.def + ITEMS.paleEmber.def);
  a.hp = maxHp(a, s);
  assert.equal(sim.equipRelic('paleEmber', b.id), null);
  assert.equal(a.eq.blessing, null); assert(a.hp <= maxHp(a, s));
  assert.equal(b.eq.acc, 'luckyCharm'); assert.equal(b.eq.blessing, 'paleEmber');
  assert.equal(sim.equipRelic('rootheart', b.id), null);
  assert.equal(s.frontier.relics.paleEmber, null); assert.equal(b.eq.blessing, 'rootheart');
  b.ko = true; assert(sim.equipRelic('rootheart', a.id)); b.ko = false;
  s.activeQuests.push({ id: 'test', members: [b.id] }); assert(sim.equipRelic('rootheart', a.id)); s.activeQuests = [];
  const copy = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(copy.frontier, s.frontier); assert.equal(copy.advs[1].eq.blessing, 'rootheart');
  const ui = Object.create(UI.prototype); ui.game = { s, sim };
  assert(ui.inspAdv(b).includes('Permanent blessing')); assert(ui.inspAdv(b).includes('Accessory slot stays free'));
  assert(ui.frontierRelics().includes('One blessing per pawn'));
}
console.log('blessings: legacy assignment migration, independent accessory stats, unique transfers and persistence passed');
