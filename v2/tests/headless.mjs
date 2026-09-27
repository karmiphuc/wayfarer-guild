// Headless sim soak: runs N in-game months with a scripted "player" and prints the economy.
import { newGame } from '../js/state.js';
import { Sim, DT, WEEK_SECONDS } from '../js/sim.js';
const months = +(process.argv[2] || 3);
const s = newGame(12345); const sim = new Sim(s, {});
const t0 = performance.now(); let steps = 0;
const script = [['weapon', 42, 20], ['house', 27, 19], ['item', 44, 30], ['smith', 27, 30], ['dojo', 30, 33]];
const stepsPerMonth = WEEK_SECONDS * 4 / DT;
for (let m = 0; m < months; m++) {
  for (let i = 0; i < stepsPerMonth; i++) { sim.step(); steps++; }
  const sc = script.shift(); if (sc) { const err = sim.build(...sc); if (err) console.log('build', sc[0], 'ERR', err); }
  if (!s.quest && s.quests.length && s.advs.length) { const q = s.quests[0]; const ids = s.advs.slice().sort((a, b) => b.lv - a.lv).slice(0, 3).map(a => a.id); const e = sim.startQuest(q.id, ids); if (e) console.log('quest', e); }
  const r = s.advs.filter(a => a.resident).length;
  console.log(`Y${s.time.year}M${s.time.month} gold=${s.gold} tp=${s.tp} pop=${s.pop.toFixed(0)} stars=${s.stars} advs=${s.advs.length} res=${r} mons=${s.mons.filter(m=>m.hp>0).length} kills=${s.stats.kills} lastInc=${s.stats.lastIncome} cleared=${s.cleared} unlocked=${Object.keys(s.unlocked).length} titles=${Object.keys(s.titles).join(',')}`);
}
const ms = performance.now() - t0;
console.log(`steps=${steps} ${(ms / steps * 1000).toFixed(1)}us/step`);
console.log(s.advs.map(a => `${a.name}:${a.job}:L${a.lv}:hp${a.hp}:g${a.gold}:sat${Math.round(a.sat)}:${a.task?.type || (a.inside ? 'in' : a.ko ? 'KO' : '-')}:${a.eq.weapon||''}`).join('\n'));
console.log(s.log.slice(0, 12).map(l => l.t + ' ' + l.text).join('\n'));
