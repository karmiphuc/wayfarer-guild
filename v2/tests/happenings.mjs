// Forces every happening and every charter once and simulates around them; prints what happened.
//   node v2/tests/happenings.mjs
import { newGame } from '../js/state.js';
import { Sim, DT, WEEK_SECONDS } from '../js/sim.js';
import { HAPPENINGS, CHARTERS } from '../js/data.js';
const WEEK = WEEK_SECONDS / DT;
let fail = 0;
for (const H of HAPPENINGS) {
  const s = newGame(900 + H.weight), sim = new Sim(s, {}); s.stars = 3; s.gold = 5000;
  for (let i = 0; i < WEEK; i++) sim.step();
  s.happen = []; const err = sim.startHappening(H.id);
  const before = { gold: s.gold, tp: s.tp, pop: Math.round(s.pop), crystal: s.mats.crystal, unlocked: Object.keys(s.unlocked).length };
  let breach = 0, raiders = s.mons.filter(m => m.raid && m.hp > 0).length, golden = s.mons.some(m => m.golden);
  if (H.id === 'merchant') { const o = sim.happening('merchant').data.offer; if (o[0]) sim.buyMerchant(o[0].id); }
  for (let i = 0; i < WEEK * (H.weeks + 0.5); i++) sim.step();
  const after = { gold: s.gold, tp: s.tp, pop: Math.round(s.pop), crystal: s.mats.crystal, unlocked: Object.keys(s.unlocked).length };
  const bad = err || s.happen.some(h => h.id === H.id) ? `still active/err=${err}` : '';
  if (bad) fail++;
  console.log(`${H.id.padEnd(9)} ${bad ? 'FAIL ' + bad : 'ok  '} raiders=${raiders} golden=${golden} npcs=${s.npcs.length}  gold ${before.gold}→${after.gold}  tp ${before.tp}→${after.tp}  pop ${before.pop}→${after.pop}  crystal ${before.crystal}→${after.crystal}  unlocked ${before.unlocked}→${after.unlocked}`);
  console.log('          log:', s.log.slice(0, 3).map(l => l.text.slice(0, 90)).join(' | '));
}
for (const C of CHARTERS) {
  const s = newGame(1234), sim = new Sim(s, {}); s.charterChoices = [];
  const g0 = s.gold, b0 = s.buildings.length, a0 = s.advs.length, err = sim.chooseCharter(C.id);
  for (let i = 0; i < WEEK * 4; i++) sim.step();
  if (err) fail++;
  console.log(`charter ${C.id.padEnd(9)} ${err ? 'FAIL ' + err : 'ok'}  gold ${g0}→${s.gold}  buildings ${b0}→${s.buildings.length}  advs ${a0}→${s.advs.length}`);
}
// determinism: same seed + same choices = same state
const run = () => { const s = newGame(4321), sim = new Sim(s, {}); sim.chooseCharter(s.charterChoices[1]); for (let i = 0; i < WEEK * 12; i++) sim.step(); return JSON.stringify({ ...s, fx: [] }); };
const same = run() === run();
if (!same) fail++;
console.log('deterministic replay (12 weeks, happenings on):', same);
process.exit(fail ? 1 : 0);
