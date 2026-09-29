import assert from 'node:assert/strict';
import { CAMP_FACTIONS, CAMP_MODIFIERS, campMember, campProfile, seedCampFactions } from '../js/camps.js';
import { JOBS } from '../js/jobs.js';
import { makeRng } from '../js/rng.js';
import { CAMP_PATROLS } from '../js/data.js';
import { makeAdventurer, maxHp, migrate, newGame } from '../js/state.js';
import { DT, Sim, WEEK_SECONDS } from '../js/sim.js';

const legacy = code => ({ seed: 1234, world: { code }, banditCamps: Array.from({ length: 16 }, (_, i) => ({
  id: 'bandit' + (i + 1), name: 'Old camp ' + i, x: 80 + i, y: 70 - i, tier: 1 + Math.floor(i / 4),
  clears: i, readyAt: i * 100, cooldownWeeks: 8 + i % 13, patrolAt: 500 + i,
})) });
const original = legacy(17), s = structuredClone(original), same = structuredClone(original);
seedCampFactions(s); seedCampFactions(same);
assert.deepEqual(s, same); assert.equal(s.seed, original.seed);
assert.equal(s.banditCamps.length, 16);
for (let i = 0; i < 16; i++) {
  const { faction, captainName, modifier, ...old } = s.banditCamps[i];
  assert.deepEqual(old, original.banditCamps[i]);
  assert(CAMP_FACTIONS[faction]); assert(captainName);
  assert(modifier === null || CAMP_MODIFIERS[modifier]);
}
const saved = JSON.stringify(s); seedCampFactions(s); assert.equal(JSON.stringify(s), saved);
const restored = JSON.parse(saved); seedCampFactions(restored); assert.deepEqual(restored, s);
s.world.code = 88; seedCampFactions(s); assert.deepEqual(s.banditCamps, same.banditCamps);
const reverse = structuredClone(original); reverse.banditCamps.reverse(); seedCampFactions(reverse);
assert.deepEqual(reverse.banditCamps.reverse(), same.banditCamps);
const different = legacy(18); seedCampFactions(different); assert.notDeepEqual(different.banditCamps, same.banditCamps);
const noWorld = legacy(0); delete noWorld.world; seedCampFactions(noWorld); assert(noWorld.banditCamps.every(c => c.faction));
seedCampFactions({}); assert.equal(campProfile({}).faction, 'iron');
assert.equal(campProfile({ faction: 'missing', modifier: ['reinforced', 'eliteCaptain'] }).modifier, null);

for (const faction of Object.keys(CAMP_FACTIONS)) {
  for (const tier of [1, 2, 3, 4]) {
    const p = campProfile({ faction, tier });
    assert.equal(Object.values(p.materials).reduce((a, b) => a + b, 0), 3 + tier * 4);
    assert(p.materials[p.signature] > 0);
    const rich = campProfile({ faction, tier, modifier: 'richStores' });
    assert.equal(rich.materials[p.signature], p.materials[p.signature] + 1);
    assert.notDeepEqual(p.materials, campProfile({ faction: faction === 'iron' ? 'ash' : 'iron', tier }).materials);
  }
  for (const level of [1, 7, 8, 19, 20, 99]) for (const modifier of [null, ...Object.keys(CAMP_MODIFIERS)]) {
    const c = { faction, tier: 4, captainName: 'Test captain', modifier }, tier = level >= 20 ? 3 : level >= 8 ? 2 : 1;
    for (const mode of ['challenge', 'patrol', 'raid']) for (const total of [1, 3, 5, 11]) {
      const R = makeRng({ seed: 929 }), R2 = makeRng({ seed: 929 });
      const members = Array.from({ length: total }, (_, i) => campMember(c, level, i, total, R, mode));
      assert.deepEqual(members, Array.from({ length: total }, (_, i) => campMember(c, level, i, total, R2, mode)));
      assert(members.every(m => JOBS[m.job].tier <= tier));
      assert(members.filter(m => JOBS[m.job].heal).length <= 1);
      assert.equal(members.filter(m => m.captain).length, mode === 'challenge' ? 1 : 0);
      if (total >= 3) assert(new Set(members.map(m => m.job)).size >= 2);
      if (mode !== 'challenge') assert(members.every(m => m.hpScale === 1 && m.atkScale === 1 && m.defScale === 1));
      else {
        assert.equal(members[0].name, 'Test captain');
        assert(members.every(m => m.hpScale <= 1.18 && m.atkScale <= 1.08 && m.defScale === 1));
        if (modifier === 'eliteCaptain') {
          assert(Math.abs(members.reduce((n, m) => n + m.hpScale, 0) - total) < 1e-9);
          assert(Math.abs(members.reduce((n, m) => n + m.atkScale, 0) - total) < 1e-9);
        }
      }
    }
  }
}

// Weighted selection offers several legal class mixes across deterministic seeds.
for (const faction of Object.keys(CAMP_FACTIONS)) {
  const jobs = new Set();
  for (let seed = 1; seed <= 100; seed++) jobs.add(campMember({ faction }, 25, 2, 8, makeRng({ seed })).job);
  assert(jobs.size >= 4, `${faction} needs a varied class pool`);
}

const integrationBase = newGame(712);
function setupCamp(faction, modifier, rank = 5) {
  const s = structuredClone(integrationBase), sim = new Sim(s);
  s.stars = rank; s.gold = 100000; s.advs = []; s.mons = [];
  for (let i = 0; i < 4; i++) {
    const a = makeAdventurer(s, sim.R, 'warrior');
    a.lv = 40; a.resident = true; a.hp = maxHp(a, s); s.advs.push(a);
  }
  const c = s.banditCamps[0];
  Object.assign(c, { faction, modifier, captainName: 'Integration captain' });
  s.banditCamps = [c];
  return { s, sim, c };
}
function assertSpawnStats(m, boosted) {
  const J = JOBS[m.job], k = 0.95 + (m.lv - 1) * 0.14;
  assert.equal(m.hp, m.mhp);
  assert.equal(m.mhp, Math.round(Math.round(J.hp * k * 1.25) * (boosted ? m.hpScale : 1)));
  assert.equal(m.atk, Math.round(Math.round(J.atk * k) * (boosted ? m.atkScale : 1)));
  assert.equal(m.mag, Math.round(Math.round(J.mag * k) * (boosted ? m.atkScale : 1)));
  assert.equal(m.def, Math.round(J.def * k));
  assert.equal(m.moveSpeed, J.spd); assert.equal(m.range, J.range); assert.equal(m.healer, !!J.heal);
  assert(J.sprites.includes(m.spr));
  assert(J.tier <= (m.lv >= 20 ? 3 : m.lv >= 8 ? 2 : 1));
}

// Challenge wiring must use the selected faction, actual modifiers, and the material payout.
for (const faction of Object.keys(CAMP_FACTIONS)) for (const modifier of [null, ...Object.keys(CAMP_MODIFIERS)]) {
  const { s, sim, c } = setupCamp(faction, modifier), expected = campProfile(c).materials;
  assert.equal(sim.startQuest('camp:' + c.id, s.advs.map(a => a.id)), null);
  const q = s.activeQuests.find(q => q.camp === c.id), members = s.mons.filter(m => q.mobs.includes(m.id));
  assert.equal(members.length, 3 + c.tier * 2); assert.equal(q.n, members.length);
  assert(members.every(m => m.faction === faction && m.lv === q.rec && m.camp === c.id));
  assert.equal(members.filter(m => m.captain).length, 1); assert.equal(members[0].name, c.captainName);
  assert.equal(members.filter(m => m.healer).length, faction === 'ash' ? 1 : 0);
  assert(new Set(members.map(m => m.job)).size >= 2);
  for (const m of members) assertSpawnStats(m, true);
  if (modifier === 'eliteCaptain') assert(members[0].hpScale > 1 && members.slice(1).every(m => m.hpScale < 1));
  else if (modifier === 'reinforced') assert(members.every(m => m.hpScale === 1.04 && m.atkScale === 0.96));
  else assert(members.every(m => m.hpScale === 1 && m.atkScale === 1));
  const restored = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.mons, s.mons); assert.deepEqual(restored.banditCamps, s.banditCamps);
  assert.deepEqual(q.reward.materials, expected);
  const before = { ...s.mats };
  for (const m of members) m.hp = 0;
  sim.checkQuest(q);
  for (const k of new Set([...Object.keys(before), ...Object.keys(expected)])) {
    assert.equal(s.mats[k] || 0, (before[k] || 0) + (expected[k] || 0), `${faction}: ${k} payout`);
  }
  assert.equal(c.clears, 1); assert(c.cooldownWeeks >= 8 && c.cooldownWeeks <= 20);
  const after = JSON.stringify(s.mats); sim.checkQuest(q); assert.equal(JSON.stringify(s.mats), after);
}

// Camp modifiers must never increase the existing patrol or raid class stats, counts or level bounds.
for (const faction of Object.keys(CAMP_FACTIONS)) for (const modifier of ['eliteCaptain', 'reinforced']) for (let rank = 1; rank <= 5; rank++) {
  const { s, sim, c } = setupCamp(faction, modifier, rank), rules = CAMP_PATROLS[rank], week = WEEK_SECONDS / DT;
  s.tick = 1000; s.flags.nextCampPatrol = 0; c.patrolAt = 0;
  for (const a of s.advs) a.lv = 99;
  sim.campPatrols();
  const patrol = s.mons.filter(m => m.raid === 'patrol');
  assert(patrol.length >= rules.count[0] && patrol.length <= rules.count[1]);
  assert(c.patrolAt >= s.tick + rules.weeks[0] * week && c.patrolAt <= s.tick + rules.weeks[1] * week);
  for (const m of patrol) {
    assert(m.lv >= rules.level[0] && m.lv <= rules.level[1]);
    assert.equal(m.sourceCamp, c.id); assert.equal(m.faction, faction); assert.equal(m.captain, false);
    assert.equal(m.hpScale, 1); assert.equal(m.atkScale, 1); assertSpawnStats(m, false);
  }
  const count = s.mons.length; sim.campPatrols(); assert.equal(s.mons.length, count);
  const strength = sim.raidStrength(); assert.equal(sim.startHappening('bandits'), null);
  const raid = s.mons.filter(m => m.raid === 'bandits');
  assert.equal(raid.length, strength.count);
  for (const m of raid) {
    assert.equal(m.lv, strength.level); assert.equal(m.sourceCamp, c.id); assert.equal(m.faction, faction);
    assert.equal(m.captain, false); assert.equal(m.hpScale, 1); assert.equal(m.atkScale, 1); assertSpawnStats(m, false);
  }
}

// The real migration supplies metadata without touching schedules, camp sites or simulation RNG.
{
  const old = structuredClone(integrationBase), seed = old.seed;
  for (const c of old.banditCamps) { delete c.faction; delete c.captainName; delete c.modifier; }
  const before = structuredClone(old.banditCamps);
  migrate(old); assert.equal(old.seed, seed);
  for (let i = 0; i < before.length; i++) {
    const { faction, captainName, modifier, ...site } = old.banditCamps[i];
    assert.deepEqual(site, before[i]); assert(CAMP_FACTIONS[faction]); assert(captainName);
    assert(modifier === null || CAMP_MODIFIERS[modifier]);
  }
  const once = JSON.stringify(old); migrate(old); assert.equal(JSON.stringify(old), once);
}
console.log('camp factions: metadata, composition, bounded modifiers, actual challenge loot/stats, unchanged patrol/raid scaling and migration passed');
