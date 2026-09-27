import assert from 'node:assert/strict';
import { JOBS, MONSTERS } from '../js/data.js';
import { makeAdventurer, maxHp, migrate, newGame } from '../js/state.js';
import { Sim } from '../js/sim.js';

function setup(rank = 5, level = 40, seed = 712) {
  const s = newGame(seed), sim = new Sim(s, {});
  s.stars = rank; s.gold = 100_000; s.advs = [];
  for (let i = 0; i < 4; i++) {
    const a = makeAdventurer(s, sim.R, 'warrior'); a.lv = level; a.x = 38; a.y = 28; a.hp = maxHp(a, s); s.advs.push(a);
  }
  return { s, sim };
}

// Rank increases bounded raid size and threat; only max rank follows the veteran squad.
for (const kind of ['bandits', 'stampede']) {
  let priorCount = 0, priorLevel = 0;
  for (let rank = 0; rank <= 5; rank++) {
    const { s, sim } = setup(rank), strength = sim.raidStrength(kind);
    assert(strength.count > priorCount); assert(strength.level > priorLevel);
    assert(strength.count <= (kind === 'bandits' ? 16 : 18));
    assert.equal(sim.startHappening(kind), null);
    const h = sim.happening(kind), spawned = s.mons.filter(m => h.data.mobs.includes(m.id));
    assert.equal(spawned.length, strength.count);
    if (kind === 'bandits') assert(spawned.every(m => m.job && MONSTERS[m.type].human && m.lv === strength.level));
    if (kind === 'stampede' && rank >= 2) assert(spawned.every(m => m.lv === strength.level));
    const before = s.gold, tp = s.tp;
    for (const m of spawned) m.hp = 0;
    sim.endHappening(h);
    assert(s.tp > tp); if (kind === 'bandits') assert(s.gold > before);
    assert(spawned.every(m => m.hp <= 0));
    priorCount = strength.count; priorLevel = strength.level;
  }
}
assert.equal(setup(0, 99).sim.raidStrength().level, 1);
assert.equal(setup(1, 99).sim.raidStrength().level, 3);
assert(setup(5, 99).sim.raidStrength().level > setup(5, 30).sim.raidStrength().level);
assert(setup(5, 99).sim.raidStrength().level <= 99);

// Seeded human classes retain real combat differences and survive plain-JSON saves.
{
  const one = setup(), two = setup();
  const squad = sim => Array.from({ length: 24 }, () => sim.spawnRaider([60, 30], 28, { quest: 'fixture' }));
  const a = squad(one.sim), b = squad(two.sim);
  assert.deepEqual(a, b); assert(new Set(a.map(m => m.job)).size >= 5);
  for (const m of a) { assert(JOBS[m.job].sprites.includes(m.spr)); assert.equal(m.weapon, JOBS[m.job].weapon); }
  const copy = migrate(JSON.parse(JSON.stringify(one.s)));
  assert.deepEqual(copy.mons, one.s.mons);
}

// Archer and mage attack from their class range; melee does not hit at that distance.
for (const job of ['warrior', 'archer', 'mage']) {
  const { s, sim } = setup(); s.props = []; s.buildings = []; sim.rebuildGrid();
  const target = s.advs[0]; target.x = 62.5; target.y = 30; target.hp = maxHp(target, s);
  s.advs = [target];
  const m = sim.spawnRaider([60, 30], 28, { job, quest: 'class-test' }), hp = target.hp;
  sim.monStep(m);
  if (job === 'warrior') assert.equal(target.hp, hp);
  else { assert(target.hp < hp); assert(s.fx.some(f => f.k === 'proj' && f.p === (job === 'mage' ? 'fire' : 'arrow'))); }
}

// Support classes heal only their own group, never a different concurrent camp.
{
  const { s, sim } = setup(); s.advs = [];
  const healer = sim.spawnRaider([60, 30], 28, { job: 'monk', quest: 'camp-a' });
  const ally = sim.spawnRaider([61, 30], 28, { job: 'warrior', quest: 'camp-a' });
  const stranger = sim.spawnRaider([60, 31], 28, { job: 'warrior', quest: 'camp-b' });
  ally.hp = stranger.hp = 1; sim.monStep(healer);
  assert(ally.hp > 1); assert.equal(stranger.hp, 1); assert(healer.cd > 0);
  const healed = ally.hp; sim.monStep(healer); assert.equal(ally.hp, healed);
}

// A camp on previously captured land still pursues its challenged party inside town.
{
  const { s, sim } = setup(); s.props = []; s.buildings = []; sim.rebuildGrid();
  const target = s.advs[0]; target.x = 40; target.y = 28; s.advs = [target];
  const m = sim.spawnRaider([37, 28], 20, { job: 'warrior', quest: 'camp-test', camp: 'test' });
  sim.monStep(m); assert(m.x > 37);
}

// Failed late-game raids have stronger stakes and retire all owned actors.
{
  const { s, sim } = setup(5, 99);
  assert.equal(sim.startHappening('bandits'), null);
  const h = sim.happening('bandits'), before = s.gold;
  sim.endHappening(h);
  assert(before - s.gold > 950); assert(s.gold >= before * 0.9);
  assert(!s.mons.some(m => h.data.mobs.includes(m.id) && m.hp > 0));
  for (let i = 0; i < 20; i++) sim.step();
  assert(!s.mons.some(m => h.data.mobs.includes(m.id)));
}

console.log('raids: bounded rank and veteran scaling, seeded human classes, ranged magic, group healing, rewards and cleanup passed');
