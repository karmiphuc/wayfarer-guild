import assert from 'node:assert/strict';
import { FAC, FRONTIERS, FRONTIER_PETS, MONSTERS, TITLES, ZONE_MONS } from '../js/data.js';
import { newGame, migrate } from '../js/state.js';
import { Sim } from '../js/sim.js';

for (const type of FRONTIER_PETS) assert(MONSTERS[type] && !MONSTERS[type].human);
assert(!Object.values(ZONE_MONS).flat().includes('warg'), 'exclusive warg never spawns in outbreaks');

// Every camp rolls independently at 30%; successes and misses are both permanent.
const s = newGame(1), sim = new Sim(s), counts = new Set();
let wins = 0;
for (let seed = 1; seed <= 500; seed++) {
  s.world.code = seed; s.frontier.petRewards = {}; s.monsters = [];
  s.frontier.completed = Object.fromEntries(FRONTIERS.map(f => [f.id, true]));
  const rng = s.seed;
  for (const f of FRONTIERS) {
    sim.rewardFrontierPet(f.id, true);
    const result = s.frontier.petRewards[f.id];
    if (result) { wins++; counts.add(result); }
  }
  assert.equal(s.seed, rng, 'reward rolls do not perturb running simulation');
  assert.equal(Object.keys(s.frontier.petRewards).length, 8);
  const before = JSON.stringify([s.frontier.petRewards, s.monsters]);
  for (const f of FRONTIERS) sim.rewardFrontierPet(f.id);
  assert.equal(JSON.stringify([s.frontier.petRewards, s.monsters]), before);
}
assert(wins > 1000 && wins < 1400, `unexpected reward rate: ${wins}/4000`);
assert.equal(counts.size, FRONTIER_PETS.length);

// Old completed camps receive their roll without a Stable; loading cannot duplicate or reroll.
{
  const s = newGame(7301);
  s.frontier.completed = Object.fromEntries(FRONTIERS.map(f => [f.id, true]));
  delete s.frontier.petRewards;
  const sim = new Sim(migrate(s));
  assert.equal(Object.keys(s.frontier.petRewards).length, 8);
  assert(s.monsters.length > 0);
  assert(s.monsters.every(p => p.frontier && p.alpha === false));
  const snapshot = JSON.stringify([s.monsters, s.frontier.petRewards]);
  const copy = migrate(JSON.parse(JSON.stringify(s))); new Sim(copy);
  assert.equal(JSON.stringify([copy.monsters, copy.frontier.petRewards]), snapshot);
  const repeat = newGame(7301); repeat.frontier.completed = { ...s.frontier.completed }; new Sim(repeat);
  assert.deepEqual(repeat.frontier.petRewards, s.frontier.petRewards);
  sim.captureFrontier(FRONTIERS[0].id);
  assert.equal(JSON.stringify([s.monsters, s.frontier.petRewards]), snapshot);
}

// New captures always keep the relic and land even on a missed pet roll; no award before victory.
{
  const s = newGame(1), sim = new Sim(s);
  sim.rewardFrontierPet(FRONTIERS[0].id);
  assert.deepEqual(s.frontier.petRewards, {});
  for (const f of FRONTIERS) {
    sim.captureFrontier(f.id);
    assert.equal(s.frontier.completed[f.id], true);
    assert.equal(s.frontier.relics[f.relic], null);
    assert(Object.hasOwn(s.frontier.petRewards, f.id));
  }
  // Bonus companions never occupy ordinary taming capacity.
  s.buildings.push({ id: s.nextId++, type: 'stable', x: 32, y: 24, lv: 1, occ: [] });
  s.monsters = s.monsters.filter(p => p.frontier);
  const bonus = s.monsters.length;
  sim.R.chance = () => true;
  for (let i = 0; i < FAC.stable.cap + 1; i++) sim.killMonster({ id: s.nextId++, type: 'slime', lv: 1, hp: 0, mhp: 14, atk: 3, def: 1, x: 32, y: 24 }, s.advs[0]);
  assert.equal(s.monsters.length, bonus + FAC.stable.cap);
}
// Crossing a title threshold pays its reward even during quiet legacy-save catch-up.
for (const silent of [false, true]) {
  const s = newGame(7301); let fanfares = 0;
  const sim = new Sim(s, { fanfare() { fanfares++; } });
  s.buildings = ['stable', ...Array(4).fill('dojo'), ...Array(8).fill('treeGreen')].map(type => ({ type, lv: 1 }));
  s.monsters = Array.from({ length: 3 }, (_, i) => ({ id: s.nextId++, type: 'slime', alpha: false }));
  s.titles = Object.fromEntries(TITLES.filter(t => t.id !== 'beast').map(t => [t.id, true]));
  sim.recomputeTraits(true); assert.equal(s.traits.Monster, 19);
  s.frontier.completed.moonwood = true;
  const gold = s.gold, pop = s.pop;
  sim.rewardFrontierPet('moonwood', silent);
  assert.equal(s.titles.beast, true);
  assert.equal(s.gold - gold, 1500); assert.equal(s.pop - pop, 250);
  assert.equal(fanfares, silent ? 0 : 2);
}
console.log(`frontier pets: ${wins}/4000 rolls, one-time legacy catch-up, save safety, full-capacity rewards, titles and relics passed`);
