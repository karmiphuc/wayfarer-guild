// Player-bot soak: plays N in-game months with a simple greedy strategy and reports pacing.
// Usage: node tests/bot.mjs [months=24] [seed=1] [charter=first offered]
import { newGame, maxHp, defOf } from '../js/state.js';
import { Sim, DT, WEEK_SECONDS } from '../js/sim.js';
import { FAC, DECOR, ITEMS, JOBS, EVENTS } from '../js/data.js';

const months = +(process.argv[2] || 24), seed = +(process.argv[3] || 1);
const s = newGame(seed), sim = new Sim(s, {});
if (process.argv[4]) s.charterChoices = [process.argv[4]];
const cErr = sim.chooseCharter(s.charterChoices[0]); if (cErr) throw new Error('charter: ' + cErr);
const WANT = ['weapon', 'house', 'item', 'house', 'dojo', 'smith', 'armor', 'bakery', 'shrine', 'house', 'inn', 'stable', 'tower', 'tavern', 'igloo', 'house'];
const DECO = ['flower', 'treeGreen', 'lamp', 'treePink', 'bench', 'cart', 'bigPink', 'crystal', 'statue'];
let built = [];
function tryBuild(type) {
  const d = defOf(type), t = s.town;
  for (let y = t.y0; y < t.y1; y++) for (let x = t.x0; x < t.x1; x++) if (!sim.canPlace(type, x, y)) { sim.build(type, x, y); built.push(type); return true; }
  return false;
}
const t0 = performance.now();
const stepsPerWeek = WEEK_SECONDS / DT;
for (let w = 0; w < months * 4; w++) {
  for (let i = 0; i < stepsPerWeek; i++) sim.step();
  // build next wanted facility when affordable (keep a 400G buffer)
  const next = WANT.find(t => !(FAC[t].unique && s.buildings.some(b => b.type === t)) && s.buildings.filter(b => b.type === t).length < WANT.filter(x => x === t).length);
  if (next && s.gold > sim.cost(next) + 400 && (!FAC[next].rank || s.stars >= FAC[next].rank - 1)) tryBuild(next);
  else if (s.gold > 1500) { const d = DECO.filter(k => !DECOR[k].rank || s.stars >= DECOR[k].rank - 1); tryBuild(d[w % d.length]); }
  // upgrades
  if (s.gold > 3000) { const b = s.buildings.filter(b => FAC[b.type] && b.lv < 5 && FAC[b.type].cost).sort((p, q) => q.sales - p.sales)[0]; if (b) sim.upgrade(b); }
  // the traveling merchant: buy the cheapest licence when rich
  const mh = sim.happening('merchant'), mo = mh && mh.data.offer.slice().sort((p, q) => p.price - q.price)[0];
  if (mo && s.gold > mo.price + 1500) sim.buyMerchant(mo.id);
  // develop gear
  for (const id in ITEMS) if (!s.unlocked[id] && ITEMS[id].dev && s.gold > ITEMS[id].price * 1.5 + 500) sim.develop(id);
  // quests
  if (s.quests.length) {
    const choices = s.quests.filter(q => q.fee < s.gold - 200 && !s.activeQuests.some(o => o.kind === q.kind)).sort((a, b) => (b.boss ? 1 : 0) - (a.boss ? 1 : 0) || a.zone - b.zone);
    for (const q of choices) {
      if (s.activeQuests.some(o => o.kind === q.kind)) continue;
      const party = sim.autoQuestParty(q.id);
      if (party.length < 4) continue;
      const extra = sim.questCandidates().filter(a => !party.includes(a.id) && a.lv >= sim.questLevel(q)).slice(0, 4);
      if (s.gold > sim.questCost(q, party.length + extra.length) + 1500) party.push(...extra.map(a => a.id));
      if (s.gold < sim.questCost(q, party.length) + 200) continue;
      const e = sim.startQuest(q.id, party); if (e) throw new Error('quest: ' + e);
    }
  }
  // events and jobs
  if (s.tp >= 40 && s.buildings.length > 18) sim.runEvent('expand');
  else if (s.tp >= 25) sim.runEvent('contest');
  const order = Object.keys(JOBS).sort((p, q) => JOBS[q].tier - JOBS[p].tier);
  for (const a of s.advs) if (a.resident) for (const j of order) if (!sim.canChangeJob(a, j) && (JOBS[j].tier > JOBS[a.job].tier || (a.jobLv[a.job] >= 10 && !a.jobLv[j]))) { sim.changeJob(a, j); break; }
  if (w % 4 === 3) {
    const r = s.advs.filter(a => a.resident);
    console.log(`Y${s.time.year}M${String(s.time.month).padStart(2)} ★${s.stars} gold=${String(s.gold).padStart(6)} inc=${String(s.stats.lastIncome).padStart(5)} tp=${String(s.tp).padStart(3)} pop=${String(Math.floor(s.pop)).padStart(5)} res=${String(r.length).padStart(2)}/${String(s.advs.length).padStart(2)} avgLv=${(r.reduce((n, a) => n + a.lv, 0) / Math.max(1, r.length)).toFixed(1).padStart(4)} maxLv=${String(Math.max(0, ...s.advs.map(a => a.lv))).padStart(2)} blds=${s.buildings.length} quests=${s.cleared} bosses=${Object.keys(s.bossesBeaten).length} titles=${Object.keys(s.titles).length} gear=${Object.keys(s.unlocked).length} pets=${s.monsters.length}`);
  }
}
const ms = performance.now() - t0, steps = months * 4 * stepsPerWeek;
console.log(`\n${steps} steps in ${ms.toFixed(0)}ms (${(ms / steps * 1000).toFixed(1)}us/step), entities: ${s.advs.length} advs, ${s.mons.length} mons`);
console.log('jobs:', Object.entries(s.advs.reduce((m, a) => (m[a.job] = (m[a.job] || 0) + 1, m), {})).map(e => e.join(':')).join(' '));
console.log('titles:', Object.keys(s.titles).join(', '));
console.log('perks held:', Object.entries(s.advs.flatMap(a => a.perks).reduce((m, p) => (m[p] = (m[p] || 0) + 1, m), {})).map(e => e.join(':')).join(' '));
console.log('gear owned:', Object.entries(s.advs.flatMap(a => Object.values(a.eq).filter(Boolean)).reduce((m, p) => (m[p] = (m[p] || 0) + 1, m), {})).map(e => e.join(':')).join(' '));
console.log('save size:', JSON.stringify(s).length, 'bytes');
console.log('charter:', s.charter, '· happenings seen:', s.happenLog.map(h => h.id).join(' '));
