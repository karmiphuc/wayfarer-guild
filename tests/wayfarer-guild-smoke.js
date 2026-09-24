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

resident.x = 12; resident.y = 16;
resident.energy = 5; resident.hunger = 5; resident.hp = 2;
debug.chooseTask(resident);
let recoveredFood = false;
for (let i = 0; i < 900; i++) {
  debug.updatePawn(resident, 1/30);
  if (resident.hunger > 80) recoveredFood = true;
}
assert.ok(recoveredFood, 'starving exhausted injured pawn must reach food');
const patient = residents[1];
patient.ko = true; patient.x = resident.x; patient.y = resident.y;
resident.hunger = 5; resident.energy = 80; resident.hp = 2;
debug.chooseTask(resident);
assert.equal(resident.task, 'Eat', 'critical rescuer needs must precede rescue');
patient.ko = false;

const enemy = state.monsters[0];
enemy.dead = false; enemy.hp = 10000; enemy.x = 27; enemy.y = 11;
resident.job = 'Adventurer'; resident.x = 26; resident.y = 11;
resident.energy = resident.hunger = 90; resident.hp = 2;
resident.task = 'Fight'; resident.targetId = enemy.id; resident.path = [];
debug.updatePawn(resident, 1/30);
assert.equal(resident.task, 'Rest', 'injured fighter must disengage to recover');
assert.equal(enemy.hp, 10000, 'retreat must not attack before leaving');
const retreatUses = home.uses;
let reachedHome = false;
for (let i = 0; i < 900; i++) {
  debug.updatePawn(resident, 1/30);
  if (home.uses > retreatUses) reachedHome = true;
}
assert.ok(reachedHome, 'retreat must move the pawn back into town');
resident.x = 26; resident.y = 11;
resident.energy = resident.hunger = 90; resident.hp = debug.stats(resident).maxHp;
state.energy = 50;
assert.ok(debug.deployExplore(resident, [32, 11]));
elements.get('recallBtn').onclick();
assert.equal(resident.task, 'Rest', 'Recall must select recovery rather than a nearby fight');
assert.equal(resident.exploreTarget, null);
const recallUses = home.uses;
let recallReturned = false;
for (let i = 0; i < 600; i++) {
  debug.updatePawn(resident, 1/30);
  if (resident.x < 24 && home.uses > recallUses) recallReturned = true;
}
assert.ok(recallReturned, 'recalled pawn must return to town');
for (const [activity, hunger, energy, expected] of [
  ['Fight', 90, 20, 'Rest'], ['Fight', 20, 90, 'Eat'],
  ['Rescue', 90, 26, 'Rest'], ['Rescue', 20, 90, 'Eat'],
]) {
  patient.ko = true; patient.x = 26; patient.y = 12;
  resident.x = 26; resident.y = 11;
  resident.hp = debug.stats(resident).maxHp;
  resident.hunger = hunger; resident.energy = energy;
  resident.task = activity; resident.targetId = activity === 'Fight' ? enemy.id : patient.id;
  debug.updatePawn(resident, 1/30);
  assert.equal(resident.task, expected, activity + ' must yield to critical needs');
}
patient.ko = false;
enemy.dead = true;

resident.mastered = [];
assert.ok(!debug.availableJobs(resident).includes('Knight'), 'Knight still requires Fighter mastery');
resident.mastered = ['Fighter'];
assert.ok(debug.availableJobs(resident).includes('Knight'), 'Fighter mastery unlocks Knight');
resident.mastered.push('Cleric');
assert.ok(!debug.availableJobs(resident).includes('Paladin'), 'Paladin requires Temple research');
state.townPoints = 100;
debug.research('Temple');
assert.ok(debug.availableJobs(resident).includes('Paladin'), 'Temple and both masteries unlock Paladin');
resident.mastered = ['Cleric'];
assert.ok(!debug.availableJobs(resident).includes('Paladin'), 'Temple cannot bypass Fighter mastery');

const library = debug.building('Library', 12, 17);
state.buildings.push(library);
resident.job = 'Researcher'; resident.work = 100;
resident.hp = debug.stats(resident).maxHp; resident.energy = resident.hunger = 95;
resident.x = 12; resident.y = 16;
debug.chooseTask(resident);
assert.equal(resident.task, 'Study', 'healthy Researcher must choose Library over Training');
for (let i = 0; i < 600; i++) debug.updatePawn(resident, 1/30);
assert.ok(library.uses > 0, 'Researcher must reach and use Library');

const existingBuildings = state.buildings;
state.buildings = state.buildings.filter(b => !['House', 'Inn'].includes(b.type));
resident.x = 12; resident.y = 16;
resident.energy = resident.hunger = 100; resident.hp = 2;
debug.chooseTask(resident);
assert.equal(resident.task, 'Camp');
let campHealed = false;
for (let i = 0; i < 1800; i++) {
  debug.updatePawn(resident, 1/30);
  if (resident.hp >= debug.stats(resident).maxHp * .92) campHealed = true;
  if (!campHealed) assert.equal(resident.task, 'Camp', 'Camp must not finish on energy alone');
}
assert.ok(campHealed, 'outdoor recovery must restore HP even at full starting energy');
state.buildings = existingBuildings;
console.log('Combat/rescue retreat, Recall, job unlocks, Study and Camp checks passed');

const missingQuests = JSON.parse(storage.value);
delete missingQuests.quests;
const brokenPawn = JSON.parse(storage.value);
brokenPawn.pawns[0].mastered = null;
for (const raw of ['{broken', '', JSON.stringify({version: 999}), JSON.stringify({version: 4}), JSON.stringify(missingQuests), JSON.stringify(brokenPawn)]) {
  const saved = new Map([['wayfarerGuildV2', raw]]);
  const failedContext = {...context, localStorage: {
    getItem(key) { return saved.has(key) ? saved.get(key) : null; },
    setItem(key, value) { saved.set(key, value); },
  }};
  failedContext.window = failedContext;
  vm.runInNewContext(script, failedContext);
  elements.get('saveBtn').onclick();
  assert.equal(saved.get('wayfarerGuildV2'), raw, 'failed load must preserve original bytes even after Save');
  assert.match(elements.get('mapHint').textContent, /Original data is preserved/);
  let reloaded = false;
  failedContext.location = {reload() { reloaded = true; }};
  failedContext.alert = () => {};
  failedContext.FileReader = class {
    readAsText(file) { this.result = file; this.onload(); }
  };
  elements.get('importFile').onchange({target: {files: ['{"version":4}']}});
  assert.equal(saved.get('wayfarerGuildV2'), raw, 'invalid import must preserve failed save');
  assert.equal(reloaded, false);
  const originalState = failedContext.__WAYFARER_DEBUG__.state();
  const write = failedContext.localStorage.setItem;
  failedContext.localStorage.setItem = () => { throw Error('storage full'); };
  elements.get('importFile').onchange({target: {files: [storage.value]}});
  assert.equal(failedContext.__WAYFARER_DEBUG__.state(), originalState, 'storage failure must restore in-memory state');
  assert.equal(saved.get('wayfarerGuildV2'), raw);
  assert.equal(reloaded, false, 'failed write must not reload');
  assert.doesNotThrow(() => elements.get('saveBtn').onclick(), 'failed import must retain save guard');
  failedContext.localStorage.setItem = write;
  elements.get('importFile').onchange({target: {files: [storage.value]}});
  assert.ok(reloaded, 'valid backup import must resume via reload');
  assert.equal(JSON.parse(saved.get('wayfarerGuildV2')).version, 4);
  const restoredContext = {...failedContext};
  restoredContext.window = restoredContext;
  vm.runInNewContext(script, restoredContext);
  assert.equal(restoredContext.__WAYFARER_DEBUG__.state().pawns.length, 8, 'valid save reload retains pawns');
  const goodRaw = saved.get('wayfarerGuildV2');
  const goodState = restoredContext.__WAYFARER_DEBUG__.state();
  for (const invalid of [missingQuests, brokenPawn]) {
    elements.get('importFile').onchange({target: {files: [JSON.stringify(invalid)]}});
    assert.equal(saved.get('wayfarerGuildV2'), goodRaw, 'invalid import must not overwrite good save');
    assert.equal(restoredContext.__WAYFARER_DEBUG__.state(), goodState, 'invalid import restores running game');
  }
  restoredContext.localStorage.setItem = () => { throw Error('storage full'); };
  elements.get('importFile').onchange({target: {files: [storage.value]}});
  assert.equal(restoredContext.__WAYFARER_DEBUG__.state(), goodState, 'running import rollback includes write errors');
  assert.equal(saved.get('wayfarerGuildV2'), goodRaw);
  restoredContext.localStorage.setItem = write;
}
console.log('Critical-needs and failed-save preservation checks passed');
