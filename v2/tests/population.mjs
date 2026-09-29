import assert from 'node:assert/strict';
import { HAPPENINGS, VISITOR_CAP } from '../js/data.js';
import { makeAdventurer, newGame, spawnAdventurer } from '../js/state.js';
import { Sim } from '../js/sim.js';

const edge = { x: 38, y: 50 };

function addAdventurer(s, R, resident = false) {
  const a = makeAdventurer(s, R);
  Object.assign(a, { resident, x: edge.x, y: edge.y, px: edge.x, py: edge.y });
  s.advs.push(a);
  return a;
}

function fillTo(s, R, count, resident = false) {
  while (s.advs.length < count) addAdventurer(s, R, resident);
}

assert.deepEqual(VISITOR_CAP, [5, 5, 10, 15, 20, 30]);

// Every rank uses the total adventurer count. The factory itself remains unrestricted.
for (let stars = 0; stars <= 5; stars++) {
  const s = newGame(7100 + stars), sim = new Sim(s, {}), cap = VISITOR_CAP[stars];
  s.stars = stars; s.advs = [];
  for (let i = 0; i < cap; i++) assert(spawnAdventurer(s, sim.R, edge));
  const before = { count: s.advs.length, nextId: s.nextId, seed: s.seed, total: s.stats.visitorsTotal };
  assert.equal(spawnAdventurer(s, sim.R, edge), null);
  assert.deepEqual({ count: s.advs.length, nextId: s.nextId, seed: s.seed, total: s.stats.visitorsTotal }, before);
  assert(makeAdventurer(s, sim.R), `makeAdventurer was capped at ${stars} stars`);
  assert.equal(s.advs.length, cap, `factory inserted a pawn at ${stars} stars`);
}

// Resident conversion neither adds a pawn nor frees a slot; animals and pets never consume slots.
{
  const s = newGame(7201), sim = new Sim(s, {}); s.advs = [];
  s.animals.push(...Array.from({ length: 40 }, () => ({ k: 'Dog' })));
  s.monsters.push(...Array.from({ length: 40 }, (_, id) => ({ id: 9000 + id, type: 'warg' })));
  for (let i = 0; i < VISITOR_CAP[0]; i++) assert(spawnAdventurer(s, sim.R, edge));
  const count = s.advs.length;
  for (const a of s.advs) a.resident = true;
  assert.equal(s.advs.length, count);
  assert.equal(spawnAdventurer(s, sim.R, edge), null);
}

// Existing over-cap saves retain every pawn and resume arrivals only after dropping below the cap.
{
  const s = newGame(7202), sim = new Sim(s, {}); s.advs = [];
  fillTo(s, sim.R, VISITOR_CAP[0] + 2, true);
  assert.equal(spawnAdventurer(s, sim.R, edge), null);
  assert.equal(s.advs.length, VISITOR_CAP[0] + 2);
  s.advs.splice(0, 3);
  assert(spawnAdventurer(s, sim.R, edge));
  assert.equal(s.advs.length, VISITOR_CAP[0]);
}

// The regular arrival tick counts residents and stops exactly at the total cap.
{
  const s = newGame(7203), sim = new Sim(s, {});
  for (const a of s.advs) a.resident = true;
  fillTo(s, sim.R, VISITOR_CAP[0] - 1, true);
  sim.R.chance = () => true;
  sim.spawner();
  assert.equal(s.advs.length, VISITOR_CAP[0]);
  sim.spawner();
  assert.equal(s.advs.length, VISITOR_CAP[0]);
}

// Recruitment fills only available slots, then refuses to spend TP while completely full.
{
  const s = newGame(7204), sim = new Sim(s, {}); s.stars = 1; s.tp = 100;
  fillTo(s, sim.R, VISITOR_CAP[1] - 1, true);
  assert.equal(sim.runEvent('recruit'), null);
  assert.equal(s.advs.length, VISITOR_CAP[1]);
  const tp = s.tp;
  assert.match(sim.runEvent('recruit'), /capacity/);
  assert.equal(s.tp, tp);
  assert.equal(s.advs.length, VISITOR_CAP[1]);
}

// A charter's starting resident is safely suppressed when an existing save is already full.
{
  const s = newGame(7205), sim = new Sim(s, {}); s.charterChoices = [];
  fillTo(s, sim.R, VISITOR_CAP[0], true);
  assert.equal(sim.chooseCharter('hunters'), null);
  assert.equal(s.advs.length, VISITOR_CAP[0]);
}

// Legendary wanderers are ineligible at capacity, including the weekly random-event pool.
{
  const s = newGame(7206), sim = new Sim(s, {}); s.stars = 2;
  fillTo(s, sim.R, VISITOR_CAP[2], true);
  const before = { count: s.advs.length, happenings: s.happen.length, log: s.happenLog.length };
  assert.match(sim.startHappening('wanderer'), /capacity/);
  assert.deepEqual({ count: s.advs.length, happenings: s.happen.length, log: s.happenLog.length }, before);

  s.happen = HAPPENINGS.filter(h => h.id !== 'wanderer').map(h => ({ id: h.id, weeks: 1, data: {} }));
  sim.R.chance = () => true;
  sim.rollHappening();
  assert.equal(s.happen.some(h => h.id === 'wanderer'), false);

  s.advs.pop();
  sim.rollHappening();
  assert.equal(s.happen.some(h => h.id === 'wanderer'), true);
  assert.equal(s.advs.length, VISITOR_CAP[2]);
  assert.equal(s.advs.at(-1).legend, true);
}

console.log('population: total adventurer caps and all arrival routes ok');
