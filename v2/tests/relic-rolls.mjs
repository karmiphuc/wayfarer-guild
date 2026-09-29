import assert from 'node:assert/strict';
import { FRONTIERS, ITEMS } from '../js/data.js';
import { newGame, migrate, gearSum, stat } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { RELIC_AFFIXES, relicItem, relicRollText, seedRelicRolls } from '../js/relics.js';

const variants = new Set();
for (let seed = 1; seed <= 40; seed++) {
  const s = newGame(seed), sim = new Sim(s), [a, b] = s.advs;
  a.resident = b.resident = true;
  assert.deepEqual(s.frontier.rolls, {});
  for (const f of FRONTIERS) sim.captureFrontier(f.id);
  const rolls = JSON.stringify(s.frontier.rolls), rng = s.seed;
  seedRelicRolls(s); assert.equal(s.seed, rng); assert.equal(JSON.stringify(s.frontier.rolls), rolls);
  const copy = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(JSON.stringify(copy.frontier.rolls), rolls);
  const once = JSON.stringify(copy); migrate(copy); assert.equal(JSON.stringify(copy), once);
  for (const f of FRONTIERS) {
    const base = ITEMS[f.relic], item = relicItem(s, f.relic), roll = s.frontier.rolls[f.relic];
    assert.equal(roll.affixes.length, 2); assert.notEqual(roll.affixes[0].id, roll.affixes[1].id);
    for (const affix of roll.affixes) {
      const A = RELIC_AFFIXES[affix.id], mult = A.percent ? 100 : 1;
      assert(affix.value * mult >= A.min && affix.value * mult <= A.max);
      assert.equal(item[A.key], (base[A.key] || 0) + affix.value);
    }
    assert(item.name.endsWith(base.name)); assert(relicRollText(s, f.relic).includes('+'));
    assert.equal(sim.equipRelic(f.relic, a.id), null);
    for (const k of ['hp', 'atk', 'def', 'mag', 'spd', 'crit']) {
      assert.equal(gearSum(a, k, s) - gearSum({ ...a, eq: { ...a.eq, blessing: null } }, k, s), item[k] || 0);
      if (['hp', 'atk', 'def', 'mag'].includes(k)) assert(stat(a, k, s) >= stat(a, k, { ...s, frontier: { ...s.frontier, rolls: {} } }));
    }
    assert.equal(sim.equipRelic(f.relic, b.id), null); assert.equal(a.eq.blessing, null);
    assert.equal(sim.equipRelic(f.relic, null), null);
    sim.captureFrontier(f.id); assert.equal(JSON.stringify(s.frontier.rolls), rolls);
  }
  variants.add(JSON.stringify(s.frontier.rolls.rootheart));
  // Old earned rewards gain precisely the same rolls without consuming live RNG or losing base stats.
  const old = JSON.parse(JSON.stringify(s)); delete old.frontier.rolls;
  const oldRng = old.seed; migrate(old); assert.equal(old.seed, oldRng); assert.equal(JSON.stringify(old.frontier.rolls), rolls);
  const reverse = newGame(seed); for (const f of [...FRONTIERS].reverse()) reverse.frontier.relics[f.relic] = null;
  seedRelicRolls(reverse);
  for (const f of FRONTIERS) assert.deepEqual(reverse.frontier.rolls[f.relic], s.frontier.rolls[f.relic]);
}
assert(variants.size > 30);
console.log('relic-rolls: bounded unique traits, world variation, real stat use, single-owner transfers, old saves and no rerolls passed');
