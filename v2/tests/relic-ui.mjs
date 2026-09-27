import assert from 'node:assert/strict';
import { FRONTIERS, ITEMS } from '../js/data.js';
import { newGame, makeAdventurer } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { UI } from '../js/ui.js';

const s = newGame(4242), sim = new Sim(s);
s.advs = [];
for (let i = 0; i < 2; i++) {
  const a = makeAdventurer(s, sim.R, 'warrior');
  a.resident = true; a.lv = 12 + i; s.advs.push(a);
}
const [vaultSite, ownedSite] = FRONTIERS;
s.frontier.completed[vaultSite.id] = true;
s.frontier.completed[ownedSite.id] = true;
s.frontier.relics[vaultSite.relic] = null;
s.frontier.relics[ownedSite.relic] = s.advs[0].id;

const ui = Object.create(UI.prototype);
ui.game = { s, sim }; ui.frontierPick = null; ui.relicPick = null;
let html = ui.panel_frontiers();
assert(html.indexOf('Guild Relic Vault') < html.indexOf('<div class="section">Territories'));
assert(html.includes('2/8 earned'));
assert(html.includes('1 ready to assign'));
assert(html.includes(`${ITEMS[vaultSite.relic].name}`));
assert(html.includes('In vault · select to assign'));
assert(html.includes(`Equipped by ${s.advs[0].name}`));
assert(html.includes(`data-act="pickRelic" data-id="${vaultSite.relic}">Manage relic</button>`));

ui.frontierPick = vaultSite.id;
ui.relicPick = vaultSite.relic;
html = ui.panel_frontiers();
assert(html.includes(`Assign ${ITEMS[vaultSite.relic].name}`));
assert(html.includes(`data-focus-key="relic-owner:${vaultSite.relic}:${s.advs[1].id}"`));
assert(html.includes('aria-label="'));
assert(html.includes('stored in the Guild Relic Vault'));

s.unlocked.luckyCharm = true;
s.unlocked.rootheart = true;
const building = type => ({ id: s.nextId++, type, x: 30, y: 30, lv: 1, v: 0, occ: [], visits: 0, sales: 0 });
const itemShop = ui.inspBuilding(building('item'));
assert(itemShop.includes('Life Potion'));
assert(itemShop.includes('Lucky Charm'));
assert(itemShop.includes('Developed accessories are sold here.'));
assert(!itemShop.includes('Rootheart Pendant'));
assert(!itemShop.includes('Traveler Garb'));

const armorShop = ui.inspBuilding(building('armor'));
assert(armorShop.includes('Traveler Garb'));
assert(armorShop.includes('Lucky Charm'));
assert(!armorShop.includes('Life Potion'));
assert(!armorShop.includes('Rootheart Pendant'));

console.log('relic UI: visible vault assignment, captured-site route and accessory shop stock passed');
