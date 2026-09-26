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
assert.deepEqual({...debug.mapSpec()}, {cols: 38, rows: 33, viewRows: 23, townMaxX: 24, populationCap: 30});
assert.equal(debug.desiredMonsterCount(30), 23, 'a full town should support a much denser frontier population');
assert.equal(state.version, 6);
assert.equal('energy' in state, false, 'guild-wide stamina must not exist');
assert.equal('townPoints' in state, false, 'pseudo-premium town-point purse must not exist');
assert.equal(state.fog.length, 33, 'new games should include the southern district');
assert.ok(state.fog.slice(23).every(row => row.slice(0, 25).every(v => v === false)), 'new southern town cells should be revealed');
assert.ok(state.fog.slice(23).every(row => row.slice(25).every(v => v === true)), 'new southern frontier cells should begin fogged');
for (const monster of state.monsters) monster.dead = true;
debug.update(1/30);
assert.ok(state.monsters.some(m => !m.dead), 'ambient monsters should replenish below the population-scaled target');
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

state.gold = Math.max(state.gold, 500);
assert.equal(debug.buildCheck('House', 2, 27).ok, true, 'southern district should provide valid building lots');
assert.equal(debug.placeBuilding('House', 2, 27), true, 'a House should be placeable in the southern district');
const southHouse = state.buildings.find(b => b.type === 'House' && b.y === 27);
assert.ok(southHouse, 'southern building should retain its expanded-map coordinates');
assert.ok(debug.astar(12, 16, southHouse.x + 1, southHouse.y + southHouse.h).length > 0, 'pawns should path to southern building entrances');
assert.equal(debug.setCamera(999), 10, 'camera should clamp to the final ten-row offset');
assert.equal(debug.canvasPos({clientX: 80, clientY: 656}).y, 30, 'pointer conversion should include the vertical camera offset');
assert.equal(debug.setCamera(-5), 0, 'camera should clamp at the north edge');

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
assert.equal(debug.deployExplore(resident, [32, 11]), true, 'healthy residents explore without guild-wide stamina');
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
assert.ok(debug.deployExplore(resident, [32, 11]), 'Recall test should not require guild-wide stamina');
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
state.gold = Math.max(state.gold, 500);
const researchGold = state.gold;
debug.research('Temple');
assert.equal(state.gold, researchGold - 200, 'Temple research should use ordinary earned gold');
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

const oldV4 = JSON.parse(storage.value);
oldV4.version = 4;
oldV4.fog = oldV4.fog.slice(0, 23);
const oldFog = oldV4.fog.map(row => row.slice());
const oldPositions = oldV4.pawns.map(p => [p.id, p.x, p.y]);
const oldBuildings = oldV4.buildings.map(b => [b.id, b.x, b.y, b.w, b.h]);
const migrationRaw = JSON.stringify(oldV4);
const migrationContext = {...context, localStorage: {
  getItem() { return migrationRaw; }, setItem(_key, value) { this.value = value; }, value: migrationRaw,
}};
migrationContext.window = migrationContext;
vm.runInNewContext(script, migrationContext);
const migrated = migrationContext.__WAYFARER_DEBUG__.state();
assert.equal(migrated.version, 6, 'v4 saves should migrate through to v6');
assert.equal(migrated.fog.length, 33);
assert.deepEqual(Array.from(migrated.fog.slice(0, 23), row => Array.from(row)), oldFog, 'migration must preserve every old fog cell');
assert.deepEqual(Array.from(migrated.pawns, p => [p.id, p.x, p.y]), oldPositions, 'migration must preserve pawn identities and coordinates');
assert.deepEqual(Array.from(migrated.buildings, b => [b.id, b.x, b.y, b.w, b.h]), oldBuildings, 'migration must preserve building identities and coordinates');
assert.ok(migrated.fog.slice(23).every(row => row.slice(0, 25).every(v => v === false)));
assert.ok(migrated.fog.slice(23).every(row => row.slice(25).every(v => v === true)));
const migratedOnce = JSON.stringify(migrated);
assert.equal(JSON.stringify(migrationContext.__WAYFARER_DEBUG__.migrate(migrated)), migratedOnce, 'v5 migration should be idempotent');
console.log('Expanded-map v4 to v5 migration checks passed');

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
  assert.equal(JSON.parse(saved.get('wayfarerGuildV2')).version, 6);
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

const humanoidSpriteTiles = new Set([84, 85, 86, 87, 88, 96, 97, 98, 99, 100]);
const jobSprites = debug.jobSprites();
for (const [job, tile] of Object.entries(jobSprites)) {
  assert.ok(humanoidSpriteTiles.has(tile), `${job} must use a humanoid tile, not an atlas prop (${tile})`);
}
assert.notEqual(jobSprites.Archer, 87, 'Archer must not use the Viking sprite');
assert.notEqual(jobSprites.Farmer, 92, 'Farmer must not use the cage/chest sprite');
assert.notEqual(jobSprites.Blacksmith, 90, 'Blacksmith must not use the chest sprite');
console.log('Job sprite atlas mapping checks passed');

const punyJobs = debug.punyJobFiles();
assert.deepEqual(Object.keys(punyJobs).sort(), ['adventurer','archer','cleric','fighter','knight','mage','ninja','paladin','wizard']);
for (const file of [...new Set(Object.values(punyJobs)), 'Slime.png', 'CC0-LICENSE.txt']) {
  assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', 'assets', 'art', 'puny-characters', file)), `CC0 sprite asset ${file} must be shipped`);
}
assert.equal(punyJobs.archer, 'Archer-Green.png');
assert.equal(punyJobs.mage, 'Mage-Red.png');
assert.equal(punyJobs.knight, 'Soldier-Blue.png');
console.log('CC0 Puny Characters asset mapping checks passed');

const idleHand = debug.punyHandAnchor(0, 48, 1);
assert.ok(Math.abs(idleHand.x - 5.25) < .001 && Math.abs(idleHand.y - 6) < .001, 'idle weapon grip must use the Puny hand, not a floating side offset');
const mirroredHand = debug.punyHandAnchor(0, 48, -1);
assert.equal(mirroredHand.x, -idleHand.x, 'weapon grip must mirror with pawn facing');
const walkingHands = [1,2,3,4].map(frame => debug.punyHandAnchor(frame, 48, 1));
assert.ok(new Set(walkingHands.map(hand => `${hand.x},${hand.y}`)).size > 1, 'weapon grip must follow changing walk-frame hands');
assert.ok(walkingHands.every(hand => Math.hypot(hand.x, hand.y) < 11), 'weapon grips must remain attached to the body silhouette');
console.log('Frame-attached carried-equipment anchor checks passed');

const tinyMonsters = debug.tinyMonsterTiles();
assert.deepEqual(Object.keys(tinyMonsters).sort(), ['bat','bee','boar','cyclops','dragon','ghost','goblin','mushroom','orc','skeleton','slime','wolf']);
assert.equal(new Set(Object.values(tinyMonsters)).size, 12, 'Every monster silhouette must use a distinct species tile');
assert.equal(tinyMonsters.boar, 140);
assert.equal(tinyMonsters.bat, 118);
assert.equal(tinyMonsters.goblin, 10);
for (const file of ['tilemap.png', 'CC0-LICENSE.txt']) {
  assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', 'assets', 'art', 'tiny-creatures', file)), `CC0 Tiny Creatures asset ${file} must be shipped`);
}
console.log('CC0 Tiny Creatures monster mapping checks passed');

const weaponPawn = state.pawns[0];
const weaponCases = [
  ['Bronze Sword', 'melee', null, 'bronze', 1],
  ['Iron Axe', 'axe', 118, 'iron', 1.08],
  ['Hunter Bow', 'arrow', null, 'hunter', 1.1],
  ['Oak Staff', 'magic', null, 'oak', 1.08],
  ['War Hammer', 'hammer', 117, 'war', 1.12],
];
for (const [base, kind, atlas, style, scale] of weaponCases) {
  weaponPawn.equipment.weapon = {base, name: base, slot: 'weapon'};
  const visual = debug.weaponVisual(weaponPawn);
  assert.equal(visual.kind, kind, `${base} should select its carried weapon silhouette`);
  assert.equal(visual.atlas, atlas);
  assert.equal(visual.style, style, `${base} should retain a recognizable carried-gear identity`);
  assert.equal(visual.scale, scale, `${base} should use its authored carried size`);
  assert.equal(visual.equipped, true);
}
weaponPawn.equipment.weapon = null;
weaponPawn.job = 'Archer';
assert.deepEqual({...debug.weaponVisual(weaponPawn)}, {kind: 'arrow', base: 'Training Bow', equipped: false, atlas: null, style: 'training', scale: 1}, 'unarmed jobs should carry a readable training weapon');
debug.attackAnim().delete(weaponPawn.id);
weaponPawn.facing = -1;
assert.equal(debug.weaponPose(weaponPawn, 'town').facing, -1, 'idle carried equipment should follow travel facing');
debug.attackAnim().set(weaponPawn.id, {scope: 'town', life: .2, max: .34, dx: 2, dy: 0, kind: 'arrow'});
assert.deepEqual({...debug.weaponPose(weaponPawn, 'town')}.attacking, true, 'carried weapon should enter its attack pose');
assert.equal(debug.weaponPose(weaponPawn, 'town').facing, 1, 'attack target direction should override stale travel facing');
debug.attackAnim().set(weaponPawn.id, {scope: 'town', life: .21, max: .46, dx: 0, dy: 3, kind: 'arrow'});
const southBowPose = debug.weaponPose(weaponPawn, 'town');
debug.attackAnim().set(weaponPawn.id, {scope: 'town', life: .21, max: .46, dx: 0, dy: -3, kind: 'arrow'});
const northBowPose = debug.weaponPose(weaponPawn, 'town');
assert.equal(southBowPose.facing, -1, 'near-vertical attacks should preserve the pawn travel facing');
assert.equal(northBowPose.facing, -1, 'near-vertical attacks should not flicker horizontal facing');
assert.ok(southBowPose.angle > northBowPose.angle + 1.5, 'bow aim should visibly distinguish targets north and south');
assert.equal(southBowPose.behind, false, 'south-facing attacks should render the carried weapon in front');
assert.equal(northBowPose.behind, true, 'north-facing attacks should pass behind the body for depth');
const diagonalAim = debug.attackAim('arrow', -2, 2, 1);
assert.equal(diagonalAim.facing, -1);
assert.ok(diagonalAim.tilt > 0, 'down-left targets should produce a downward local bow angle');
debug.attackAnim().delete(weaponPawn.id);
const attackDurations = debug.attackDuration();
assert.ok(attackDurations.hammer > attackDurations.melee, 'hammer attacks should read as heavier than sword attacks');
assert.ok(attackDurations.magic > attackDurations.arrow, 'casting should have time to show its focus and release poses');
const swordWindup = debug.attackPose('melee', .18);
const swordStrike = debug.attackPose('melee', .46);
assert.equal(swordWindup.phase, 'windup');
assert.equal(swordStrike.phase, 'strike');
assert.ok(swordStrike.angle > swordWindup.angle + 1, 'melee strike must swing visibly through its wind-up angle');
const hammerWindup = debug.attackPose('hammer', .3);
assert.equal(hammerWindup.phase, 'windup');
assert.ok(hammerWindup.angle < swordWindup.angle, 'hammer should use a deeper overhead wind-up');
const bowDraw = debug.attackPose('arrow', .45);
const bowRelease = debug.attackPose('arrow', .62);
assert.equal(bowDraw.phase, 'draw');
assert.equal(bowRelease.phase, 'release');
assert.ok(bowDraw.draw > bowRelease.draw, 'bow string should relax when the arrow releases');
const castFocus = debug.attackPose('magic', .4);
const castRelease = debug.attackPose('magic', .55);
assert.equal(castFocus.phase, 'focus');
assert.equal(castRelease.phase, 'cast');
assert.equal(castRelease.pulse, 1, 'staff focus should peak during spell release');
const bowSupport = debug.supportGripTarget({kind: 'arrow'}, {attacking: true, draw: .8}, 22, 1, false);
assert.ok(bowSupport.x < -6 && bowSupport.y === 0, 'bow support hand should follow the pulled string notch');
assert.equal(debug.supportGripTarget({kind: 'arrow'}, {attacking: true, draw: .8}, 22, 1, true), null, 'equipped offhand gear must prevent an impossible third hand');
assert.ok(debug.supportGripTarget({kind: 'hammer'}, {attacking: true}, 20, 1, false).y > 0, 'heavy weapon support hand should brace the lower handle');
assert.equal(debug.supportGripTarget({kind: 'melee'}, {attacking: true}, 20, 1, false), null, 'one-handed swords should not grow a false support arm');
const mirroredWeaponPoint = debug.weaponPoint({angle: 0, facing: -1}, 10, 20, {x: 3, y: 2});
assert.equal(mirroredWeaponPoint.x, 7, 'support grip transform should mirror with combat facing');
assert.equal(mirroredWeaponPoint.y, 22, 'support grip transform should retain vertical weapon position');
assert.equal(debug.attackTrail('melee', .2), 0, 'weapon trail must stay hidden during anticipation');
assert.ok(debug.attackTrail('melee', .405) > .99, 'sword trail should peak at mid-swing');
assert.equal(debug.attackTrail('melee', .7), 0, 'weapon trail must clear during recovery');
assert.ok(debug.attackTrail('hammer', .495) > .99, 'hammer trail should follow its slower strike window');
assert.ok(debug.attackTrail('arrow', .56) > .99, 'bow release streak should peak as the string snaps forward');
assert.ok(debug.attackTrail('magic', .53) > .99, 'staff aura should peak during spell release');
assert.equal(debug.combatBarkText('arrow'), 'Loose!');
assert.equal(debug.combatBarkText('hammer'), 'Smash!');
assert.equal(debug.combatBarkText('magic', true), 'Hah!!');
debug.barks().splice(0);
const barkPawn = {id: 987654};
assert.equal(debug.queueCombatBark(barkPawn, 'arrow', false, 'town', 3, 4, .2), true, 'first attack bark should be queued');
assert.equal(debug.queueCombatBark(barkPawn, 'arrow', false, 'town', 3, 4, .2), false, 'same pawn should not flood repeated barks');
const queuedBark = debug.barks()[0];
assert.equal(queuedBark.scope, 'pending:town');
debug.updateBarks(.1);
assert.equal(queuedBark.life, queuedBark.max, 'bark lifetime must not decay before weapon release');
debug.updateBarks(.11);
assert.equal(queuedBark.scope, 'town', 'bark should appear at the release frame');
assert.equal(debug.queueCombatBark(barkPawn, 'melee', true, 'town', 3, 4, 0), true, 'critical bark may override the ordinary cooldown');
debug.barks().splice(0);
console.log('Weapon-family attack pose checks passed');
const meleeTiming = debug.attackTiming('melee');
const bowTiming = debug.attackTiming('arrow');
assert.ok(meleeTiming.impact > 0 && meleeTiming.impact < meleeTiming.duration, 'melee impact should land during the visible swing');
assert.equal(bowTiming.impact, bowTiming.release + bowTiming.travel, 'ranged impact should follow draw release and projectile travel');
assert.ok(bowTiming.impact > bowTiming.duration, 'the arrow may arrive after the archer begins recovering');
debug.fx().splice(0);
debug.addFx('hit', 'town', 2, 2, {life: .2, delay: .15});
const delayedFx = debug.fx()[0];
assert.equal(delayedFx.scope, 'pending:town', 'delayed impact must remain hidden during weapon anticipation');
debug.updateFx(.1);
assert.equal(delayedFx.scope, 'pending:town');
assert.equal(delayedFx.life, .2, 'hidden impact lifetime must not decay before contact');
debug.updateFx(.06);
assert.equal(delayedFx.scope, 'town', 'impact should become drawable at the contact frame');
debug.hurtTarget('timing-test', 'town', 1, 1, 2, 1, false, .12);
const preContactOffset = debug.hurtOffset('timing-test', 'town', 32);
assert.equal(preContactOffset[0], 0, 'target must not recoil before weapon contact');
assert.equal(preContactOffset[1], 0, 'target must not recoil before weapon contact');
debug.updateFx(.13);
debug.updateFx(.03);
assert.notEqual(debug.hurtOffset('timing-test', 'town', 32)[0], 0, 'target recoil should begin after weapon contact');
debug.hurtAnim().delete('timing-test');
debug.fx().splice(0);
console.log('Contact-timed combat effect checks passed');
const plainBow = {base: 'Hunter Bow', name: 'Hunter Bow', slot: 'weapon', atk: 5, def: 0, mag: 0, spd: 1, hp: 0};
const plainAxe = {base: 'Iron Axe', name: 'Iron Axe', slot: 'weapon', atk: 7, def: 0, mag: 0, spd: -1, hp: 0};
assert.ok(debug.itemScore(weaponPawn, plainBow) > debug.itemScore(weaponPawn, plainAxe), 'Archer auto-equip should favor a bow over a slightly stronger off-role axe');
const giftShield = {id: 89989, base: 'Wood Shield', name: 'Gifted Wood Shield', slot: 'offhand', rarity: 'rare', atk: 0, def: 4, mag: 0, spd: 0, hp: 0, score: 4};
const strongerShield = {id: 89988, base: 'Round Shield', name: 'Stronger Round Shield', slot: 'offhand', rarity: 'epic', atk: 0, def: 9, mag: 0, spd: 0, hp: 0, score: 9};
state.stash.push(giftShield);
const giftSatisfaction = weaponPawn.satisfaction;
assert.equal(debug.giveItem(weaponPawn, giftShield.id), true, 'selected pawn should accept available gifted equipment');
assert.equal(weaponPawn.equipment.offhand.id, giftShield.id);
assert.equal(weaponPawn.lockedSlots.offhand, true, 'gifted slot should be reserved against auto-equip');
assert.equal(debug.offhandVisual(weaponPawn).kind, 'woodShield');
assert.equal(debug.rarityColor(giftShield), '#69aaff', 'rare carried gear should have a readable blue accent');
assert.ok(debug.fx().some(f => f.type === 'number' && f.text === 'EQUIPPED' && f.color === '#69aaff'), 'gifting should create a rarity-colored on-map equip reaction');
assert.ok(debug.celebrate().has(weaponPawn.id), 'the receiving pawn should visibly celebrate a gift');
assert.ok(weaponPawn.satisfaction > giftSatisfaction, 'equipment gifts should improve satisfaction');
for (const [base, kind] of [['Leather Coat', 'coat'], ['Iron Mail', 'mail'], ['Mage Robe', 'robe'], ['Traveler Cloak', 'cloak']]) {
  weaponPawn.equipment.armor = {base, name: base, slot: 'armor'};
  assert.equal(debug.armorVisual(weaponPawn).kind, kind, `${base} should select its armor silhouette`);
}
state.stash.push(strongerShield);
debug.equipAll();
assert.equal(weaponPawn.equipment.offhand.id, giftShield.id, 'auto-equip must preserve deliberately gifted equipment');
const shopPawn = state.pawns[1];
const shopSnapshot = {equipment: shopPawn.equipment, lockedSlots: shopPawn.lockedSlots, coins: shopPawn.coins, satisfaction: shopPawn.satisfaction};
shopPawn.equipment = {
  weapon: {id: 91001, base: 'Bronze Sword', slot: 'weapon', atk: 1},
  armor: {id: 91002, base: 'Leather Coat', slot: 'armor', def: 1},
  offhand: {id: 91003, base: 'Wood Shield', slot: 'offhand', def: 1},
  accessory: {id: 91004, base: 'Lucky Ring', slot: 'accessory', atk: 1},
};
shopPawn.lockedSlots = {weapon: true, armor: true, offhand: true, accessory: true};
shopPawn.coins = 100;
const shop = {type: 'WeaponShop', price: 0, quality: 13, level: 5, uses: 0, income: 0, appeal: 0};
debug.useBuilding(shopPawn, shop, 100);
assert.equal(shopPawn.coins, 100, 'autonomous shop visits must not replace or charge for player-reserved equipment');
assert.deepEqual(Object.values(shopPawn.equipment).map(i => i.id), [91001, 91002, 91003, 91004]);
shopPawn.equipment = {weapon: null, armor: null, offhand: null, accessory: null};
shopPawn.lockedSlots = {};
debug.useBuilding(shopPawn, shop, 100);
assert.equal(shopPawn.coins, 72, 'an adventurer with an open slot should autonomously buy shop equipment');
assert.ok(Object.values(shopPawn.equipment).some(Boolean), 'a shop purchase should immediately become carried equipment');
Object.assign(shopPawn, shopSnapshot);
const returnedCharm = {id: 91005, base: 'Vital Charm', name: 'Returned Vital Charm', slot: 'accessory', rarity: 'uncommon', def: 2};
weaponPawn.equipment.accessory = returnedCharm;
weaponPawn.lockedSlots.accessory = true;
assert.equal(debug.unequipItem(weaponPawn, 'accessory'), true, 'equipped gear should return to the guild stash');
assert.equal(weaponPawn.equipment.accessory, null);
assert.equal(weaponPawn.lockedSlots.accessory, undefined, 'returning gear should release only that slot reservation');
assert.ok(state.stash.some(i => i.id === returnedCharm.id), 'returned equipment identity must be preserved in the stash');
weaponPawn.equipment.weapon = {id: 89990, base: 'War Hammer', name: 'War Hammer', slot: 'weapon', rarity: 'common', atk: 6, def: 2, mag: 0, spd: -1, hp: 0, score: 8};
debug.save(false);
const weaponSaveRaw = storage.value;
const weaponSaveContext = {...context, localStorage: {
  getItem() { return weaponSaveRaw; }, setItem(_key, value) { this.value = value; }, value: weaponSaveRaw,
}};
weaponSaveContext.window = weaponSaveContext;
vm.runInNewContext(script, weaponSaveContext);
const restoredWeaponPawn = weaponSaveContext.__WAYFARER_DEBUG__.state().pawns.find(p => p.id === weaponPawn.id);
assert.equal(restoredWeaponPawn.equipment.weapon.id, 89990, 'equipped weapon identity should survive save/reload');
assert.deepEqual({...weaponSaveContext.__WAYFARER_DEBUG__.weaponVisual(restoredWeaponPawn)}, {kind: 'hammer', base: 'War Hammer', equipped: true, atlas: 117, style: 'war', scale: 1.12});
assert.equal(restoredWeaponPawn.equipment.offhand.id, giftShield.id, 'gifted offhand should survive save/reload');
assert.equal(restoredWeaponPawn.lockedSlots.offhand, true, 'gift reservation should survive save/reload');
weaponPawn.equipment.weapon = null;
console.log('Persistent carried-equipment mapping and gifting checks passed');

const reviewState = debug.state();
const reviewPawn = reviewState.pawns[0];
const bossGold = reviewState.gold, alertBefore = reviewState.bossAlert;
const questBoss = {id: 89991, name: 'Contract Ogre', kind: 'Boss', level: 3, x: 30, y: 10,
  maxHp: 100, hp: 0, atk: 1, def: 1, dead: false, boss: false, questBoss: true, shining: false};
reviewState.monsters.push(questBoss);
debug.killMonster(questBoss, reviewPawn);
assert.ok(reviewState.gold > bossGold, 'quest boss should grant boss-scale gold rewards without a token currency');
assert.equal(reviewState.bossAlert, alertBefore, 'quest boss must not clear an unrelated roaming boss alert');

const dungeonParty = reviewState.pawns.slice(0, 2);
const dungeonQuest = {id: 89992, type: 'Dungeon', diff: 1, name: 'KO Contract', reward: 1, pop: 1,
  party: dungeonParty.map(p => p.id), dungeon: {party: {}}};
for (const [i, p] of dungeonParty.entries()) {
  p.ko = false; p.questing = true; p.hp = 20;
  dungeonQuest.dungeon.party[p.id] = {hp: i ? 10 : 0, ko: i === 0};
}
reviewState.activeQuest = dungeonQuest;
debug.finishQuest(false);
assert.equal(dungeonParty[0].ko, true, 'dungeon KO must propagate back to the town pawn');
assert.equal(dungeonParty[0].hp, 0, 'dungeon KO must not revive at one HP');
dungeonParty[0].ko = false; dungeonParty[0].hp = 20; dungeonParty[0].task = 'Idle';
console.log('Quest-boss rewards and dungeon KO propagation checks passed');

const fieldState = debug.state();
for (const monster of fieldState.monsters) monster.dead = true;
for (const p of fieldState.pawns.filter(p => p.resident)) {
  p.ko = false; p.questing = false; p.energy = p.hunger = p.morale = 100;
  p.perm.atk = 80; p.perm.def = 30; p.hp = 10000;
  p.x = 12; p.y = 16;
}
fieldState.gold = 1000;
fieldState.wood = fieldState.ore = fieldState.herbs = fieldState.food = 0;
const fieldQuest = {id: 90001, type: 'Mob', diff: 1, name: 'Visible Monster Sweep',
  cost: 1, reward: 10, pop: 1, duration: 10, target: 'Goblin'};
const fieldStartGold = fieldState.gold;
debug.startQuest(fieldQuest, false);
assert.equal(fieldState.gold, fieldStartGold - fieldQuest.cost, 'field quest should charge its advertised cost exactly once');
assert.ok(fieldState.activeQuest?.field, 'field quest should create a physical operation');
const questParty = fieldState.activeQuest.party.map(id => fieldState.pawns.find(p => p.id === id));
const startPositions = questParty.map(p => [p.x, p.y]);
const objectiveIds = fieldState.activeQuest.field.monsterIds.slice();
assert.ok(objectiveIds.length >= 6, 'Mob quest should spawn a visible monster pack');
assert.ok(objectiveIds.every(id => fieldState.monsters.some(m => m.id === id && m.questId === fieldQuest.id)));
assert.ok(objectiveIds.every(id => {
  const m = fieldState.monsters.find(m => m.id === id);
  return fieldState.fog[Math.round(m.y)][Math.round(m.x)] === false;
}), 'quest objectives should be visible when the operation starts');
let sawFight = false, sawGather = false, sawReturn = false, sawCargo = false;
for (let i = 0; i < 12000 && fieldState.activeQuest; i++) {
  debug.update(1/30);
  const phase = fieldState.activeQuest?.field?.phase;
  sawFight ||= phase === 'fight';
  sawGather ||= phase === 'gather';
  sawReturn ||= phase === 'return';
  sawCargo ||= questParty.some(p => p.questCarry);
}
assert.ok(questParty.some((p, i) => p.x !== startPositions[i][0] || p.y !== startPositions[i][1]), 'party must travel on the map');
assert.ok(sawFight && sawGather && sawReturn && sawCargo, `quest must visibly fight, gather, carry and return (${[sawFight,sawGather,sawReturn,sawCargo]})`);
assert.equal(fieldState.activeQuest, null, 'quest completes only after the party returns');
assert.ok(fieldState.questsCleared > 0);
assert.ok(fieldState.wood + fieldState.ore + fieldState.herbs + fieldState.food > 0, 'hauled resources deposit after return');
assert.ok(questParty.every(p => !p.questing && !p.questCarry), 'party resumes normal town life');
console.log('Physical field quest travel, monster pack, gathering, hauling and return checks passed');

for (const p of fieldState.pawns.filter(p => p.resident)) {
  p.ko = false; p.questing = false; p.energy = p.hunger = 100; p.hp = 10000;
}
const saveQuest = {id: 90002, type: 'Mob', diff: 1, name: 'Saved Field Sweep',
  cost: 1, reward: 10, pop: 1, duration: 10, target: 'Beast'};
debug.startQuest(saveQuest, false);
for (let i = 0; i < 12000 && fieldState.activeQuest?.field?.phase !== 'return'; i++) debug.update(1/30);
assert.equal(fieldState.activeQuest?.field?.phase, 'return', 'save fixture should reach the hauling phase');
debug.save(false);
const midQuestRaw = storage.value;
const midSaved = JSON.parse(midQuestRaw);
assert.ok(midSaved.activeQuest?.field && midSaved.activeQuest.party.length >= 2);
const midContext = {...context, localStorage: {
  getItem() { return midQuestRaw; }, setItem(_key, value) { this.value = value; }, value: midQuestRaw,
}};
midContext.window = midContext;
vm.runInNewContext(script, midContext);
const resumed = midContext.__WAYFARER_DEBUG__;
const resumedState = resumed.state();
assert.equal(resumedState.activeQuest.id, saveQuest.id);
assert.deepEqual(Array.from(resumedState.activeQuest.field.monsterIds), Array.from(midSaved.activeQuest.field.monsterIds));
for (const id of resumedState.activeQuest.party) {
  const before = midSaved.pawns.find(p => p.id === id), after = resumedState.pawns.find(p => p.id === id);
  assert.equal(after.x, before.x); assert.equal(after.y, before.y); assert.equal(after.questing, true);
}
for (let i = 0; i < 12000 && resumedState.activeQuest; i++) resumed.update(1/30);
assert.equal(resumedState.activeQuest, null, 'saved field operation should finish after reload');
console.log('Mid-quest physical operation save/resume check passed');
