import assert from 'node:assert/strict';
import { FRONTIERS } from '../js/data.js';
import { newGame, makeAdventurer, maxHp, migrate, MASTERY } from '../js/state.js';
import { Sim, WEEK_SECONDS } from '../js/sim.js';
import { UI } from '../js/ui.js';

function setup(seed = 4242) {
  const s = newGame(seed), sim = new Sim(s);
  s.stars = 2; s.gold = 100000; s.advs = [];
  for (let i = 0; i < 24; i++) {
    const a = makeAdventurer(s, sim.R, 'warrior');
    a.lv = 20 + i; a.hp = maxHp(a, s); a.resident = true; a.x = 38; a.y = 36;
    s.advs.push(a);
  }
  sim.refreshQuests();
  return { s, sim };
}
const ids = (s, start, count) => s.advs.slice(start, start + count).map(a => a.id);
function startThree() {
  const { s, sim } = setup(), quests = [];
  for (const [i, kind] of ['outbreak', 'dungeon', 'boss'].entries()) {
    const q = s.quests.find(q => q.kind === kind);
    assert.equal(sim.startQuest(q.id, ids(s, i * 4, 4)), null);
    quests.push(s.activeQuests.find(o => o.id === q.id));
  }
  return { s, sim, quests };
}

// Random defaults are reproducible, not top-four selection; rendering never rerolls them.
{
  const { s, sim } = setup(), other = setup(), q = s.quests.find(q => q.kind === 'boss');
  s.advs[0].ko = true; other.s.advs[0].ko = true;
  s.advs[1].hp = 1; other.s.advs[1].hp = 1;
  s.advs[2].lv = 1; other.s.advs[2].lv = 1;
  const party = sim.autoQuestParty(q.id);
  assert.deepEqual(party, other.sim.autoQuestParty(q.id));
  assert.equal(new Set(party).size, 4);
  assert(party.every(id => !ids(s, 0, 2).includes(id)));
  assert(sim.questReady(q).includes(s.advs[2]));
  assert.notDeepEqual([...party].sort(), ids(s, 20, 4).sort());
  const ui = Object.create(UI.prototype); ui.game = { s, sim }; ui.questPick = q.id; ui.party = party;
  const before = JSON.stringify(s), html = ui.panel_quests();
  assert.equal(ui.panel_quests(), html);
  assert.equal(JSON.stringify(s), before);
  assert(html.indexOf('data-act="startQuest"') < html.indexOf('data-act="togParty"'));
  assert(html.includes('4/8 selected'));
  const selected = party[0];
  assert(html.includes(`<button type="button" class="card party-choice sel" data-act="togParty" data-id="${selected}"`));
  assert(html.includes(`data-focus-key="togParty:${selected}" aria-pressed="true"`));
  assert(html.includes('<span aria-hidden="true">✓</span> Selected'));
  ui.frontierPick = FRONTIERS[0].id; ui.frontierParty = party; ui.relicPick = null;
  const frontierHtml = ui.panel_frontiers();
  assert(frontierHtml.includes(`data-focus-key="togFrontierParty:${selected}" aria-pressed="true"`));
  ui.campPick = s.banditCamps[0].id; ui.campParty = party;
  const campHtml = ui.panel_camps();
  assert(campHtml.includes(`data-focus-key="togCampParty:${selected}" aria-pressed="true"`));
  s.advs[0].jobLv[s.advs[0].job] = MASTERY;
  assert(ui.panel_people().includes('✓ Current job mastered'));
  s.advs = s.advs.slice(3, 5);
  assert.equal(sim.autoQuestParty(q.id).length, 2);
}

// Suggested levels never exclude healthy novices in favor of four max-level veterans.
{
  const { s, sim } = setup(), q = s.quests.find(q => q.kind === 'dungeon');
  for (const [i, a] of s.advs.entries()) { a.lv = i < 20 ? 1 : 99; a.hp = maxHp(a, s); }
  assert(sim.questLevel(q) > 1);
  for (const quest of [...s.quests, sim.frontierQuest(FRONTIERS[0].id), sim.campQuest(s.banditCamps[0].id)]) {
    assert.equal(sim.questReady(quest).length, 24);
    const party = sim.autoQuestParty(quest.id);
    assert.equal(party.length, 4);
    assert(party.some(id => s.advs.find(a => a.id === id).lv === 1));
  }
  const ui = Object.create(UI.prototype); ui.game = { s, sim, audio: { sfx() {} } };
  ui.renderPanel = () => {};
  const selected = new Set(), parties = new Set();
  for (let i = 0; i < 240; i++) {
    ui.act('pickQuest', { id: String(q.id) });
    assert.equal(ui.party.length, 4); assert.equal(new Set(ui.party).size, 4);
    ui.party.forEach(id => selected.add(id));
    parties.add([...ui.party].sort().join(','));
    ui.act('pickQuest', { id: String(q.id) });
    assert.deepEqual(ui.party, []);
  }
  assert.equal(selected.size, s.advs.length);
  assert(parties.size > 200);
  assert.equal(sim.instantQuest(q.id), null);
  assert(s.activeQuests[0].members.some(id => s.advs.find(a => a.id === id).lv === 1));
}

// Charge only validated unique members; failed departures are completely atomic.
for (const count of [1, 4, 5, 8, 9]) {
  const { s, sim } = setup(), q = s.quests.find(q => q.kind === 'outbreak'), gold = s.gold;
  const before = JSON.stringify(s), result = sim.startQuest(q.id, ids(s, 0, count));
  if (count > 8) { assert(result); assert.equal(JSON.stringify(s), before); }
  else { assert.equal(result, null); assert.equal(gold - s.gold, q.fee + Math.max(0, count - 4) * Math.ceil(q.fee / 4)); }
}
{
  const { s, sim } = setup(), q = s.quests[0], party = ids(s, 0, 8);
  s.gold = sim.questCost(q, 8) - 1;
  let before = JSON.stringify(s);
  assert(sim.startQuest(q.id, party)); assert.equal(JSON.stringify(s), before);
  s.gold = 100000; s.advs[0].ko = true; before = JSON.stringify(s);
  assert(sim.startQuest(q.id, party)); assert.equal(JSON.stringify(s), before);
  s.advs[0].ko = false;
  assert.equal(sim.startQuest(q.id, [...party, party[0]]), null);
  assert.equal(s.activeQuests[0].members.length, 8);
}

// Instant departure uses the same seeded defaults and entry fee; failures do not even reroll RNG.
{
  const { s, sim } = setup(), other = setup(), q = s.quests[0], gold = s.gold;
  const expected = other.sim.autoQuestParty(q.id);
  assert.equal(sim.instantQuest(q.id), null);
  assert.deepEqual([...s.activeQuests[0].members].sort(), expected.sort());
  assert.equal(gold - s.gold, q.fee);
  for (const reason of ['gone', 'gold', 'pawns']) {
    const { s, sim } = setup(), q = s.quests[0];
    if (reason === 'gold') s.gold = q.fee - 1;
    if (reason === 'pawns') s.advs.forEach(a => { a.hp = 1; });
    const before = JSON.stringify(s);
    assert(sim.instantQuest(reason === 'gone' ? -1 : q.id));
    assert.equal(JSON.stringify(s), before);
    const ui = Object.create(UI.prototype); ui.game = { s, sim };
    if (reason !== 'gone') assert(ui.panel_quests().includes(`data-act="instantQuest" data-id="${q.id}" disabled`));
  }
  const next = s.quests[0];
  s.advs = s.advs.filter(a => !s.activeQuests[0].members.includes(a.id)).slice(0, 2);
  assert.equal(sim.instantQuest(next.id), null);
  assert.equal(s.activeQuests[1].members.length, 2);
}

// Six parties, including two of each kind, own separate pawns and cave progress.
{
  const { s, sim } = setup();
  for (let i = 0; i < 2; i++) {
    if (i) sim.refreshQuests();
    for (const kind of ['outbreak', 'dungeon', 'boss']) {
      assert.equal(sim.instantQuest(s.quests.find(q => q.kind === kind).id), null);
    }
  }
  assert.equal(s.activeQuests.length, 6);
  assert.equal(new Set(s.activeQuests.flatMap(q => q.members)).size, 24);
  assert.equal(sim.questCandidates().length, 0);
  const roundTrip = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(roundTrip.activeQuests, s.activeQuests);
  const caves = s.activeQuests.filter(q => q.kind === 'dungeon');
  for (const a of s.advs) if (caves.some(q => q.members.includes(a.id))) a.dungeon = true;
  sim.questCheck();
  assert(caves.every(q => q.ft > 0));
  const other = JSON.stringify(caves[1]), otherParty = s.advs.filter(a => caves[1].members.includes(a.id));
  const tasks = otherParty.map(a => JSON.stringify(a.task));
  sim.endDungeon(caves[0], s.advs.filter(a => caves[0].members.includes(a.id)), true);
  assert.equal(s.activeQuests.length, 5);
  assert.equal(JSON.stringify(caves[1]), other);
  assert(otherParty.every(a => a.dungeon));
  assert.deepEqual(otherParty.map(a => JSON.stringify(a.task)), tasks);
  const outbreaks = s.activeQuests.filter(q => q.kind === 'outbreak');
  s.mons.filter(m => m.quest === outbreaks[0].id).forEach(m => { m.hp = 0; });
  sim.checkQuest(outbreaks[0]);
  assert(s.activeQuests.includes(outbreaks[1]));
  assert(s.mons.some(m => m.quest === outbreaks[1].id && m.hp > 0));
}

// Monthly refresh, saves and all termination paths preserve ownership.
for (const outcome of ['clear', 'timeout', 'ko', 'dungeon-win', 'dungeon-fail']) {
  const { s, sim, quests: [outbreak, cave, boss] } = startThree();
  assert.equal(s.activeQuests.length, 3);
  sim.refreshQuests();
  assert(!s.quests.some(q => q.boss === boss.boss));
  const roundTrip = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(roundTrip.activeQuests, s.activeQuests);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(roundTrip))), roundTrip);
  const target = outcome.startsWith('dungeon') ? cave : outbreak;
  const others = s.activeQuests.filter(q => q.id !== target.id);
  const otherMembers = s.advs.filter(a => others.some(q => q.members.includes(a.id)));
  const savedTasks = otherMembers.map(a => JSON.stringify(a.task));
  const savedMobs = s.mons.filter(m => others.some(q => q.id === m.quest)).map(m => [m.id, m.hp]);
  const gold = s.gold;
  if (outcome === 'clear') {
    s.mons.filter(m => m.quest === target.id).forEach(m => { m.hp = 0; });
    sim.checkQuest(target);
  } else if (outcome === 'timeout' || outcome === 'ko') {
    if (outcome === 'timeout') target.t = WEEK_SECONDS * 8;
    else s.advs.filter(a => target.members.includes(a.id)).forEach(a => { a.ko = true; });
    sim.checkQuest(target);
  } else sim.endDungeon(target, s.advs.filter(a => target.members.includes(a.id)), outcome === 'dungeon-win');
  assert.deepEqual(s.activeQuests.map(q => q.id), others.map(q => q.id));
  assert.deepEqual(otherMembers.map(a => JSON.stringify(a.task)), savedTasks);
  assert.deepEqual(s.mons.filter(m => others.some(q => q.id === m.quest)).map(m => [m.id, m.hp]), savedMobs);
  if (outcome !== 'dungeon-win') assert.equal(s.gold - gold, outcome === 'clear' ? target.reward.gold : 0);
  const available = s.quests.find(q => q.kind === target.kind);
  const before = JSON.stringify(s);
  assert(sim.startQuest(available.id, others[0].members)); assert.equal(JSON.stringify(s), before);
}

// All quests advance on the same check, even if earlier entries finish.
{
  const { s, sim, quests: [outbreak, cave, boss] } = startThree();
  s.mons.filter(m => m.quest === outbreak.id || m.quest === boss.id).forEach(m => { m.hp = 0; });
  sim.questCheck();
  assert.deepEqual(s.activeQuests.map(q => q.id), [cave.id]);
  assert.equal(cave.t, 1);
  assert.equal(s.cleared, 2);
}

// Recovered members remain reserved even after the inn replaces their quest task.
{
  const { s, sim } = setup(), q = s.quests.find(q => q.kind === 'outbreak');
  assert.equal(sim.startQuest(q.id, ids(s, 0, 4)), null);
  const a = s.advs[0]; a.task = null; a.ko = false; a.hp = maxHp(a, s);
  assert(!sim.questCandidates().includes(a));
  sim.rally(); assert.equal(a.task, null);
  sim.advStep(a); assert.equal(a.task.qid, q.id);
  const cave = s.quests.find(q => q.kind === 'dungeon'), before = JSON.stringify(s);
  assert(sim.startQuest(cave.id, [a.id])); assert.equal(JSON.stringify(s), before);
}

// Legacy single-quest saves keep the exact ongoing quest and migrate only once.
for (const kind of ['outbreak', 'dungeon', 'boss']) {
  const { s, sim } = setup(), q = s.quests.find(q => q.kind === kind);
  assert.equal(sim.startQuest(q.id, ids(s, 0, 4)), null);
  s.quest = s.activeQuests[0]; delete s.activeQuests;
  const legacy = JSON.parse(JSON.stringify(s)), expected = legacy.quest;
  migrate(legacy);
  assert.deepEqual(legacy.activeQuests, [expected]); assert(!('quest' in legacy));
  const once = JSON.stringify(legacy); migrate(legacy); assert.equal(JSON.stringify(legacy), once);
  const loaded = new Sim(legacy); for (let i = 0; i < 200; i++) loaded.step();
}
{
  const s = newGame(1); delete s.activeQuests; s.quest = null;
  assert.deepEqual(migrate(s).activeQuests, []);
}
console.log('quests: instant departure, random parties, fees, party cap, unlimited parallel lifecycle, UI ordering and save migration passed');
