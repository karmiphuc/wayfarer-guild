import assert from 'node:assert/strict';
import { BOSSES, FRONTIERS } from '../js/data.js';
import { newGame, migrate, maxHp } from '../js/state.js';
import { Sim, WEEK_SECONDS } from '../js/sim.js';

function lateGame(allCleared = false) {
  const s = newGame(4242);
  s.stars = 5; s.gold = 1e8;
  for (const [id, b] of Object.entries(BOSSES)) if (allCleared || b.star < 5) s.bossesBeaten[id] = true;
  s.quests = [];
  const sim = new Sim(s), a = s.advs[0];
  a.lv = 99; a.hp = maxHp(a, s); a.resident = true;
  return { s, sim, a };
}
const offers = s => s.quests.filter(q => q.boss && !q.frontier);
function depart(s, sim, a) {
  const q = offers(s)[0];
  assert(q);
  assert.equal(sim.startQuest(q.id, [a.id]), null);
  return s.activeQuests.find(o => o.id === q.id);
}
function clear(s, sim, q) {
  for (const m of s.mons) if (m.quest === q.id) m.hp = 0;
  sim.checkQuest(q);
}

// A saved five-star village immediately gets its unfinished legendary ladder.
{
  const { s, sim, a } = lateGame();
  assert.deepEqual(offers(s).map(q => q.boss), ['magmaSlime', 'goldTanuki']);
  const before = JSON.stringify(s.quests), seed = s.seed;
  sim.refreshBossQuests(); sim.refreshBossQuests();
  assert.equal(JSON.stringify(s.quests), before);
  assert.equal(s.seed, seed);
  const q = depart(s, sim, a);
  sim.refreshQuests();
  assert(!offers(s).some(o => o.boss === q.boss));
  clear(s, sim, q);
  assert.deepEqual(offers(s).map(q => q.boss), ['goldTanuki', 'tenguRed']);
  assert(offers(s).every(q => !q.rematch));
}

// All first clears remain recorded; rematches rotate forever without duplicating live bosses.
{
  const { s, sim, a } = lateGame(true), won = { ...s.bossesBeaten };
  const first = offers(s)[0];
  assert.equal(first.boss, 'magmaSlime');
  assert.equal(first.rematch, 1);
  assert.equal(first.rec, 35);
  assert.equal(first.reward.gold, 7200);
  const q = depart(s, sim, a), m = s.mons.find(m => m.quest === q.id);
  assert.equal(m.mhp, Math.round(BOSSES.magmaSlime.hp * 1.2));
  assert.equal(m.atk, Math.round(BOSSES.magmaSlime.atk * 1.2));
  sim.refreshQuests();
  assert.equal(offers(s).length, 0);
  const loaded = migrate(JSON.parse(JSON.stringify(s))), loadedSim = new Sim(loaded);
  assert.equal(offers(loaded).length, 0);
  assert.deepEqual(loaded.activeQuests, s.activeQuests);
  clear(loaded, loadedSim, loaded.activeQuests[0]);
  assert.equal(offers(loaded)[0].boss, 'goldTanuki');
  clear(s, sim, q);
  for (const id of ['goldTanuki', 'tenguRed', 'cyclop2']) {
    assert.equal(offers(s)[0].boss, id);
    clear(s, sim, depart(s, sim, a));
  }
  assert.equal(s.flags.bossRematches, 4);
  assert.equal(offers(s)[0].boss, 'magmaSlime');
  assert.equal(offers(s)[0].rematch, 2);
  assert.equal(offers(s)[0].rec, 40);
  assert.equal(offers(s)[0].bossScale, 1.4);
  assert.deepEqual(s.bossesBeaten, won);
  const failed = depart(s, sim, a);
  failed.t = WEEK_SECONDS * 9; sim.checkQuest(failed);
  assert.equal(s.flags.bossRematches, 4);
  assert.equal(offers(s)[0].boss, 'magmaSlime');
  assert.equal(offers(s)[0].rematch, 2);
}

// Difficulty and recommendations stop climbing at the pawn level cap.
{
  const { s, sim } = lateGame(true);
  s.flags.bossRematches = 400000;
  s.quests = []; sim.refreshBossQuests();
  const q = offers(s)[0];
  assert.equal(q.rec, 99);
  assert(q.bossScale <= 3.8);
  assert(Number.isFinite(q.reward.gold));
}

// Completed frontier sites never mark normal bosses beaten or enter the rematch sequence.
{
  const { s, sim } = lateGame();
  for (const f of FRONTIERS) s.frontier.completed[f.id] = true;
  sim.refreshBossQuests();
  assert.equal(offers(s)[0].boss, 'magmaSlime');
  assert(!offers(s)[0].rematch);
  delete s.flags.bossRematches;
  const loaded = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.flags.bossRematches, 0);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(loaded))), loaded);
}

console.log('boss quests: immediate late-game ladder, persistent rematches, bounded scaling and migration passed');
