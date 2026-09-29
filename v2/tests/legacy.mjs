import assert from 'node:assert/strict';
import { JOBS } from '../js/data.js';
import { legacyGame, newGame, migrate, load, maxHp, MASTERY } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { UI } from '../js/ui.js';

function fixture() {
  const s = newGame(1717), a = s.advs[0];
  Object.assign(a, { name: 'Pioneer', lv: 99, job: 'knight', jobLv: Object.fromEntries(Object.keys(JOBS).map(k => [k, 99])),
    perks: Object.values(JOBS).map(j => j.perk), work: 999, gold: 100000, xp: 123, jobXp: 234,
    resident: true, ko: true, hp: 0, dungeon: true, inside: { b: 111 }, rescueBy: 777, revived: true, reviveCharge: true,
    eq: { weapon: 'woodSword', armor: 'cloth', offhand: 'ironCap', acc: 'ring', blessing: 'rootheart' },
    task: { type: 'quest', qid: 876 }, home: 12345, kills: 800, partner: s.nextId++ });
  s.monsters = [
    { id: a.partner, type: 'slime', name: 'Old Friend', bond: 83, alpha: true, x: 70, y: 70, riding: true, path: [99], tx: 70, ty: 70 },
    { id: s.nextId++, type: 'warg', name: 'Dread Warg', bond: 61, alpha: true, frontier: 'moonwood', x: 70, y: 70 },
    { id: s.nextId++, type: 'emberWarg', name: 'Ember Warg', bond: 19, alpha: false, frontier: 'frostveil', x: 70, y: 70 },
  ];
  s.stars = 5; s.gold = 999999; s.cleared = 123; s.bossesBeaten.cyclop = true;
  s.frontier.completed.moonwood = true; s.frontier.relics.rootheart = a.id;
  return { s, a, extra: s.monsters[1] };
}

// Carry exactly one identity, reset all activity/progression, and retain only five random masteries.
{
  const { s, a, extra } = fixture(), before = JSON.stringify(s);
  const next = legacyGame(s, a.id, extra.id, 2222), pawn = next.advs.find(p => p.id === next.flags.pioneer);
  assert.equal(JSON.stringify(s), before, 'planning a new run cannot mutate the old village');
  assert.deepEqual(legacyGame(s, a.id, extra.id, 2222), next, 'seeded replay');
  assert.equal(pawn.name, a.name); assert.equal(pawn.spr, a.spr); assert.deepEqual(pawn.persona, a.persona);
  assert.equal(pawn.lv, 1); assert.equal(pawn.job, 'villager'); assert.equal(pawn.gold, 0); assert.equal(pawn.work, 100);
  assert.equal(pawn.xp, 0); assert.equal(pawn.jobXp, 0); assert.equal(pawn.kills, 0);
  assert.equal(pawn.ko, false); assert.equal(pawn.task, null); assert.equal(pawn.rescueBy, null);
  assert(!pawn.inside && !pawn.dungeon && !pawn.reviveCharge && !pawn.revived);
  assert(Object.values(pawn.eq).every(v => v === null)); assert.equal(pawn.hp, maxHp(pawn, next));
  assert.equal(pawn.resident, true); assert(next.buildings.some(b => b.id === pawn.home && b.type === 'house'));
  assert.equal(pawn.perks.length, 5); assert.equal(Object.values(pawn.jobLv).filter(l => l >= MASTERY).length, 5);
  assert(Object.values(pawn.jobLv).every(l => l === 1 || l === MASTERY));
  assert.equal(next.stars, 0); assert.equal(next.gold, 3000); assert.equal(next.cleared, 0);
  assert.deepEqual(next.frontier, { completed: {}, relics: {}, petRewards: {}, rolls: {} });
  assert.deepEqual(next.bossesBeaten, {});
  assert.equal(next.monsters.length, 2);
  assert.equal(next.monsters.find(p => p.id === pawn.partner).name, 'Old Friend');
  assert.equal(next.monsters.find(p => p.id === next.flags.pioneerPet).type, 'warg');
  for (const p of next.monsters) { assert.equal(p.alpha, true); assert.equal(p.path, null); assert.equal(p.riding, false); assert(p.x < 50 && p.y < 40); }
  assert.deepEqual(next.monsters.map(p => p.bond), [83, 61]);
  assert.equal(new Set([...next.advs, ...next.monsters, ...next.buildings].map(o => o.id)).size, next.advs.length + next.monsters.length + next.buildings.length);
  const copy = migrate(JSON.parse(JSON.stringify(next))); new Sim(copy);
  assert.equal(copy.advs.find(p => p.id === copy.flags.pioneer).perks.length, 5);
  assert.equal(copy.monsters.length, 2, 'old frontier origin must not trigger a new reward');
  const reroll = legacyGame(copy, copy.flags.pioneer, copy.flags.pioneerPet, 3333);
  assert.deepEqual([...reroll.advs.find(p => p.id === reroll.flags.pioneer).perks].sort(), [...pawn.perks].sort());
  assert.equal(reroll.monsters.length, 2);
}

// Fewer than five masteries all survive; random subsets vary across seeds without extra prerequisites.
{
  const { s, a, extra } = fixture(), sets = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const next = legacyGame(s, a.id, extra.id, seed), pawn = next.advs.find(p => p.id === next.flags.pioneer);
    sets.add([...pawn.perks].sort().join(','));
    assert.equal(pawn.perks.length, 5);
  }
  assert(sets.size > 20);
  a.jobLv = { warrior: 10, mage: 11, archer: 9 }; a.partner = null;
  const next = legacyGame(s, a.id, null, 77), pawn = next.advs.find(p => p.id === next.flags.pioneer);
  assert.deepEqual([...pawn.perks].sort(), ['arcane', 'ironbody']); assert.equal(next.monsters.length, 0);
  a.jobLv = {}; assert.equal(legacyGame(s, a.id, null, 77).advs.at(-1).perks.length, 0);
  a.partner = extra.id;
  assert.equal(legacyGame(s, a.id, extra.id, 77).monsters.length, 1, 'one pet cannot be duplicated');
  assert.equal(legacyGame(s, -1, null, 77), null);
  assert.equal(legacyGame(s, a.id, s.monsters[0].id, 77), null, 'extra slot is for legendary camp pets');
}

// UI picks one pawn and a distinct extra pet, confirms before saving, and preserves an open game on save failure.
{
  const { s, a, extra } = fixture(), game = { s, sim: new Sim(s), noSave: false, audio: { sfx() {} } };
  const ui = Object.create(UI.prototype); ui.game = game; ui.open = () => {}; ui.toast = () => {};
  ui.openNewGame(42); assert.equal(ui.pioneerPick, a.id); assert.equal(ui.pioneerPetPick, extra.id);
  assert(ui.panel_newgame().includes('up to five randomly kept masteries'));
  assert(ui.panel_newgame().includes('aria-pressed="true"'));
  a.partner = extra.id; ui.pickPioneer(a.id);
  assert.equal(ui.pioneerPetPick, s.monsters[2].id);
  let confirm; ui.ask = (_text, _label, ok) => { confirm = ok; };
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), oldLocation = globalThis.location, oldWarn = console.warn;
  const stored = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: k => stored.get(k), setItem: (k, v) => stored.set(k, v) } });
  globalThis.location = { pathname: '/v2/', href: 'unchanged' };
  try {
    ui.beginNewGame(true); assert.equal(stored.size, 0); assert.equal(game.noSave, false);
    confirm(); const loaded = load();
    assert.equal(loaded.advs.find(p => p.id === loaded.flags.pioneer).name, a.name);
    assert.equal(globalThis.location.href, '/v2/'); assert.equal(game.noSave, true);
    game.noSave = false; globalThis.location.href = 'unchanged';
    globalThis.localStorage.setItem = () => { throw new Error('quota'); }; console.warn = () => {};
    ui.beginNewGame(false); confirm();
    assert.equal(game.s, s); assert.equal(game.noSave, false); assert.equal(globalThis.location.href, 'unchanged');
  } finally { if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage; globalThis.location = oldLocation; console.warn = oldWarn; }
}

// Existing saves and completely fresh games retain normal defaults.
{
  const s = newGame(12); delete s.flags.pioneer; delete s.flags.pioneerPet;
  migrate(s); assert.equal(s.flags.pioneer, null); assert.equal(s.flags.pioneerPet, null);
  assert.equal(s.monsters.length, 0); assert.equal(s.advs.length, 3);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))), s);
}
console.log('legacy: chosen level-1 pawn, random five masteries, distinct pets, clean reset, charter rerolls, safe save/confirmation and migration passed');
