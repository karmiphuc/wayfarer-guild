// For each boss, find the lowest party level (4 adventurers, mixed jobs, best gear) that wins >= 2 of 3 fights.
import { newGame, makeAdventurer, maxHp } from '../js/state.js';
import { Sim } from '../js/sim.js';
import { BOSSES, ITEMS } from '../js/data.js';
import { makeRng } from '../js/rng.js';
function fight(bossId, lv, seed) {
  const s = newGame(seed), sim = new Sim(s, {}); const R = makeRng({ seed: seed + 9 });
  s.advs = []; s.mons = []; Object.keys(ITEMS).forEach(k => s.unlocked[k] = true);
  const jobs = lv >= 20 ? ['samurai', 'knight', 'monk', 'royal'] : lv >= 10 ? ['knight', 'ninja', 'monk', 'mage'] : ['warrior', 'archer', 'monk', 'mage'];
  for (const j of jobs) { const a = makeAdventurer(s, R, j); a.lv = lv; a.resident = true; a.potions = 3; a.x = 38; a.y = 36;
    a.eq.weapon = sim.bestGearFor({ ...a, gold: 1e9 })?.id || null; a.eq.armor = lv >= 15 ? 'plate' : lv >= 8 ? 'chain' : 'leather'; a.hp = maxHp(a, s); s.advs.push(a); }
  s.quests = [{ id: 1, kind: 'boss', zone: 1, boss: bossId, fee: 0, reward: { gold: 0, tp: 0, pop: 0 }, name: 'x', desc: '' }];
  sim.startQuest(1, s.advs.map(a => a.id));
  for (let i = 0; i < 4000 && s.quest; i++) sim.step();
  return !!s.bossesBeaten[bossId];
}
for (const b of Object.keys(BOSSES)) {
  let found = null;
  for (let lv = 3; lv <= 45 && !found; lv += 2) { let w = 0; for (let k = 0; k < 3; k++) w += fight(b, lv, 100 + k) ? 1 : 0; if (w >= 2) found = lv; }
  console.log(b.padEnd(11), 'min party Lv', found);
}
