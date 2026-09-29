import assert from 'node:assert/strict';
import { newGame, migrate, maxHp, makeAdventurer } from '../js/state.js';
import { Sim } from '../js/sim.js';

function setup() {
  const s = newGame(904), sim = new Sim(s), [a, b] = s.advs;
  s.mons = []; s.activeQuests = [];
  for (const p of s.advs) Object.assign(p, { resident: true, perks: [], potions: 0, inside: null, task: null, hp: 1 });
  a.eq.weapon = 'dragonSlayer';
  return { s, sim, a, b };
}
// Revival precedes mortality and consumes no death roll. Unrevived survivors cannot be rerolled while KO.
{
  const { s, sim, a } = setup(); let rolls = 0;
  sim.R.chance = p => { if (p === 0.25) { rolls++; return false; } return false; };
  a.perks = ['undying']; a.reviveCharge = true;
  sim.hurtAdv(a, 99999, 'test'); assert(a.revived); assert(a.reviveCharge); assert.equal(rolls, 0);
  sim.hurtAdv(a, 99999, 'test'); assert(!a.reviveCharge); assert.equal(rolls, 0); assert.equal(a.hp, Math.round(maxHp(a, s) / 2));
  sim.hurtAdv(a, 99999, 'test'); assert(a.ko); assert.equal(rolls, 1);
  sim.hurtAdv(a, 99999, 'test'); sim.fall(a, 'test'); assert.equal(rolls, 1); assert.equal(s.weaponDrops.length, 0);
}
// Death frees references and the population slot, returns blessings, and drops the exact equipped weapon once.
{
  const { s, sim, a, b } = setup(); sim.R.chance = p => p === 0.25;
  const home = s.buildings[0]; home.occ = [a.id]; a.home = home.id;
  a.eq.blessing = 'rootheart'; s.frontier.relics.rootheart = a.id; s.frontier.completed.greenmarch = true;
  s.monsters = [{ id: 900, type: 'slime', riding: true, path: [1], bond: 20 }]; a.partner = 900;
  const m = { id: 901, target: a.id, path: [1], hp: 100 }; s.mons = [m];
  const q = { id: 902, members: [a.id, b.id] }; s.activeQuests = [q];
  a.task = { type: 'rescue', target: b.id, carrying: true }; b.ko = true; b.rescueBy = a.id;
  const count = s.advs.length, spot = [a.x, a.y];
  sim.hurtAdv(a, 99999, 'test'); assert(a.dead); assert.equal(s.advs.length, count - 1);
  assert.equal(b.rescueBy, null); assert.equal(home.occ.length, 0); assert.equal(m.target, null);
  assert.equal(s.frontier.relics.rootheart, null); assert.equal(s.monsters[0].riding, false);
  assert.deepEqual(q.members, [b.id]); assert.equal(s.weaponDrops.length, 1);
  const drop = s.weaponDrops[0]; assert.equal(drop.item, 'dragonSlayer'); assert.deepEqual([drop.x, drop.y], spot);
  sim.hurtAdv(a, 99999, 'test'); sim.fall(a, 'test'); sim.advStep(a); assert.equal(s.weaponDrops.length, 1);
  sim.hitMonster(m, 99999, a); assert.equal(m.hp, 100, 'delayed attacks from removed pawns must not award loot or target dead IDs');
  const saved = migrate(JSON.parse(JSON.stringify(s))), restored = new Sim(saved);
  assert.deepEqual(saved.weaponDrops, s.weaponDrops);
  assert.equal(restored.recoverWeapon(drop.id), null); assert(restored.recoverWeapon(drop.id));
  assert.equal(saved.weaponStash.dragonSlayer, 1); assert.equal(saved.weaponDrops.length, 0);
  const recipient = saved.advs.find(p => p.id === b.id); recipient.ko = false; recipient.task = null; saved.activeQuests = [];
  recipient.eq.weapon = 'woodSword';
  assert.equal(restored.equipRecoveredWeapon('dragonSlayer', recipient.id), null);
  assert.equal(recipient.eq.weapon, 'dragonSlayer'); assert.equal(saved.weaponStash.woodSword, 1);
  assert(restored.equipRecoveredWeapon('dragonSlayer', recipient.id));
  assert.equal(migrate(JSON.parse(JSON.stringify(saved))).weaponStash.woodSword, 1);
}
// Cave wipe drops at the entrance, removes the quest, grants no victory reward or dead-pawn XP.
{
  const { s, sim, a } = setup(); s.advs = [a]; a.dungeon = true;
  sim.R.chance = p => p === 0.25; sim.R.range = () => 1;
  let xp = 0; sim.gainXp = () => xp++;
  const q = { id: 999, kind: 'dungeon', name: 'Old Cave', zone: 4, ft: 6, floor: 0, floors: 1, t: 70, spot: [12, 13], members: [a.id], reward: { gold: 123, tp: 4, pop: 5 } };
  s.activeQuests = [q]; a.task = { type: 'quest', qid: q.id };
  const gold = s.gold; sim.dungeonTick(q, [a]);
  assert.equal(xp, 0); assert.equal(s.gold, gold); assert.equal(s.activeQuests.length, 0); assert.equal(s.advs.length, 0);
  assert.deepEqual([s.weaponDrops[0].x, s.weaponDrops[0].y], q.spot);
}
// Field quests also fail if nobody remains, including an empty target list.
{
  const { s, sim } = setup();
  const q = { id: 998, kind: 'outbreak', name: 'Wipe', members: [], t: 0 }; s.activeQuests = [q];
  sim.checkQuest(q); assert.equal(s.activeQuests.length, 0);
}
// Old saves get empty collections; migration and save cycles never duplicate drops or gear.
{
  const { s } = setup(); delete s.weaponDrops; delete s.weaponStash;
  migrate(s); assert.deepEqual(s.weaponDrops, []); assert.deepEqual(s.weaponStash, {});
  const once = JSON.stringify(s); migrate(s); assert.equal(JSON.stringify(s), once);
}
// Seeded mortality uses the requested probability, not every defeat or a repeat-until-death roll.
{
  const { s, sim } = setup(); s.advs = []; let deaths = 0;
  for (let i = 0; i < 1000; i++) {
    const a = makeAdventurer(s, sim.R); a.hp = 0; a.perks = []; a.eq.weapon = null; s.advs = [a];
    sim.fall(a, 'test'); if (a.dead) deaths++;
  }
  assert(deaths > 190 && deaths < 310, `Expected about 25% deaths, got ${deaths}/1000`);
}
console.log('mortality: revival priority, one death roll, KO survival, reference cleanup, field/cave drops, recovery, swaps and save compatibility passed');
