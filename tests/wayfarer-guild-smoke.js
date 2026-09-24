const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const htmlPath = require('node:path').join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
new Function(script);

const drawContext = {
  setTransform() {},
  clearRect() {},
  drawImage() {},
  fillRect() {},
  strokeRect() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  arc() {},
  fillText() {},
  measureText(text) { return {width: String(text).length * 6}; },
  save() {},
  restore() {},
};

class StubElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.classList = {toggle() {}};
    this.parentElement = {getBoundingClientRect: () => ({width: 1216, height: 736})};
  }
  getContext() { return drawContext; }
  getBoundingClientRect() { return {width: 1216, height: 736, left: 0, top: 0}; }
  addEventListener() {}
  querySelectorAll() { return []; }
}

class StubImage {
  constructor() {
    this.complete = true;
    this.naturalWidth = 1;
  }
}

const elements = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new StubElement(id));
    return elements.get(id);
  },
  querySelectorAll() { return []; },
  createElement(id) { return new StubElement(id); },
};
const storage = {
  value: null,
  getItem() { return this.value; },
  setItem(_key, value) { this.value = value; },
};
const math = Object.create(Math);
math.random = () => 0;
const context = {
  console,
  document,
  localStorage: storage,
  Image: StubImage,
  Math: math,
  devicePixelRatio: 1,
  addEventListener() {},
  requestAnimationFrame() {},
};
context.window = context;
vm.runInNewContext(script, context, {filename: htmlPath});

const debug = context.__WAYFARER_DEBUG__;
assert.ok(debug, 'debug surface should be available for the smoke harness');
const state = debug.state();
const residents = state.pawns.filter(p => p.resident);
const houses = state.buildings.filter(b => b.type === 'House');
assert.equal(residents.length, 4, 'new game should have four residents');
assert.equal(residents.filter(p => p.homeId).length, 4, 'starting residents should receive homes');
assert.equal(houses.reduce((n, h) => n + h.occupants.length, 0), 4, 'house occupancy should match residents');

const resident = residents[0];
const home = houses.find(h => h.id === resident.homeId);
resident.energy = 20;
resident.hp = debug.stats(resident).maxHp * .5;
const oldHouseUses = home.uses;
debug.useBuilding(resident, home, 1);
assert.ok(resident.energy > 20 && resident.hp > debug.stats(resident).maxHp * .5, 'home should restore energy and HP');
assert.ok(home.uses > oldHouseUses, 'home use should be observable');

const oldGold = state.gold;
assert.equal(debug.placeBuilding('Farm', 2, 17), false, 'unresearched Farm should not be placeable');
state.unlockedResearch.push('Farm');
assert.equal(debug.placeBuilding('Farm', 2, 17), true, 'researched Farm should be placeable at rank 1');
assert.ok(state.gold < oldGold, 'building placement should charge gold');

const forge = debug.building('Forge', 7, 17);
resident.job = 'Blacksmith';
resident.energy = 90;
resident.hunger = 90;
state.wood = 10;
state.ore = 10;
const oldStash = state.stash.length;
debug.useBuilding(resident, forge, 1);
assert.ok(forge.uses > 0, 'Forge use should be observable');
assert.ok(state.stash.length > oldStash, 'Blacksmith should craft gear at the Forge');
assert.ok(state.wood < 10 && state.ore < 10, 'Forge crafting should consume materials');

for (const monster of state.monsters) monster.dead = true;
resident.job = 'Adventurer';
resident.work = 100;
resident.energy = 90;
resident.hunger = 90;
resident.hp = debug.stats(resident).maxHp;
resident.exploreCooldown = 0;
debug.chooseTask(resident);
assert.equal(resident.task, 'Explore', 'frontier-capable residents should autonomously explore');
assert.ok(resident.exploreTarget, 'autonomous exploration should select a target');

state.buildings.push(forge);
resident.job = 'Blacksmith';
resident.hp = debug.stats(resident).maxHp;
resident.work = 40;
resident.energy = resident.hunger = 95;
resident.x = 12; resident.y = 16;
debug.chooseTask(resident);
assert.equal(resident.task, 'Forge', 'a healthy Blacksmith should choose the Forge over training');
assert.equal(resident.exploreTarget, null, 'changing activity should clear exploration intent');
const forgeUses = forge.uses;
for (let i = 0; i < 600; i++) debug.updatePawn(resident, 1/30);
assert.ok(forge.uses > forgeUses, 'Blacksmith must travel to and use the Forge');

resident.job = 'Farmer';
resident.hp = debug.stats(resident).maxHp;
resident.energy = resident.hunger = 95;
state.food = 20;
debug.chooseTask(resident);
assert.equal(resident.task, 'Farm', 'Farmer should prioritize food production when food is low');

resident.energy = 20; resident.hunger = 95;
resident.hp = debug.stats(resident).maxHp * .4;
debug.chooseTask(resident);
assert.equal(resident.task, 'Rest');
assert.equal(resident.targetId, home.id, 'resident should select their own home');
const usesBeforeRest = home.uses;
for (let i = 0; i < 600; i++) debug.updatePawn(resident, 1/30);
assert.ok(home.uses > usesBeforeRest, 'resident must actually reach home and rest');
assert.ok(resident.hp >= debug.stats(resident).maxHp * .92, 'home visit must recover HP');

resident.job = 'Adventurer';
resident.hp = debug.stats(resident).maxHp;
resident.energy = resident.hunger = 95;
resident.x = 26; resident.y = 11;
state.energy = 50;
assert.equal(debug.deployExplore(resident, [32, 11]), true);
for (let i = 0; i < 100; i++) debug.updatePawn(resident, 1/30);
resident.energy = 5;
debug.updatePawn(resident, 1/30);
assert.equal(resident.exploreTarget, null, 'urgent needs must cancel exploration');
let returnedToTown = false;
for (let i = 0; i < 600; i++) {
  debug.updatePawn(resident, 1/30);
  if (resident.x < 24) returnedToTown = true;
}
assert.ok(returnedToTown, 'interrupted explorer must be able to return through the revealed corridor');

for (const p of residents) p.homeId = null;
for (const h of houses) h.occupants = [9999, 9999];
debug.repairAllStates();
assert.equal(residents.filter(p => p.homeId).length, 4, 'old housing assignments must repair');
const housing = JSON.stringify(houses.map(h => h.occupants));
debug.repairAllStates();
assert.equal(JSON.stringify(houses.map(h => h.occupants)), housing, 'housing repair must be idempotent');
resident.job = 'Blacksmith';
resident.x = 12; resident.y = 16;
resident.hp = 2; resident.hunger = 20; resident.energy = 80;
debug.chooseTask(resident);
assert.equal(resident.task, 'Eat');
let ate = false;
for (let i = 0; i < 900; i++) {
  debug.updatePawn(resident, 1/30);
  if (resident.hunger > 80) ate = true;
}
assert.ok(ate, 'low HP must not repeatedly restart eating and prevent travel to food');
console.log('Wayfarer Guild smoke checks passed, including activity selection, travel, recovery and repair');
