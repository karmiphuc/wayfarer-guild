import assert from 'node:assert/strict';
import { newGame, pawnSprite, migrate, MASTERY } from '../js/state.js';
import { JOBS } from '../js/data.js';
import { Sim } from '../js/sim.js';
import { UI } from '../js/ui.js';
import { Renderer } from '../js/render.js';

const s = newGame(905), sim = new Sim(s), [a, b, visitor] = s.advs;
s.tp = 100; s.activeQuests = [];
for (const p of [a, b, visitor]) { p.job = 'villager'; p.jobLv.villager = MASTERY; p.resident = p !== visitor; p.task = null; p.inside = null; }
const portraits = [a.spr, b.spr], equipment = JSON.stringify([a.eq, b.eq]);
const choices = { [a.id]: 'warrior', [b.id]: 'mage' };
s.tp = 5; assert(sim.changeMasteredJobs(choices)); assert.equal(a.job, 'villager'); assert.equal(b.job, 'villager'); assert.equal(s.tp, 5);
s.tp = 100; b.ko = true; assert(sim.changeMasteredJobs(choices)); assert.equal(a.job, 'villager'); b.ko = false;
s.activeQuests = [{ id: 99, members: [b.id] }]; assert(sim.changeMasteredJobs(choices)); s.activeQuests = [];
assert(sim.changeMasteredJobs({ [visitor.id]: 'warrior' }));
assert.equal(sim.changeMasteredJobs(choices), null); assert.equal(s.tp, 90);
assert.deepEqual([a.spr, b.spr], portraits); assert.equal(JSON.stringify([a.eq, b.eq]), equipment);
assert(JOBS.warrior.sprites.includes(pawnSprite(a))); assert(JOBS.mage.sprites.includes(pawnSprite(b)));
assert.equal(pawnSprite(migrate(JSON.parse(JSON.stringify(s))).advs[0]), pawnSprite(a));
const sheet = []; const renderer = { drawShadow() {}, drawChar(key) { sheet.push(key); }, weaponKey() { return null; }, weaponBehind() { return false; } };
Renderer.prototype.drawAdv.call(renderer, s, a); assert.deepEqual(sheet, ['c_' + pawnSprite(a)]); assert.equal(a.spr, portraits[0]);
const ui = Object.create(UI.prototype); ui.game = { s, sim }; ui.masteryChoices = {};
let html = ui.panel_mastered(); assert(html.includes('No residents have mastered their current class yet'));
a.jobLv.warrior = MASTERY; html = ui.panel_mastered(); assert(html.includes(`Next class for ${a.name}`)); assert(!html.includes(`Next class for ${visitor.name}`));
assert(html.includes('Apply selected changes')); assert(ui.panel_people().includes('Mastered residents (1)'));
console.log('mastered residents: atomic batch costs/eligibility, current mastery filter, stable portrait/equipment, class outfit and rendering passed');
