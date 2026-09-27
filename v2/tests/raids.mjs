import assert from 'node:assert/strict';
import { JOBS, MONSTERS } from '../js/data.js';
import { makeAdventurer, maxHp, migrate, newGame, townDist } from '../js/state.js';
import { Sim, DT, WEEK_SECONDS } from '../js/sim.js';
import { PathGrid } from '../js/path.js';

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
    if (kind === 'bandits') {
      assert(spawned.every(m => m.job && MONSTERS[m.type].human && m.lv === strength.level));
      const camp = s.banditCamps.find(c => c.id === h.data.camp);
      assert(camp && sim.raidCamps().includes(camp));
      assert(spawned.every(m => m.sourceCamp === camp.id && Math.abs(m.x - camp.x) <= 3 && Math.abs(m.y - camp.y) <= 3));
      assert(spawned.every(m => Array.isArray(m.raidGoal)));
    }
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

// Only available, unchallenged camps launch raids; a failed availability check is atomic.
{
  const { s, sim } = setup();
  for (const c of s.banditCamps) c.readyAt = s.tick + 3000;
  s.banditCamps[0].readyAt = 0;
  s.activeQuests.push({ id: 'camp:' + s.banditCamps[0].id, camp: s.banditCamps[0].id, members: [] });
  assert.equal(sim.raidCamps().length, 0);
  const before = JSON.stringify(s);
  assert.match(sim.startHappening('bandits'), /No active camp/);
  assert.equal(JSON.stringify(s), before, 'unavailable raid changed state or RNG');
  const source = s.banditCamps[1]; source.readyAt = 0;
  assert.deepEqual(sim.raidCamps().map(c => c.id), [source.id]);
  assert.equal(sim.startHappening('bandits'), null);
  assert.equal(sim.happening('bandits').data.camp, source.id);
}

// A distant company actually marches to owned land inside its travel allowance.
// A company that expires before arriving causes no theft or victory reward.
{
  const { s, sim } = setup(3);
  assert.equal(sim.startHappening('bandits'), null);
  const h = sim.happening('bandits'), raiders = s.mons.filter(m => h.data.mobs.includes(m.id));
  const source = s.banditCamps.find(c => c.id === h.data.camp), m = raiders[0];
  const initial = Math.hypot(m.x - m.raidGoal[0], m.y - m.raidGoal[1]);
  assert(initial > 10); assert(!h.data.arrived);
  s.advs = [];
  let steps = 0;
  for (; steps < h.weeks * WEEK_SECONDS / DT && !h.data.arrived; steps++) {
    s.tick++; for (const raider of raiders) sim.monStep(raider);
  }
  assert(h.data.arrived, `raid from ${source.id} failed to arrive within its duration`);
  assert(raiders.some(m => townDist(s, Math.round(m.x), Math.round(m.y)) === 0));
  assert(Math.hypot(m.x - m.raidGoal[0], m.y - m.raidGoal[1]) < initial);

  const early = setup(5, 99); early.sim.startHappening('bandits');
  const eh = early.sim.happening('bandits'), before = { gold: early.s.gold, tp: early.s.tp };
  assert(!eh.data.arrived); early.sim.endHappening(eh);
  assert.deepEqual({ gold: early.s.gold, tp: early.s.tp }, before);
  assert(!early.s.mons.some(m => eh.data.mobs.includes(m.id) && m.hp > 0));
}

// Defenders hold owned land, including an L-shaped union of captured rectangles.
// They return from the wilderness and cannot detour through wilderness around a sealed route.
{
  const { s, sim } = setup(); s.props = []; s.buildings = []; s.mons = [];
  s.frontier.completed.greenmarch = true; s.frontier.completed.ironvale = true;
  sim.rebuildGrid(); sim.grid.cost.fill(1);
  const a = s.advs[0]; s.advs = [a];
  const m = sim.spawnRaider([80, 14], 20, { raid: 'bandits', job: 'warrior' }); m.hp = m.mhp = 1e9;
  a.x = 73; a.y = 20; a.task = { type: 'hunt', defend: true, dur: 90 };
  for (let i = 0; i < 300; i++) {
    s.tick++; sim.defendStep(a, a.task);
    assert.equal(townDist(s, Math.round(a.x), Math.round(a.y)), 0, 'defender left concave owned area');
  }
  assert(Math.hypot(a.x - m.x, a.y - m.y) <= JOBS[a.job].range + 0.5);

  a.x = 120; a.y = 25; a.path = null; a.task = { type: 'hunt', defend: true, dur: 90 }; m.x = 130; m.y = 25;
  let returned = false;
  for (let i = 0; i < 300; i++) { s.tick++; sim.defendStep(a, a.task); if (townDist(s, Math.round(a.x), Math.round(a.y)) === 0) returned = true; if (returned) assert.equal(townDist(s, Math.round(a.x), Math.round(a.y)), 0); }
  assert(returned, 'outside defender did not return to captured land');

  a.x = 68; a.y = 25; a.path = null; a.task = { type: 'hunt', defend: true, dur: 90 }; m.x = 74; m.y = 25;
  for (let y = 18; y < 38; y++) sim.grid.set(70, y, 0);
  sim.grid.version++;
  assert(sim.grid.find(68, 25, 74, 25), 'fixture should allow a wilderness detour');
  for (let i = 0; i < 100; i++) { s.tick++; sim.defendStep(a, a.task); assert(a.x < 70); assert.equal(townDist(s, Math.round(a.x), Math.round(a.y)), 0); }

  // Live raids suppress both normal hunting and Golden Slime pursuit in AI decisions.
  sim.spawnMonster(1, 'slimeB', [120, 80], { golden: true });
  a.hunger = 0; a.energy = 100; a.fun = 100; a.hp = maxHp(a, s); a.gold = 0;
  for (let i = 0; i < 8; i++) { const task = sim.decide(a); assert(!task.chase); assert(task.type !== 'hunt' || task.defend); }
}

// Diagonal adjacency cannot bypass a missing owned corner.
{
  const grid = new PathGrid(3, 3); grid.cost.fill(1);
  const owned = (x, y) => (x === 0 && y === 0) || (x === 1 && y === 1);
  assert(grid.find(0, 0, 1, 1));
  assert.equal(grid.find(0, 0, 1, 1, undefined, owned), null);
}

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
  h.data.arrived = true;
  sim.endHappening(h);
  assert(before - s.gold > 950); assert(s.gold >= before * 0.9);
  assert(!s.mons.some(m => h.data.mobs.includes(m.id) && m.hp > 0));
  for (let i = 0; i < 20; i++) sim.step();
  assert(!s.mons.some(m => h.data.mobs.includes(m.id)));
}

console.log('raids: bounded rank and veteran scaling, seeded human classes, ranged magic, group healing, rewards and cleanup passed');
