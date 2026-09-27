import assert from 'node:assert/strict';
import { MONSTERS } from '../js/data.js';
import { IMG } from '../js/assets.js';
import { Renderer } from '../js/render.js';
import { ALPHA_PET_COST, Sim } from '../js/sim.js';
import { bondedPetBonus, migrate, newGame, stat } from '../js/state.js';
import { UI } from '../js/ui.js';

const MAT_KEYS = ['wood', 'hide', 'herb', 'ore', 'crystal'];

function fixture() {
  const s = newGame(7301);
  s.stars = 5; s.gold = ALPHA_PET_COST.gold;
  for (const k of MAT_KEYS) s.mats[k] = ALPHA_PET_COST[k];
  s.buildings.push({ id: s.nextId++, type: 'stable', x: 32, y: 24, lv: 1, sales: 0, visits: 0, occ: [] });
  const pet = { id: s.nextId++, type: 'slime', name: 'Gloop', bond: 80, alpha: false, x: 34, y: 25, dir: 0, anim: 0, tx: 34, ty: 25, riding: true };
  s.monsters.push(pet);
  return { s, pet, sim: new Sim(s) };
}

const resources = s => ({ gold: s.gold, ...Object.fromEntries(MAT_KEYS.map(k => [k, s.mats[k]])) });

assert.deepEqual(ALPHA_PET_COST, { gold: 10000, wood: 100, hide: 100, herb: 100, ore: 100, crystal: 100 });

// Every gate fails atomically, including every individual material.
{
  const { s, sim } = fixture(), before = resources(s);
  assert.equal(sim.alphaPet(-1), 'Pet not found');
  assert.deepEqual(resources(s), before);
}
for (const [change, error] of [
  [s => { s.stars = 4; }, 'Reach 5 stars first'],
  [s => { s.buildings = s.buildings.filter(b => b.type !== 'stable'); }, 'Build a Stable first'],
  [s => { s.gold--; }, 'Need 10,000 village gold'],
]) {
  const { s, pet, sim } = fixture(); change(s); const before = resources(s);
  assert.equal(sim.alphaPet(pet.id), error); assert.deepEqual(resources(s), before); assert.equal(pet.alpha, false);
}
for (const k of MAT_KEYS) {
  const { s, pet, sim } = fixture(); s.mats[k]--; const before = resources(s);
  assert.match(sim.alphaPet(pet.id), /^Need 100 /); assert.deepEqual(resources(s), before); assert.equal(pet.alpha, false);
}

// The one-time purchase charges the exact full bundle and preserves the pet.
{
  const { s, pet, sim } = fixture(), type = pet.type, bond = pet.bond;
  assert.equal(sim.alphaPetBlock(pet.id), null);
  assert.equal(sim.alphaPet(pet.id), null);
  assert.deepEqual(resources(s), { gold: 0, wood: 0, hide: 0, herb: 0, ore: 0, crystal: 0 });
  assert.equal(pet.alpha, true); assert.equal(pet.type, type); assert.equal(pet.bond, bond);
  const after = resources(s);
  assert.equal(sim.alphaPet(pet.id), 'Already an Alpha pet'); assert.deepEqual(resources(s), after);
}

// Legacy pets default false; upgraded pets survive a JSON save round-trip and migration is idempotent.
{
  const { s, pet, sim } = fixture(); delete pet.alpha; migrate(s); assert.equal(pet.alpha, false);
  assert.equal(sim.alphaPet(pet.id), null);
  const copy = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(copy.monsters[0].alpha, true);
  const once = JSON.stringify(copy); migrate(copy); assert.equal(JSON.stringify(copy), once);
}

// Newly tamed pets explicitly enter the stable as non-Alpha pets.
{
  const { s, sim } = fixture(); s.monsters.length = 0;
  const a = s.advs[0], M = MONSTERS.slime;
  sim.R.chance = () => true;
  sim.killMonster({ id: s.nextId++, type: 'slime', lv: 1, hp: 0, mhp: M.hp, atk: M.atk, def: M.def, x: a.x, y: a.y }, a);
  assert.equal(s.monsters.length, 1); assert.equal(s.monsters[0].alpha, false);
}

// Alpha applies to the stat path and to the actual assist hit emitted by fight().
{
  const { s, pet, sim } = fixture(), a = s.advs[0];
  a.partner = pet.id; a.x = pet.x; a.y = pet.y; a.cool = 0;
  const normalBonus = bondedPetBonus(a, 'atk', s), normalStat = stat(a, 'atk', s);
  pet.alpha = true;
  assert.equal(bondedPetBonus(a, 'atk', s), normalBonus * 1.5);
  assert(stat(a, 'atk', s) > normalStat);

  const enemy = { id: s.nextId++, type: 'slime', x: a.x, y: a.y, hp: 9999, mhp: 9999, def: 0 };
  const hits = [];
  sim.R.range = () => 1; sim.R.chance = () => true;
  sim.hitMonster = (_m, damage) => hits.push(damage);
  pet.alpha = false; sim.fight(a, enemy); const normalAssist = hits.at(-1);
  hits.length = 0; a.cool = 0; pet.alpha = true; sim.fight(a, enemy); const alphaAssist = hits.at(-1);
  assert.equal(normalAssist, sim.partnerAssistDamage(a, { ...pet, alpha: false }));
  assert.equal(alphaAssist, sim.partnerAssistDamage(a, pet));
  assert.equal(alphaAssist, Math.round(normalAssist * 1.5));
}

// Adventurer UI exposes the exact cost, benefits, lock reason, Alpha labels, and confirmation boundary.
{
  const { s, pet, sim } = fixture(), a = s.advs[0];
  const ui = Object.create(UI.prototype);
  ui.game = { s, sim, audio: { sfx() {} }, follow: null }; ui.lastHtml = {}; ui.partnerPick = true;
  let html = ui.panel_people();
  for (const amount of ['10,000G', 'Wood×100', 'Hide×100', 'Herb×100', 'Ore×100', 'Crystal×100']) assert(html.includes(amount), amount);
  assert(html.includes('+50% pet assist hit damage')); assert(html.includes('+50% bonded passive stat contribution'));
  assert(html.includes('Ready to upgrade')); assert(html.includes('data-act="alphaPet"')); assert(html.includes('style="grid-column:1/-1"'));
  s.stars = 4; assert(ui.panel_people().includes('Reach 5 stars first')); s.stars = 5;

  const before = resources(s); let confirmed = null, question = '';
  ui.ask = (text, label, onOk) => { question = text; assert.equal(label, 'Make Alpha'); confirmed = onOk; };
  ui.renderPanel = () => {}; ui.renderInspector = () => {}; ui.toast = () => {};
  ui.act('alphaPet', { id: String(pet.id) });
  assert.equal(pet.alpha, false); assert.deepEqual(resources(s), before); assert(question.includes('Species and bond are preserved'));
  confirmed(); assert.equal(pet.alpha, true);

  a.resident = true; a.partner = pet.id;
  html = ui.panel_people(); assert(html.includes('<span class="tag gold">Alpha</span>')); assert(html.includes('One-time Alpha upgrade complete'));
  const inspector = ui.inspAdv(a); assert(inspector.includes('<span class="tag gold">Alpha</span>')); assert(inspector.includes('data-gold="1"'));
}

// Alpha pet and mount rendering pass a goldified image and use the existing crown marker.
{
  const key = 'm_' + MONSTERS.slime.spr, oldImage = IMG[key], oldDocument = globalThis.document;
  const source = { width: 64, height: 64 }; IMG[key] = source;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData() { throw new Error('fallback'); } }) }) };
  try {
    const frames = [], crowns = [], renderer = {
      g: { drawImage() {} }, time: 0, selected: null,
      drawShadow() {}, drawChar() {}, drawWeapon() {},
      weaponKey() { return null; }, weaponBehind() { return false; },
      monFrame(...args) { frames.push(args); }, crown(...args) { crowns.push(args); },
    };
    const pet = { id: 1, type: 'slime', alpha: true, riding: true, x: 2, y: 3, dir: 0, anim: 0 };
    Renderer.prototype.drawPet.call(renderer, pet);
    assert.equal(frames.at(-1)[5], source); assert.equal(frames.at(-1)[7], 20); assert.equal(crowns.length, 1);
    Renderer.prototype.drawAdv.call(renderer, { monsters: [pet] }, { partner: 1, x: 2, y: 3, dir: 0, anim: 0, atkT: 0, eq: null });
    assert.equal(frames.at(-1)[5], source); assert.equal(frames.at(-1)[7], 20); assert.equal(crowns.length, 2);
  } finally {
    if (oldImage === undefined) delete IMG[key]; else IMG[key] = oldImage;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
}

// Global progression survives loading, counts existing Alphas, and caps at 500 per material.
{
  const { s, pet, sim } = fixture();
  for (const amount of [100, 200, 300, 400, 500, 500, 500]) {
    const next = { ...pet, id: s.nextId++, alpha: false }; s.monsters.push(next);
    const cost = sim.alphaPetCost(); assert.equal(cost.gold, 10000);
    for (const k of MAT_KEYS) { assert.equal(cost[k], amount); s.mats[k] = amount; }
    s.gold = 10000; assert.equal(sim.alphaPet(next.id), null);
  }
  delete s.flags.alphaUpgrades; migrate(s);
  assert.equal(s.flags.alphaUpgrades, 7);
  assert.equal(new Sim(migrate(JSON.parse(JSON.stringify(s)))).alphaPetCost().wood, 500);
}
// Integer destination dimensions are exactly 25% larger, with the same foot anchor.
{
  const calls = [], renderer = { g: { drawImage(...args) { calls.push(args); } } };
  const im = {};
  Renderer.prototype.monFrame.call(renderer, 'test', 2, 3, 0, 0, im, false, 16);
  Renderer.prototype.monFrame.call(renderer, 'test', 2, 3, 0, 0, im, false, 20);
  assert.equal(calls[1][7] / calls[0][7], 1.25);
  assert.equal(calls[1][6] + calls[1][8], calls[0][6] + calls[0][8]);
}
console.log('alpha pets: escalating capped costs, migration, combat bonuses, UI and 25% larger rendering passed');
