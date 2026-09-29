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
      const quality = (affix.value * mult - A.min) / (A.max - A.min);
      const bonus = Math.round(A.pctMin + quality * (A.pctMax - A.pctMin)) / 100;
      assert(Math.abs(item[A.key] - ((base[A.key] || 0) + bonus)) < 1e-12);
    }
    assert(item.name.endsWith(base.name)); assert(relicRollText(s, f.relic).includes('+'));
    assert.equal(sim.equipRelic(f.relic, a.id), null);
    for (const k of ['hpPct', 'atkPct', 'defPct', 'magPct', 'spd', 'crit']) {
      assert.equal(gearSum(a, k, s) - gearSum({ ...a, eq: { ...a.eq, blessing: null } }, k, s), item[k] || 0);
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

// Percentage blessings grow with the pawn while ordinary equipment remains flat and unchanged.
{
  const s = newGame(99), sim = new Sim(s), a = s.advs[0];
  a.resident = true; a.eq.weapon = 'woodSword';
  s.frontier.completed.greenmarch = true; s.frontier.relics.rootheart = null;
  s.frontier.rolls.rootheart = { affixes: [{ id: 'fierce', value: 4 }, { id: 'warded', value: 4 }] };
  assert.equal(gearSum(a, 'atk', s), ITEMS.woodSword.atk);
  assert.equal(gearSum(a, 'atkPct', s), 0);
  const plainLv1 = stat(a, 'atk', s); assert.equal(sim.equipRelic('rootheart', a.id), null);
  const blessedLv1 = stat(a, 'atk', s), lv1Gain = blessedLv1 - plainLv1;
  assert.equal(gearSum(a, 'atk', s), ITEMS.woodSword.atk);
  assert.equal(gearSum(a, 'atkPct', s), 0.20);
  a.lv = 99; const blessedLv99 = stat(a, 'atk', s);
  a.eq.blessing = null; const plainLv99 = stat(a, 'atk', s);
  assert(blessedLv1 > plainLv1); assert(blessedLv99 - plainLv99 > lv1Gain);
}
console.log('relic-rolls: percentage scaling at Lv1/Lv99, unchanged ordinary gear, saved roll identity, single-owner transfers and no rerolls passed');
