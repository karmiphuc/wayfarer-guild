import assert from 'node:assert/strict';
import { ITEMS, JOBS } from '../js/data.js';
import { newGame, migrate, makeAdventurer, teachJob, stat, maxHp } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { UI } from '../js/ui.js';

// Every class change retains all owned gear, including a mismatched weapon, through save/load.
{
  const s = newGame(755), sim = new Sim(s), a = s.advs[0]; s.tp = 100000;
  for (const id in JOBS) a.jobLv[id] = 10;
  a.eq.weapon = 'dragonSlayer'; a.eq.armor = 'plate'; a.eq.offhand = 'ironCap'; a.eq.acc = 'luckyCharm';
  const before = structuredClone(a.eq);
  const appearance = a.spr;
  for (const id in JOBS) {
    if (id !== a.job) assert.equal(sim.changeJob(a, id), null);
    assert.deepEqual(a.eq, before, id);
    assert.equal(a.spr, appearance, `${id}: class change replaced the pawn's identity`);
  }
  a.job = 'mage';
  const copy = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(copy.advs[0].eq, before);
  assert.equal(copy.advs[0].spr, appearance);
  teachJob(a, 'demon', sim.R);
  assert.equal(a.spr, appearance, 'teaching a job must preserve the appearance too');
  a.job = 'mage';
  assert.equal(sim.weaponMatch(a), false);
  const withSword = stat(a, 'atk', s); a.eq.weapon = null;
  assert(withSword > stat(a, 'atk', s), 'mismatched weapon must still contribute its stats');
}

// Actual melee/magic hits: only matching equipped weapons gain damage and attack speed.
for (const [job, weapon, matched] of [['warrior', 'woodSword', true], ['warrior', 'oakWand', false], ['mage', 'oakWand', true], ['mage', 'woodSword', false], ['warrior', null, false]]) {
  const s = newGame(755), sim = new Sim(s), a = makeAdventurer(s, sim.R, job);
  Object.assign(a, { x: 38, y: 28, lv: 20, cool: 0, perks: [], partner: null }); a.eq.weapon = weapon;
  s.advs = [a]; s.mons = [];
  const m = { id: 999, x: 38.5, y: 28, hp: 10000, mhp: 10000, def: 4 };
  sim.R.range = () => 1; sim.R.chance = () => false;
  const j = JOBS[job], pow = j.mag > j.atk ? stat(a, 'mag', s) * 1.25 : stat(a, 'atk', s);
  const normal = Math.max(1, Math.round(pow - 2)), move = sim.speed(a);
  sim.fight(a, m);
  assert.equal(10000 - m.hp, matched ? Math.round(normal * 1.1) : normal);
  assert.equal(a.cool, 1.1 / (j.spd + (matched ? 1 : 0)));
  assert.equal(sim.speed(a), move, 'combat affinity must not change walking speed');
  const ui = Object.create(UI.prototype); ui.game = { s, sim };
  if (weapon) assert(ui.inspAdv(a).includes(matched ? 'Class match: +10% damage' : 'normal stats, no class bonus'));
}

// Shopping values the bonus and treats a retained weapon as equipped, not missing.
{
  const s = newGame(755), sim = new Sim(s), a = s.advs[0]; a.job = 'warrior';
  const matching = { ...ITEMS.woodSword }, mismatched = { ...matching, type: 'staff' };
  assert(sim.gearValue(a, matching) > sim.gearValue(a, mismatched));
  a.eq.weapon = 'oakWand';
  s.buildings.push({ id: 999, type: 'weapon', x: 40, y: 20, lv: 1, occ: [] });
  assert(!sim.basicGearNeeds(a).some(g => g.slot === 'weapon'));
}
// Abstract cave combat also benefits from the matching weapon's offensive damage rate.
{
  function floor(withBonus) {
    const s = newGame(755), sim = new Sim(s), a = makeAdventurer(s, sim.R, 'warrior');
    a.eq.weapon = 'woodSword'; a.dungeon = true; a.potions = 0; a.hp = maxHp(a, s); s.advs = [a];
    if (!withBonus) sim.weaponMatch = () => false;
    sim.R.range = () => 1;
    sim.dungeonTick({ zone: 1, ft: 6, floor: 0, floors: 10, t: 70 }, [a]);
    return a.hp;
  }
  assert(floor(true) > floor(false));
}
console.log('weapon affinity: gear retention, save/load, neutral mismatch, melee/magic damage and combat speed, cave combat, UI and shopping passed');
