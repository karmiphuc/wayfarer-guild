// Simulation: calendar, adventurer AI, economy, field combat, monsters, quests, titles, stars.
// Fixed step (DT). Everything reads/writes the plain state `s`; the renderer only reads it.
import { MAP_W, MAP_H, HOME_W, HOME_H, FRONTIERS, FAC, DECOR, JOBS, ITEMS, MONSTERS, BOSSES, PERSONA, FAC_TRAITS, TITLES, RANKS, EVENTS, MATS, TRAIT_NAMES, PERKS, TIER_TP, SHOP_SLOTS,
  ZONE_MONS, ZONE_POP, ZONE_LV, HAPPENINGS, HAPPEN_CHANCE, CHARTERS, VISITOR_CAP, ELITE_CHANCE } from './data.js';
import { PathGrid } from './path.js';
import { makeRng } from './rng.js';
import { defOf, buildingAt, roadAt, setRoad, place, spawnAdventurer, stat, maxHp, log, zoneAt, townDist, frontierBonus, villageBoundary, ZONE_BIOME, CAVE, cavePos, shuffle, teachJob, perkSum, gearSum, LV_CAP, JOB_CAP, MASTERY } from './state.js';
import { BIOMES } from './data.js';

export const DT = 0.1;              // seconds per sim step
export const WEEK_SECONDS = 30;     // one in-game week at 1x


function setTimeoutSim(sim, steps, fn) { (sim.timers || (sim.timers = [])).push({ t: steps, fn }); }

export class Sim {
  constructor(s, hooks = {}) {
    this.s = s; this.R = makeRng(s); this.hooks = hooks;   // hooks: sfx(name), toast(text,kind), fanfare(text)
    this.grid = new PathGrid(MAP_W, MAP_H);
    this.barriers = new Uint8Array(MAP_W * MAP_H);
    this.rebuildGrid(); this.invalidatePaths(); this.recomputeTraits(true);
  }
  emit(kind, ...a) { this.hooks[kind] && this.hooks[kind](...a); }

  // ---------- grid ----------
  rebuildGrid() {
    const g = this.grid, s = this.s;
    const perimeter = villageBoundary(s);
    this.boundary = perimeter.walls; this.gates = perimeter.gates; this.gateApproaches = perimeter.approaches;
    this.barriers.fill(0);
    s.props = s.props.filter(p => !p.block || p.k === 'cave' || !perimeter.approaches.some(([x, y]) => y === p.y && x >= p.x && x < p.x + p.w));
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) g.set(x, y, roadAt(s, x, y) ? 0.55 : 1);
    for (const p of s.props) if (p.block) for (let dx = 0; dx < p.w; dx++) g.set(p.x + dx, p.y, 0);
    for (const b of s.buildings) {
      const d = defOf(b.type); if (d.road) continue;
      const [w, h] = d.fp;
      for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) if (x < MAP_W && y < MAP_H) {
        g.set(x, y, d.fp[0] === 1 && !FAC[b.type] && !d.barrier ? 1.2 : 0);
        if (d.barrier) this.barriers[y * MAP_W + x] = 1;
      }
    }
    for (const { x, y } of this.boundary) { g.set(x, y, 0); this.barriers[y * MAP_W + x] = 1; }
    g.version++;
    // A moving perimeter may meet an existing actor. Move only that actor off the new fence.
    for (const a of [...s.advs, ...s.mons, ...s.monsters, ...s.folk, ...s.animals, ...s.npcs]) {
      if (a.inside || !this.barriers[Math.round(a.y) * MAP_W + Math.round(a.x)]) continue;
      const c = g.nearestWalkable(a.x, a.y); if (c) { [a.x, a.y] = c; a.path = null; }
    }
  }
  door(b) { const [w, h] = defOf(b.type).fp; return [b.x + (w >> 1), b.y + h]; }

  // ---------- build API (player actions) ----------
  cost(type) { return Math.round(defOf(type).cost * (1 + this.charter('buildCost'))); }
  canPlace(type, x, y, free = false) {
    const s = this.s, d = defOf(type); if (!d) return 'unknown';
    const [w, h] = d.fp;
    if (x < 0 || y < 0 || x + w >= MAP_W || y + h >= MAP_H) return 'Outside the map';
    if (!free && d.rank && s.stars < d.rank - 1) return `Needs ${d.rank - 1}★ village`;
    if (!free && d.unique && s.buildings.some(b => b.type === type)) return 'Only one allowed';
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (townDist(s, xx, yy) > 0) return 'Outside the village - capture this territory first';
      if (this.boundary.some(c => c.x === xx && c.y === yy)) return 'Village palisade - use an opening';
      if (!d.road && this.gateApproaches.some(([gx, gy]) => gx === xx && gy === yy)) return 'Keep the village opening clear';
      if (FRONTIERS.some(f => Math.abs(xx - f.x) <= 1 && Math.abs(yy - f.y) <= 1)) return 'Keep the den entrance clear';
      if (buildingAt(s, xx, yy)) return 'Occupied';
      if (!d.road && roadAt(s, xx, yy)) return 'Road in the way';
      if (d.road && roadAt(s, xx, yy)) return 'Already a road';
      if (s.props.some(p => p.block && xx >= p.x && xx < p.x + p.w && yy === p.y)) return 'Blocked';
      if (d.barrier && s.buildings.some(b => FAC[b.type] && this.door(b)[0] === xx && this.door(b)[1] === yy)) return 'Keep the building entrance clear';
      if (d.barrier && [...s.advs, ...s.mons, ...s.monsters, ...s.folk, ...s.animals, ...s.npcs].some(a => !a.inside && Math.round(a.x) === xx && Math.round(a.y) === yy)) return 'Someone is standing here';
    }
    if (FAC[type]) { const [dx, dy] = [x + (w >> 1), y + h]; if (buildingAt(s, dx, dy) || this.barriers[dy * MAP_W + dx]) return 'Door is blocked'; }
    if (!free && s.gold < this.cost(type)) return 'Not enough gold';
    return null;
  }
  build(type, x, y) {
    const err = this.canPlace(type, x, y); if (err) return err;
    const s = this.s, d = defOf(type);
    const c = this.cost(type); s.gold -= c; s.stats.spentBuild += c;
    if (d.road) setRoad(s, x, y, true); else {
      const [w, h] = d.fp;
      s.props = s.props.filter(p => !(p.soft && p.x >= x - 1 && p.x < x + w && p.y >= y && p.y < y + h));
      place(s, type, x, y);
    }
    this.rebuildGrid(); this.recomputeTraits(); this.invalidatePaths();
    if (!d.road) { const [w, h] = d.fp; for (let i = 0; i < Math.min(4, w); i++) s.fx.push({ k: 'poof', x: x + i + (w > 1 ? 0 : 0), y: y + h - 1, t: -i * 0.05, life: 0.5 }); }
    this.emit('sfx', 'build');
    return null;
  }
  demolish(b) {
    const s = this.s, d = defOf(b.type);
    if (b.type === 'guild') return 'The Guild Hall cannot be removed';
    s.buildings = s.buildings.filter(o => o !== b);
    s.gold += this.refund(b);
    for (const a of s.advs) if (a.home === b.id) { a.home = null; }
    this.rebuildGrid(); this.recomputeTraits(); this.invalidatePaths();
    return null;
  }
  refund(b) { return b.free ? 0 : Math.floor(defOf(b.type).cost * 0.4); }   // charter gifts (placeFree) refund nothing
  removeRoad(x, y) { if (!roadAt(this.s, x, y)) return; setRoad(this.s, x, y, false); this.rebuildGrid(); this.invalidatePaths(); }
  upgradeCost(b) { return Math.round(defOf(b.type).cost * 0.8 * b.lv * (1 + this.charter('buildCost'))); }
  upgrade(b) {
    const c = this.upgradeCost(b); if (b.lv >= 5) return 'Max level'; if (this.s.gold < c) return 'Not enough gold';
    this.s.gold -= c; b.lv++; this.recomputeTraits(); this.emit('sfx', 'levelup'); return null;
  }
  invalidatePaths() { for (const group of ['advs', 'mons', 'monsters', 'folk', 'animals', 'npcs']) for (const a of this.s[group]) a.path = null; }

  // ---------- traits & titles ----------
  recomputeTraits(silent) {
    const s = this.s, tr = Object.fromEntries(TRAIT_NAMES.map(n => [n, 0]));
    for (const b of s.buildings) { const t = FAC_TRAITS[b.type]; if (t) for (const k in t) tr[k] += t[k] * (1 + (b.lv - 1) * 0.5); }
    tr.Monster += s.monsters.length * 3;
    for (const k in tr) tr[k] = Math.round(tr[k]);
    s.traits = tr;
    for (const t of TITLES) {
      if (s.titles[t.id]) continue;
      if (Object.entries(t.need).every(([k, v]) => tr[k] >= v)) {
        s.titles[t.id] = true;
        if (!silent) { s.pop += t.pop; s.gold += t.gold; log(s, `Title earned: ${t.name}! +${t.pop} popularity, +${t.gold}G`, 'title'); this.emit('fanfare', `Title: ${t.name}`, t.desc); }
      }
    }
  }
  bonus(key) { let v = frontierBonus(this.s, key); for (const t of TITLES) if (this.s.titles[t.id] && t.bonus[key]) v += t.bonus[key]; return v; }
  eventOn(id) { return this.s.events.some(e => e.id === id); }

  // ---------- step ----------
  step() {
    const s = this.s; s.tick++;
    this.calendar();
    if (s.tick % 5 === 0) this.spawner();
    for (const a of s.advs) this.advStep(a);
    for (const m of s.mons) this.monStep(m);
    for (const m of s.monsters) this.petStep(m);
    for (const f of s.folk) this.folkStep(f);
    for (const an of s.animals) this.animalStep(an);
    for (const n of s.npcs) this.npcStep(n);
    if (s.tick % 50 === 0) this.folkCensus();
    this.towerStep();
    if (this.timers && this.timers.length) { const due = []; this.timers = this.timers.filter(t => (--t.t > 0) || (due.push(t), false)); for (const t of due) t.fn(); }
    if (s.tick % 10 === 0) this.questCheck();
    // cleanup
    if (s.tick % 20 === 0) { s.mons = s.mons.filter(m => m.hp > 0 || m.deadT > 0); }
    for (const m of s.mons) if (m.hp <= 0 && m.deadT > 0) m.deadT -= DT;
    s.fx = s.fx.filter(f => (f.t += DT) < f.life);
  }

  // ---------- calendar ----------
  calendar() {
    const s = this.s, tm = s.time;
    tm.t += DT;
    if (tm.t < WEEK_SECONDS) return;
    tm.t = 0; tm.week++;
    for (const e of s.events) e.weeks--; s.events = s.events.filter(e => e.weeks > 0);
    for (const a of s.advs) { a.days += 7; }
    if (tm.week > 4) { tm.week = 1; this.monthEnd(); tm.month++; if (tm.month > 12) { tm.month = 1; tm.year++; } }
    if (tm.month === 4 && tm.week === 1) this.taxes();
    this.tickHappenings(); this.rollHappening();
  }
  monthEnd() {
    const s = this.s;
    let upkeep = 0; for (const b of s.buildings) { const d = FAC[b.type]; if (d && d.cost) upkeep += Math.round(d.cost * 0.015 * b.lv); }
    upkeep = Math.round(upkeep * (1 + this.charter('upkeep'))); s.gold -= upkeep;
    const tp = 3 + Math.floor(s.stats.monthKills / 4 * (1 + this.charter('tpKills'))) + s.advs.filter(a => a.resident).length;
    s.tp += tp;
    s.stats.lastIncome = s.stats.income; s.stats.lastUpkeep = upkeep;
    log(s, `Month report: sales ${s.stats.income}G, upkeep ${upkeep}G, +${tp} Town Points (${s.stats.monthKills} monsters defeated).`, 'report');
    this.emit('report', { income: s.stats.income, upkeep, tp, kills: s.stats.monthKills });
    s.stats.income = 0; s.stats.monthKills = 0;
    this.refreshQuests();
    this.checkStars();
  }
  taxes() {
    const s = this.s; let t = 0;
    for (const a of s.advs) if (a.resident) t += 40 + a.lv * 12 + a.kills * 2;
    if (t) { s.gold += t; log(s, `Spring taxes from residents: +${t}G`, 'good'); this.emit('sfx', 'coin'); }
  }
  starProgress() {
    const s = this.s, next = RANKS[s.stars + 1]; if (!next) return null;
    const n = next.need, have = {
      pop: Math.floor(s.pop), residents: s.advs.filter(a => a.resident).length, income: s.stats.lastIncome,
      titles: Object.keys(s.titles).length, quests: s.cleared, build: n.build ? s.buildings.some(b => b.type === n.build) : true,
      boss: n.boss ? !!s.bossesBeaten[n.boss] : true,
    };
    const rows = Object.entries(n).map(([k, v]) => {
      const ok = typeof v === 'number' ? have[k] >= v : !!have[k];
      const label = { pop: `Popularity ${have.pop}/${v}`, residents: `Residents ${have.residents}/${v}`, income: `Monthly sales ${have.income}/${v}G`,
        titles: `Titles ${have.titles}/${v}`, quests: `Quests cleared ${have.quests}/${v}`, build: `Build a ${defOf(v)?.name}`, boss: `Defeat ${BOSSES[v]?.name}` }[k];
      return { ok, label };
    });
    return { title: next.title, rows, done: rows.every(r => r.ok) };
  }
  checkStars() {
    const p = this.starProgress();
    if (p && p.done) {
      this.s.stars++; this.s.pop += 50; this.s.tp += 10;
      log(this.s, `The village is now ${'★'.repeat(this.s.stars)} ${p.title}! New facilities unlocked.`, 'title');
      this.emit('fanfare', `${'★'.repeat(this.s.stars)} ${p.title}`, 'New facilities and quests unlocked!');
    }
  }

  // ---------- spawning ----------
  spawner() {
    const s = this.s, R = this.R;
    // visitors
    const visitors = s.advs.filter(a => !a.resident).length;
    const beds = s.buildings.filter(b => b.type === 'inn').reduce((n, b) => n + FAC.inn.cap + b.lv - 1, 0);
    // hard cap per rank (VISITOR_CAP: 5/5/10/15/20/30); below it, popularity and inn beds decide how many come
    const cap = Math.min(VISITOR_CAP[s.stars] ?? 30, 4 + s.stars * 2 + Math.floor(s.pop / 400) + beds);
    // arrival chance per spawner tick (every 0.5 s): ~1 visitor/week at the start, at most ~6/week before bonuses
    let rate = Math.min(0.1, 0.015 + s.pop / 80000) * (1 + this.bonus('visitors') + this.charter('visitors')) * (this.eventOn('festival') ? 2 : 1) * (this.happening('sunny') ? 1.4 : 1);
    if (visitors < cap && R.chance(rate)) {
      const edge = this.edgeSpawn();
      const a = spawnAdventurer(s, R, edge);
      a.lv = Math.max(1, Math.min(40, R.int(1, 2 + s.stars * 3)));
      if (a.lv > 6 && a.job === 'villager') a.job = R.pick(['warrior', 'archer', 'mage', 'monk']);
      a.hp = maxHp(a, s); a.gold += 80 + a.lv * 25;
      log(s, `${a.name} the ${JOBS[a.job].name} (Lv${a.lv}) arrived.`);
    }
    // monsters per zone
    for (let z = 1; z <= 4; z++) {
      const n = s.mons.filter(m => m.zone === z && m.hp > 0 && !m.quest).length;
      if (n < Math.round(ZONE_POP[z] * (1 + this.charter('monsterPop'))) && R.chance(0.08)) this.spawnMonster(z);
    }
  }
  edgeSpawn() {
    const R = this.R; const x = 38 + R.int(-1, 1);
    return { x, y: HOME_H - 1 };
  }
  randomCellInZone(z, tries = 60) {
    const R = this.R;
    for (let i = 0; i < tries; i++) {
      const x = R.int(1, HOME_W - 2), y = R.int(1, HOME_H - 2);
      if (Math.abs(x - 38) < 4 && y > 38) continue;   // keep the arrival road clear
      if (zoneAt(x, y) === z && townDist(this.s, x, y) > 1 && this.grid.walkable(x, y)) return [x, y];
    }
    return null;
  }
  spawnMonster(z, type, at, extra = {}) {
    const s = this.s, R = this.R, wild = !type && !at;
    type = type || R.pick(this.zoneMons(z));
    const c = at || this.randomCellInZone(z); if (!c) return null;
    const M = MONSTERS[type], lv = ZONE_LV[z] + R.int(0, 2) + (extra.lvBonus || 0), k = 1 + (lv - 1) * 0.12;
    const m = { id: s.nextId++, type, zone: z, lv, x: c[0], y: c[1], hx: c[0], hy: c[1], hp: Math.round(M.hp * k), mhp: Math.round(M.hp * k),
      atk: Math.round(M.atk * k), def: Math.round(M.def * k), dir: 0, tx: c[0], ty: c[1], cd: 0, target: null, deadT: 0, hitT: 0, anim: 0, ...extra };
    if (wild && !M.human && R.chance(ELITE_CHANCE)) {             // Elite: recoloured, tougher, richer (see killMonster)
      m.elite = true; m.hp = m.mhp = Math.round(m.mhp * 1.8); m.atk = Math.round(m.atk * 1.4); m.def = Math.round(m.def * 1.3);
    }
    s.mons.push(m); return m;
  }
  spawnBoss(id, at, extra = {}) {
    const s = this.s, B = BOSSES[id];
    const m = { id: s.nextId++, boss: id, type: id, zone: 9, lv: 20, x: at[0], y: at[1], hx: at[0], hy: at[1], hp: B.hp, mhp: B.hp, atk: B.atk, def: B.def,
      dir: 0, tx: at[0], ty: at[1], cd: 0, target: null, deadT: 0, hitT: 0, anim: 0, ...extra };
    s.mons.push(m); return m;
  }

  // ---------- adventurer AI ----------
  pmul(a, key) { let v = 1; for (const p of a.persona) { const P = PERSONA[p]; if (P && P[key]) v *= P[key]; } return v; }
  facilities(kind) { return this.s.buildings.filter(b => FAC[b.type] && FAC[b.type].kind === kind); }
  appeal(b) {
    const d = FAC[b.type]; let ap = (d.appeal || 0) + (b.lv - 1) * 2;
    for (const o of this.s.buildings) { const dd = DECOR[o.type]; if (!dd || !dd.appeal) continue;
      if (Math.abs(o.x - b.x - 1) <= dd.r + 1 && Math.abs(o.y - b.y) <= dd.r + 1) ap += dd.appeal * (1 + this.charter('decorAppeal')); }
    return Math.round(ap);
  }
  price(b) {
    const d = FAC[b.type]; let p = (d.price || 0) * (1 + 0.3 * (b.lv - 1)) * (1 + this.appeal(b) / 60);
    if (d.kind === 'food') p *= (1 + this.bonus('foodSales')) * (this.happening('harvest') ? 1.25 : 1);
    return Math.round(p);
  }
  pickFacility(a, kind, extraOk = () => true) {
    let best = null, bs = -1e9;
    for (const b of this.facilities(kind)) {
      if (!extraOk(b)) continue;
      const [dx, dy] = this.door(b); const dist = Math.hypot(dx - a.x, dy - a.y);
      const sc = this.appeal(b) * 2 - dist * 0.6 + this.R.range(0, 6) - (b.occ.length >= this.capOf(b) ? 50 : 0);
      if (sc > bs) { bs = sc; best = b; }
    }
    return best;
  }
  capOf(b) { const d = FAC[b.type]; return (d.cap || 3) + (b.lv - 1); }
  canEquip(a, it) { return it.slot !== 'weapon' || JOBS[a.job].wt.includes(it.type); }
  bestGearFor(a) {
    // most worthwhile affordable upgrade on sale in any shop that stocks that slot
    let best = null;
    for (const slot of ['weapon', 'armor', 'acc']) {
      const shops = this.facilities('shop').filter(b => SHOP_SLOTS[FAC[b.type].slot].includes(slot)); if (!shops.length) continue;
      const cur = a.eq[slot] ? ITEMS[a.eq[slot]] : null, curV = cur && this.canEquip(a, cur) ? this.gearValue(a, cur) : 0;
      if (cur?.legendary) continue;
      for (const id in this.s.unlocked) {
        const it = ITEMS[id]; if (!it || it.legendary || it.slot !== slot || !this.canEquip(a, it)) continue;
        const v = this.gearValue(a, it), price = this.itemPrice(id);
        if (v > curV + 1 && price <= a.gold && (!best || v - curV > best.gain)) best = { id, gain: v - curV, shops, price };
      }
    }
    return best;
  }
  gearValue(a, it) {
    const j = JOBS[a.job], magic = j.mag > j.atk;
    return (it.atk || 0) * (magic ? 0.4 : 1) + (it.mag || 0) * (magic ? 1.2 : 0.3) + (it.def || 0) + (it.hp || 0) * 0.3 + (it.crit || 0) * 120 + (it.spd || 0) * 60;
  }
  potion() { return this.s.unlocked.medipack ? ITEMS.medipack : ITEMS.potion; }
  itemPrice(id) { return Math.round(ITEMS[id].price * (1 + this.bonus('shopSales') * 0) ); }

  decide(a) {
    const s = this.s, R = this.R, sc = [];
    const hpR = a.hp / maxHp(a, s);
    const add = (score, task) => { if (score > 0) sc.push([score + R.range(0, 8), task]); };
    // eat
    if (a.hunger > 35) { const b = this.pickFacility(a, 'food', b => this.price(b) <= a.gold); if (b) add(a.hunger * 0.9 * this.pmul(a, 'food'), { type: 'visit', b: b.id, dur: 5 }); }
    // sleep / rest
    if (a.energy < 45 || hpR < 0.45) {
      const home = a.home && s.buildings.find(b => b.id === a.home);
      const b = home || this.pickFacility(a, 'sleep', b => this.price(b) <= a.gold);
      const need = (100 - a.energy) * 0.9 * this.pmul(a, 'rest') + (1 - hpR) * 60;
      if (b) add(need, { type: 'visit', b: b.id, dur: 12, sleep: true }); else add(need * 0.5, { type: 'camp', dur: 10 });
    }
    // heal at shrine
    if (hpR < 0.7) { const b = this.pickFacility(a, 'heal', b => this.price(b) <= a.gold); if (b) add((1 - hpR) * 80, { type: 'visit', b: b.id, dur: 4 }); }
    // shopping for gear
    const g = this.bestGearFor(a);
    if (g) { const shop = g.shops.sort((p, q) => this.appeal(q) - this.appeal(p))[0]; add(35 + g.gain * 3 * this.pmul(a, 'shop'), { type: 'visit', b: shop.id, dur: 4, buy: g.id }); }
    if (a.potions < 2) { const b = this.pickFacility(a, 'shop', b => FAC[b.type].slot === 'item'); if (b && a.gold > 60) add(18 * this.pmul(a, 'shop'), { type: 'visit', b: b.id, dur: 3, buy: 'potion' }); }
    // train
    { const b = this.pickFacility(a, 'train', b => this.price(b) <= a.gold); if (b) add(16 * this.pmul(a, 'train') + (a.jobLv[a.job] < 10 ? 6 : 0), { type: 'visit', b: b.id, dur: 8, train: true }); }
    // hunt
    if (hpR > 0.6 && a.energy > 40) {
      const z = this.zoneFor(a);
      add((28 + (a.gold < 80 ? 30 : 0)) * this.pmul(a, 'hunt') * (this.eventOn('contest') ? 1.6 : 1) * (this.happening('rain') ? 0.6 : 1), { type: 'hunt', zone: z, dur: 40 + R.int(0, 30) });
    }
    // a Golden Slime is worth chasing across the map
    const gold = s.mons.find(m => m.golden && m.hp > 0);
    if (gold && a.lv >= 3 && hpR > 0.6) add(50 * this.pmul(a, 'hunt'), { type: 'hunt', zone: 9, chase: gold.id, dur: 60 });
    // raid defence: everyone healthy rallies against stampedes and bandits
    if (hpR > 0.5 && s.mons.some(m => m.raid && m.hp > 0)) {
      add(75 * this.pmul(a, 'hunt'), { type: 'hunt', zone: 9, defend: true, dur: 90 });
    }
    // fun
    add(8 + (100 - a.fun) * 0.25, { type: 'stroll', dur: 6 });
    // leave (visitors past their stay who aren't happy)
    if (!a.resident && a.days > a.stay) add(a.wantsHome ? 25 : 70, { type: 'leave' });
    sc.sort((p, q) => q[0] - p[0]);
    return sc.length ? sc[0][1] : { type: 'stroll', dur: 5 };
  }
  zoneFor(a) {
    const pw = stat(a, 'atk', this.s) + stat(a, 'mag', this.s) + stat(a, 'def', this.s) * 0.6 + a.lv * 1.5;
    let z = 1; if (pw > 38) z = 2; if (pw > 70) z = 3; if (pw > 110) z = 4;
    return z;
  }

  advStep(a) {
    const s = this.s;
    a.anim += DT; if (a.atkT > 0) a.atkT -= DT; if (a.emoteT > 0) a.emoteT -= DT; if (a.barkT > 0) a.barkT -= DT;
    if (a.dungeon) return;
    if (a.inside) return this.insideStep(a);
    // needs
    a.hunger = Math.min(100, a.hunger + DT * 0.55);
    a.energy = Math.max(0, a.energy - DT * (a.task && a.task.type === 'hunt' ? 0.45 : 0.22));
    a.fun = Math.max(0, a.fun - DT * 0.18);
    if (a.ko) return this.koStep(a);
    if (a.hunger >= 100 && s.tick % 50 === 0) { a.sat = Math.max(0, a.sat - 2); this.emote(a, 'hungry'); }
    if (a.task && a.task.type === 'quest') return this.questStep(a);
    if (!a.task) { const q = this.questForPawn(a.id); a.task = q ? { type: 'quest', qid: q.id } : this.decide(a); a.taskT = 0; a.path = null; if (q) return this.questStep(a); }
    a.taskT += DT;
    const t = a.task;
    switch (t.type) {
      case 'visit': {
        const b = s.buildings.find(o => o.id === t.b); if (!b) { a.task = null; break; }
        const [dx, dy] = this.door(b);
        if (t.travelLimit === undefined) t.travelLimit = 45 + Math.max(0, Math.hypot(dx - a.x, dy - a.y) - 40) * 2;
        if (this.walkTo(a, dx, dy)) {
          if (b.occ.length >= this.capOf(b) && !t.sleep) { if (a.taskT > 25) { a.task = null; this.emote(a, 'annoyed'); a.sat -= 1; } break; }
          a.inside = { b: b.id, t: t.dur, task: t }; b.occ.push(a.id); a.x = dx; a.y = dy - 0.6;
        } else if (a.taskT > t.travelLimit) a.task = null;
        break;
      }
      case 'hunt': case 'return': this.huntStep(a, t); break;
      case 'stroll': {
        if (!t.dest) { const c = this.randomTownCell(); t.dest = c; }
        if (!t.dest || this.walkTo(a, t.dest[0], t.dest[1]) || a.taskT > 20) { a.fun = Math.min(100, a.fun + 12 + this.decorFun(a)); a.task = null; }
        break;
      }
      case 'camp': { a.energy = Math.min(100, a.energy + DT * 3); a.hp = Math.min(maxHp(a, s), Math.round((a.hp + DT) * 10) / 10); if (a.taskT > t.dur) { a.task = null; a.sat -= 3; this.emote(a, 'sad'); } break; }
      case 'leave': {
        if (this.walkTo(a, 38, HOME_H - 1)) {
          for (const id in s.frontier.relics) if (s.frontier.relics[id] === a.id) s.frontier.relics[id] = null;
          s.advs = s.advs.filter(o => o !== a);
          if (a.sat >= 60) { s.pop += 6; log(s, `${a.name} left happy and will tell friends about the village.`); } else log(s, `${a.name} left the village.`);
        }
        break;
      }
      default: a.task = null;
    }
  }
  decorFun(a) { let f = 0; for (const b of this.s.buildings) { const d = DECOR[b.type]; if (d && d.appeal && Math.abs(b.x - a.x) < 4 && Math.abs(b.y - a.y) < 4) f += d.appeal * 2; } return Math.min(f, 25); }
  randomTownCell() {
    const t = this.s.town;
    for (let i = 0; i < 30; i++) { const x = this.R.int(t.x0, t.x1 - 1), y = this.R.int(t.y0, t.y1 - 1); if (this.grid.walkable(x, y)) return [x, y]; }
    return null;
  }

  insideStep(a) {
    const s = this.s, iv = a.inside, b = s.buildings.find(o => o.id === iv.b);
    iv.t -= DT;
    if (b && FAC[b.type].kind === 'sleep' || iv.task.sleep) { a.revived = false; a.energy = Math.min(100, a.energy + DT * 9); a.hp = Math.min(maxHp(a, s), a.hp + DT * 6); }
    a.hp = Math.round(a.hp * 10) / 10;
    if (iv.t > 0 && b) return;
    // exit and settle the visit
    if (b) { b.occ = b.occ.filter(id => id !== a.id); this.settleVisit(a, b, iv.task); }
    a.inside = null; a.task = null; a.cool = 1;
  }
  settleVisit(a, b, t) {
    const s = this.s, d = FAC[b.type]; let paid = 0, joy = 0;
    const ap = this.appeal(b);
    switch (d.kind) {
      case 'food': paid = this.price(b) * this.pmul(a, 'food'); a.hunger = Math.max(0, a.hunger - d.fill); a.fun = Math.min(100, a.fun + (d.fun || 8)); joy = 3 + ap / 4; this.emote(a, 'love'); break;
      case 'sleep': paid = a.home === b.id ? 0 : this.price(b); joy = 2 + ap / 5; this.emote(a, 'zzz'); break;
      case 'home': joy = 2 + ap / 4; break;
      case 'heal': paid = this.price(b); a.hp = maxHp(a, s); a.fun = Math.min(100, a.fun + 10); joy = 3 + ap / 4; this.emote(a, 'happy'); break;
      case 'train': paid = this.price(b); this.gainXp(a, (6 + b.lv * 3) * (1 + this.bonus('xp')), true); joy = 1 + ap / 6; this.emote(a, 'fire'); break;
      case 'shop': {
        if (t.buy === 'potion') { const P = this.potion(), n = Math.min(3 - a.potions, Math.floor(a.gold / P.price)); if (n > 0) { paid = n * P.price * (1 + this.bonus('shopSales') + this.charter('shopSales')); a.potions += n; } }   // shop sales bonuses count for potions too
        else if (t.buy && ITEMS[t.buy] && !ITEMS[t.buy].legendary && !ITEMS[a.eq[ITEMS[t.buy].slot]]?.legendary && a.gold >= this.itemPrice(t.buy)) {
          const it = ITEMS[t.buy]; paid = this.itemPrice(t.buy); a.eq[it.slot] = t.buy; a.hp = Math.min(a.hp, maxHp(a, s));
          log(s, `${a.name} bought a ${it.name}! (+${paid}G)`, 'coin'); this.emote(a, 'star'); this.bark(a, it.name + '!');
          paid *= 1 + this.bonus('shopSales') + this.charter('shopSales');
        }
        joy = 2 + ap / 5; break;
      }
    }
    paid = Math.round(paid * (this.eventOn('sale') && d.kind === 'shop' ? 1.5 : 1) * (1 + this.royalAura()) * (this.happening('rain') && (d.kind === 'food' || d.kind === 'sleep') ? 1.25 : 1));
    if (paid > 0) {
      const real = Math.min(paid, a.gold); a.gold -= real; s.gold += real; s.stats.income += real; b.sales += real; b.visits++;
      s.fx.push({ k: 'coin', x: b.x + FAC[b.type].fp[0] / 2, y: b.y, t: 0, life: 1.2, text: `+${real}G` });
      this.emit('sfx', 'coin');
    }
    this.addSat(a, joy);
  }
  royalAura() { const n = this.s.advs.filter(o => o.resident && o.perks.includes('royalaura')).length; return Math.min(0.25, n * PERKS.royalaura.incomePct); }
  addSat(a, v) {
    const s = this.s; v *= 1.6 * this.pmul(a, 'joy') * (1 + this.bonus('joy') + this.charter('joy')) * (this.eventOn('festival') ? 1.5 : 1);
    a.sat = Math.max(0, Math.min(999, a.sat + v)); s.pop += v * 0.15;
    if (!a.resident && a.sat >= 60) this.tryMoveIn(a);
  }
  tryMoveIn(a) {
    const s = this.s;
    const homes = this.facilities('home').filter(b => s.advs.filter(o => o.home === b.id).length < this.capOf(b));
    if (!homes.length) { if (!a.wantsHome) { a.wantsHome = true; log(s, `${a.name} wants to live here! Build a House.`, 'warn'); this.emote(a, 'exclaim'); } return; }
    a.resident = true; a.home = homes[0].id; a.wantsHome = false; a.work += 15;
    log(s, `${a.name} moved in! (${JOBS[a.job].name} Lv${a.lv})`, 'good');
    this.emit('fanfare', `${a.name} moved in!`, `${JOBS[a.job].name} · Lv${a.lv}`);
    this.checkStars();
  }

  gainXp(a, xp, jobOnly) {
    xp *= 1 + perkSum(a, 'xpPct');
    if (!jobOnly && a.lv < LV_CAP) { a.xp += xp; while (a.lv < LV_CAP && a.xp >= this.xpNeed(a)) { a.xp -= this.xpNeed(a); a.lv++; a.hp = maxHp(a, this.s); this.bark(a, 'Level up!'); this.emit('sfx', 'levelup'); this.s.fx.push({ k: 'lvl', x: a.x, y: a.y, t: 0, life: 1.4 }); } }
    if (a.lv >= LV_CAP) a.xp = 0;
    const jl = a.jobLv[a.job] || 1; if (jl >= JOB_CAP) return;
    a.jobXp += xp * 0.6 * (1 + this.charter('jobXp'));
    const need = 20 + jl * 15;
    if (a.jobXp >= need) {
      a.jobXp -= need; a.jobLv[a.job] = jl + 1;
      if (jl + 1 === MASTERY) this.master(a, a.job);
    }
  }
  master(a, jobId) {
    const J = JOBS[jobId], P = PERKS[J.perk];
    if (!a.perks.includes(J.perk)) a.perks.push(J.perk);
    a.hp = maxHp(a, this.s);
    log(this.s, `${a.name} mastered ${J.name}! Perk learned: ${P.name}.`, 'title');
    this.emit('fanfare', `${a.name} mastered ${J.name}!`, `${P.name}: ${P.desc}`);
    this.s.fx.push({ k: 'lvl', x: a.x, y: a.y, t: 0, life: 1.4 });
  }
  xpNeed(a) { return Math.round(12 * Math.pow(a.lv, 1.3)); }

  // ---------- movement ----------
  walkTo(a, gx, gy, step = this.speed(a) * DT) {
    if (Math.abs(a.x - gx) < 0.15 && Math.abs(a.y - gy) < 0.15) { a.path = null; return true; }
    if (!a.path || a.pathGoal !== gx + ',' + gy || a.pathV !== this.grid.version || (!a.path.length && this.s.tick >= a.pathRetry)) {
      const sx = Math.round(a.x), sy = Math.round(a.y);
      const start = this.grid.walkable(sx, sy) ? [sx, sy] : (this.grid.nearestWalkable(sx, sy) || [sx, sy]);
      const goal = this.grid.walkable(gx, gy) ? [gx, gy] : this.grid.nearestWalkable(gx, gy);
      if (!goal) return false;
      a.path = this.grid.find(start[0], start[1], goal[0], goal[1]) || []; a.pathGoal = gx + ',' + gy; a.pathV = this.grid.version; a.pi = 0;
      a.pathEnd = goal; a.pathRetry = this.s.tick + 10;
    }
    const node = a.path[a.pi]; if (!node) return !!a.pathEnd && Math.hypot(a.x - a.pathEnd[0], a.y - a.pathEnd[1]) < 0.5;
    const sp = step, dx = node[0] - a.x, dy = node[1] - a.y, d = Math.hypot(dx, dy);
    if (d <= sp) { a.x = node[0]; a.y = node[1]; a.pi++; if (a.pi >= a.path.length) { a.path = null; return Math.abs(a.x - gx) < 0.6 && Math.abs(a.y - gy) < 0.6; } }
    else { a.x += dx / d * sp; a.y += dy / d * sp; a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
    return false;
  }
  speed(a) {
    if (!a.job) return 1.5 * (roadAt(this.s, Math.round(a.x), Math.round(a.y)) ? 1.4 : 1);
    let v = 2.1 * JOBS[a.job].spd * (roadAt(this.s, Math.round(a.x), Math.round(a.y)) ? 1.45 : 1) * (1 + perkSum(a, 'spdPct') + gearSum(a, 'spd'));
    if (a.partner) { const m = this.s.monsters.find(m => m.id === a.partner); if (m && m.bond >= 50) v *= 1.4; }
    if (a.ko) v *= 0.5;
    return v;
  }
  stepToward(e, tx, ty, sp) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < 0.01) return true;
    const nx = e.x + dx / d * Math.min(sp, d), ny = e.y + dy / d * Math.min(sp, d);
    const x = Math.round(e.x), y = Math.round(e.y), xx = Math.round(nx), yy = Math.round(ny);
    const clear = this.grid.walkable(xx, yy) && (x === xx || y === yy || (this.grid.walkable(xx, y) && this.grid.walkable(x, yy)));
    if (e.path || !clear) return this.walkTo(e, Math.round(tx), Math.round(ty), sp);
    e.x = nx; e.y = ny;
    e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    return d <= sp;
  }

  // ---------- hunting & combat ----------
  huntStep(a, t) {
    const s = this.s, hpR = a.hp / maxHp(a, s);
    const retreat = 0.35 * this.pmul(a, 'retreat') + 0.05;
    if (hpR < retreat || a.energy < 12 || t.done) {
      if (a.potions > 0 && hpR < retreat) { a.potions--; a.hp = Math.min(maxHp(a, s), Math.round(a.hp + this.potion().heal * (1 + this.bonus('heal') + perkSum(a, 'healPct')))); this.emote(a, 'heart'); this.emit('sfx', 'heal'); return; }
      t.type = 'return';
    }
    if (t.type === 'return' || a.taskT > t.dur) {
      const home = this.randomTownCellNear(38, 36);
      if (this.walkTo(a, home[0], home[1]) || a.taskT > t.dur + 60) a.task = null;
      return;
    }
    // find target
    let m = t.target && s.mons.find(o => o.id === t.target && o.hp > 0);
    if (!m && t.chase) { m = s.mons.find(o => o.id === t.chase && o.hp > 0); t.target = m ? m.id : null; if (!m) { t.done = true; return; } }
    if (!m) { m = t.defend ? this.nearestRaider(a) : this.nearestMonster(a, 7, t.zone); t.target = m ? m.id : null; }
    if (m) this.fight(a, m);
    else if (t.defend) t.done = true;
    else {
      if (!t.dest || this.walkTo(a, t.dest[0], t.dest[1])) t.dest = this.randomCellInZone(t.zone) || [38, 44];
    }
  }
  nearestRaider(a) { let best = null, bd = 1e9; for (const m of this.s.mons) { if (!m.raid || m.hp <= 0) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; best = m; } } return best; }
  randomTownCellNear(x, y) { return this.grid.nearestWalkable(x + this.R.int(-4, 4), y + this.R.int(-2, 2), 8) || [x, y]; }
  nearestMonster(a, r, maxZone = 9) {
    let best = null, bd = r;
    for (const m of this.s.mons) { if (m.hp <= 0 || m.zone > maxZone || (m.quest && m.quest !== (a.task && a.task.qid))) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  fight(a, m) {
    const s = this.s, job = JOBS[a.job], range = job.range + perkSum(a, 'range') + 0.4, d = Math.hypot(m.x - a.x, m.y - a.y);
    // healers mend wounded allies first
    if (job.heal && a.cool <= 0) {
      const ally = s.advs.find(o => o !== a && !o.inside && !o.ko && !o.dungeon && o.hp < maxHp(o, s) * 0.6 && Math.hypot(o.x - a.x, o.y - a.y) < 4);
      if (ally) { const h = Math.round(stat(a, 'mag', s) * 1.6 * (1 + this.bonus('heal') + perkSum(a, 'healPct'))); ally.hp = Math.min(maxHp(ally, s), ally.hp + h);
        s.fx.push({ k: 'heal', x: ally.x, y: ally.y, t: 0, life: 0.8 }, { k: 'num', x: ally.x, y: ally.y - 0.8, t: 0, life: 0.9, text: '+' + h, c: '#7cff8a' }); a.cool = 1.4; a.atkT = 0.3; this.emit('sfx', 'heal'); return; }
    }
    if (d > range) { this.walkTo(a, Math.round(m.x), Math.round(m.y)) || (a.path && a.path.length > 12 && (a.path = null)); return; }
    a.path = null;
    a.dir = Math.abs(m.x - a.x) > Math.abs(m.y - a.y) ? (m.x < a.x ? 2 : 3) : (m.y < a.y ? 1 : 0);
    a.cool -= DT; if (a.cool > 0) return;
    a.cool = 1.1 / job.spd; a.atkT = 0.3;
    const magic = job.mag > job.atk, P = k => perkSum(a, k);
    // Rallying Roar from nearby allies
    let aura = 0; for (const o of s.advs) if (o !== a && !o.inside && !o.ko && o.perks.includes('roar') && Math.hypot(o.x - a.x, o.y - a.y) < 3) { aura = PERKS.roar.auraAtk; break; }
    const pow = (magic ? stat(a, 'mag', s) * 1.25 : stat(a, 'atk', s)) * (1 + aura);
    let dmg = Math.max(1, Math.round(pow * this.R.range(0.85, 1.2) - m.def * 0.5));
    const crit = this.R.chance(0.08 + P('crit') + gearSum(a, 'crit')); if (crit) dmg = Math.round(dmg * (1.8 + P('critMul')));
    const wpn = a.eq.weapon && ITEMS[a.eq.weapon];
    if (job.range > 1 || P('range')) s.fx.push({ k: 'proj', x: a.x, y: a.y, tx: m.x, ty: m.y, t: 0, life: 0.25,
      p: magic ? 'fire' : (wpn && wpn.bow) || job.weapon === 'Bow' ? 'arrow' : 'shuriken' });
    else s.fx.push({ k: 'slash', x: m.x, y: m.y, t: 0, life: 0.3, dir: a.dir });
    if (!m.boss && P('execute') && m.hp < m.mhp * 0.3 && this.R.chance(P('execute'))) { s.fx.push({ k: 'num', x: m.x, y: m.y - 1.1, t: 0, life: 1, text: 'FINISH!', c: '#ff5ad1', big: true }); dmg = m.hp; }
    this.hitMonster(m, dmg, a, crit);
    if (P('lifesteal')) a.hp = Math.min(maxHp(a, s), a.hp + Math.round(dmg * P('lifesteal')));
    if (P('burn') && m.hp > 0) { const b = Math.max(1, Math.round(dmg * P('burn'))); setTimeoutSim(this, 6, () => { if (m.hp > 0) { this.hitMonster(m, b, a); s.fx.push({ k: 'num', x: m.x, y: m.y - 0.4, t: 0, life: 0.7, text: String(b), c: '#ff8a3a' }); } }); }
    if (P('doubleHit') && this.R.chance(P('doubleHit')) && m.hp > 0) setTimeoutSim(this, 2, () => { if (m.hp > 0) { s.fx.push({ k: 'slash', x: m.x, y: m.y, t: 0, life: 0.3, dir: a.dir }); this.hitMonster(m, dmg, a); } });
    const splash = magic ? 0.5 * (1 + P('splash')) : 0, splashAll = P('splashAll'), sp = Math.max(splash, splashAll);
    if (sp) for (const o of s.mons) if (o !== m && o.hp > 0 && Math.hypot(o.x - m.x, o.y - m.y) < 1.5) this.hitMonster(o, Math.round(dmg * sp), a);
    // partner monster joins in
    if (a.partner) { const p = s.monsters.find(p => p.id === a.partner); if (p && this.R.chance(0.5)) this.hitMonster(m, Math.max(1, Math.round((MONSTERS[p.type]?.atk || 4) * (1 + p.bond / 50) * (1 + P('bondPct') * 0.5))), a); }
  }
  hitMonster(m, dmg, a, crit) {
    const s = this.s; if (m.hp <= 0) return;
    m.hp -= dmg; m.hitT = 0.2; m.target = a.id;
    s.fx.push({ k: 'num', x: m.x, y: m.y - 0.7, t: 0, life: 0.8, text: String(dmg), c: crit ? '#ffd23f' : '#fff', big: crit });
    this.emit('sfx', crit ? 'crit' : 'hit');
    if (m.hp <= 0) this.killMonster(m, a);
  }
  killMonster(m, a) {
    const s = this.s, R = this.R;
    m.hp = 0; m.deadT = 0.6;
    s.fx.push({ k: 'poof', x: m.x, y: m.y, t: 0, life: 0.5 });
    this.emit('sfx', 'kill');
    const M = m.boss ? BOSSES[m.boss] : MONSTERS[m.type];
    const el = m.elite ? 2.5 : 1;                                   // Elite: ×2.5 EXP and gold, ×2 drops, ×3 treasure
    const xp = Math.round(M.xp * 1.6 * (1 + m.lv * 0.08) * (1 + this.bonus('xp')) * el);
    const party = s.advs.filter(o => !o.inside && !o.ko && Math.hypot(o.x - m.x, o.y - m.y) < 5);
    for (const o of party) this.gainXp(o, Math.ceil(xp / Math.max(1, party.length) * (party.length > 1 ? 1.3 : 1)));
    const gold = Math.round(M.gold * (1 + m.lv * 0.05) * (this.eventOn('contest') ? 2 : 1) * (1 + perkSum(a, 'goldPct')) * Math.max(0.1, 1 + this.charter('killGold') + frontierBonus(s, 'killGold')) * (m.golden ? 5 : 1) * el);
    a.gold += gold; a.kills++; s.stats.kills++; s.stats.monthKills++; s.pop += (m.boss ? 30 : 0.25) + perkSum(a, 'popKill');
    this.addSat(a, 1.5);
    // materials go to the village
    const drops = M.drops || {};
    const md = (1 + this.charter('matDrops')) * (m.elite ? 2 : 1) * (1 + frontierBonus(s, 'matDrops'));
    for (const k in drops) { const n = m.boss ? Math.round(drops[k] * md) : (R.chance(Math.min(1, drops[k] * md)) ? 1 : 0); if (n) { s.mats[k] = (s.mats[k] || 0) + n; s.fx.push({ k: 'mat', x: m.x, y: m.y, t: 0, life: 1, mat: k }); } }
    // treasure chest: discovers new gear for the shops
    if (m.golden || R.chance(m.boss ? 1 : 0.025 * (m.elite ? 3 : 1) * (1 + perkSum(a, 'treasurePct') + this.charter('treasure') + (this.happening('fog') ? 0.5 : 0)))) this.treasure(m, a);
    if (m.elite) log(s, `${a.name} defeated an Elite ${M.name}!`, 'good');
    if (m.golden) { const g = 300 + s.stars * 150; s.gold += g; s.mats.crystal = (s.mats.crystal || 0) + 3; log(s, `${a.name} caught the Golden Slime! +${g}G for the village.`, 'title'); this.emit('fanfare', 'Golden Slime caught!', `${a.name} +${g}G · treasure · crystals`); }
    // taming
    const stable = s.buildings.find(b => b.type === 'stable');
    if (!m.boss && !M.human && stable && s.monsters.length < FAC.stable.cap + stable.lv - 1 && !m.raid && R.chance(0.03 * (1 + this.bonus('tame') + perkSum(a, 'tamePct') + this.charter('tamePct')))) {
      s.monsters.push({ id: s.nextId++, type: m.type, name: MONSTERS[m.type].name, bond: 0, x: m.x, y: m.y, dir: 0, anim: 0, tx: m.x, ty: m.y });
      log(s, `The ${MONSTERS[m.type].name} wants to join the village! It moved into the Stable.`, 'good');
      this.emit('fanfare', `${MONSTERS[m.type].name} joined!`, 'Assign it as a partner in the Adventurers menu.');
      this.recomputeTraits();
    }
  }
  treasure(m, a) {
    const s = this.s;
    const pool = Object.keys(ITEMS).filter(id => !ITEMS[id].legendary && !s.unlocked[id] && ITEMS[id].dev && this.itemTier(id) <= 1 + Math.floor(m.lv / 6));
    s.fx.push({ k: 'chest', x: m.x, y: m.y, t: 0, life: 1.6 });
    if (pool.length) {
      const id = this.R.pick(pool); s.unlocked[id] = true;
      log(s, `${a.name} found a treasure chest: ${ITEMS[id].name} can now be sold in shops!`, 'title');
      this.emit('fanfare', 'New gear discovered!', ITEMS[id].name);
    } else { const g = 50 + m.lv * 20; s.gold += g; log(s, `${a.name} found a treasure chest with ${g}G.`, 'coin'); }
  }
  itemTier(id) { const p = ITEMS[id].price; return p < 200 ? 1 : p < 600 ? 2 : p < 1500 ? 3 : p < 3000 ? 4 : 5; }
  devCost(id) { return { ...(ITEMS[id].dev || {}) }; }
  develop(id) {
    if (!ITEMS[id] || ITEMS[id].legendary) return 'This relic must be earned by capturing its territory';
    const s = this.s; if (!s.buildings.some(b => b.type === 'smith')) return 'Build a Blacksmith first';
    if (s.unlocked[id]) return 'Already developed';
    const cost = this.devCost(id), gold = Math.round(ITEMS[id].price * 1.5);
    for (const k in cost) if ((s.mats[k] || 0) < cost[k]) return `Need ${cost[k]} ${MATS[k].name}`;
    if (s.gold < gold) return 'Not enough gold';
    for (const k in cost) s.mats[k] -= cost[k];
    s.gold -= gold; s.unlocked[id] = true;
    log(s, `Developed ${ITEMS[id].name}! Shops now stock it.`, 'good'); this.emit('fanfare', 'Development complete!', ITEMS[id].name);
    return null;
  }

  koStep(a) {
    a.koT = (a.koT || 0) + DT;
    if (a.koT < 4) return;
    const home = (a.home && this.s.buildings.find(b => b.id === a.home)) || this.facilities('sleep')[0] || this.s.buildings.find(b => b.type === 'guild');
    const [dx, dy] = this.door(home);
    if (this.walkTo(a, dx, dy)) { a.ko = false; a.koT = 0; a.hp = 1; a.task = { type: 'visit', b: home.id, dur: 15, sleep: true }; a.inside = { b: home.id, t: 15, task: a.task }; }
  }
  hurtAdv(a, dmg, src) {
    const s = this.s; if (a.ko || a.inside || a.dungeon) return;
    if (this.R.chance(Math.min(0.35, perkSum(a, 'dodge')))) { s.fx.push({ k: 'num', x: a.x, y: a.y - 0.8, t: 0, life: 0.7, text: 'Miss', c: '#bfe6ff' }); return; }
    if (this.happening('fog')) dmg *= 1.15;
    dmg = Math.max(1, Math.round(dmg - stat(a, 'def', s) * 0.45));
    a.hp -= dmg; a.hitT = 0.2;
    if (a.hp <= 0 && perkSum(a, 'revive') && !a.revived) { a.revived = true; a.hp = Math.round(maxHp(a, s) / 2); this.bark(a, 'Not yet!'); s.fx.push({ k: 'lvl', x: a.x, y: a.y, t: 0, life: 1.2 }); return; }
    s.fx.push({ k: 'num', x: a.x, y: a.y - 0.8, t: 0, life: 0.8, text: String(dmg), c: '#ff6b6b' });
    if (a.hp <= 0) {
      a.hp = 0; a.ko = true; a.koT = 0; a.path = null; a.sat = Math.max(0, a.sat - 8);
      if (a.task && a.task.type !== 'quest') a.task = null;
      log(s, `${a.name} was knocked out by a ${src}!`, 'bad'); this.emote(a, 'skull'); this.emit('sfx', 'ko');
    }
  }

  // ---------- monsters ----------
  monStep(m) {
    if (m.hp <= 0) return;
    const s = this.s, R = this.R; m.anim += DT; if (m.hitT > 0) m.hitT -= DT; if (m.atkT > 0) m.atkT -= DT;
    const M = m.boss ? BOSSES[m.boss] : MONSTERS[m.type];
    const spd = (m.boss ? 0.7 : M.spd) * 1.2 * DT;
    if (m.flee) return this.fleeStep(m, spd);
    if (m.delay > 0) { m.delay -= DT; return; }
    let tgt = m.target && s.advs.find(a => a.id === m.target && !a.ko && !a.inside && !a.dungeon);
    if (tgt && Math.hypot(tgt.x - m.x, tgt.y - m.y) > 9) { tgt = null; m.target = null; }
    if (!tgt) { // aggro: attack adventurers that wander close
      for (const a of s.advs) if (!a.ko && !a.inside && !a.dungeon && Math.hypot(a.x - m.x, a.y - m.y) < (m.boss ? 4 : 2.2)) { tgt = a; m.target = a.id; break; }
    }
    if (tgt) {
      const d = Math.hypot(tgt.x - m.x, tgt.y - m.y), reach = m.boss ? 1.6 : 1.0;
      if (d > reach) { if (townDist(s, Math.round(m.x), Math.round(m.y)) > 0 || m.boss || m.raid) this.stepToward(m, tgt.x, tgt.y, spd); else { m.target = null; } }
      m.cd -= DT;
      if (d <= reach + 0.2 && m.cd <= 0) { m.cd = m.boss ? 1.3 : 1.5; m.atkT = 0.3; this.hurtAdv(tgt, m.atk * R.range(0.8, 1.15), M.name); s.fx.push({ k: M.human ? 'slash' : 'claw', x: tgt.x, y: tgt.y, t: 0, life: 0.3, dir: m.dir }); if (M.human) this.emit('sfx', 'sword'); }
      return;
    }
    if (m.charge) return this.chargeStep(m, spd);
    // wander around home point, never into town
    if (Math.hypot(m.tx - m.x, m.ty - m.y) < 0.1 || R.chance(0.005)) {
      if (R.chance(0.02)) { const nx = m.hx + R.int(-4, 4), ny = m.hy + R.int(-4, 4); if (this.grid.walkable(nx, ny) && townDist(s, nx, ny) > 1) { m.tx = nx; m.ty = ny; } }
    } else this.stepToward(m, m.tx, m.ty, spd * 0.5);
  }
  petStep(m) {
    const s = this.s; m.anim += DT;
    const owner = s.advs.find(a => a.partner === m.id);
    if (owner && !owner.inside) {
      if (Math.hypot(owner.x - m.x, owner.y - m.y) > 1.2) this.stepToward(m, owner.x - 0.6, owner.y + 0.3, this.speed(owner) * DT * 1.1);
      if (owner.task && owner.task.type === 'hunt' && s.tick % Math.round(100 / (1 + perkSum(owner, 'bondPct'))) === 0) m.bond = Math.min(100, m.bond + 1);
      m.riding = m.bond >= 50;
      m.x = m.riding ? owner.x : m.x; m.y = m.riding ? owner.y + 0.05 : m.y;
      return;
    }
    m.riding = false;
    if (Math.hypot(m.tx - m.x, m.ty - m.y) < 0.1) { if (this.R.chance(0.01)) { const c = this.randomTownCell(); if (c) { m.tx = c[0]; m.ty = c[1]; } } }
    else this.stepToward(m, m.tx, m.ty, 1.2 * DT);
  }
  // Townsfolk (DV2 "local residents"): appear as the town's traits grow, stroll and spend small change.
  folkCensus() {
    const s = this.s, total = Object.values(s.traits || {}).reduce((a, b) => a + b, 0);
    const want = Math.min(14, Math.floor(total / 30));
    if (s.folk.length < want) {
      const c = this.randomTownCell(); if (!c) return;
      s.folk.push({ id: s.nextId++, spr: this.R.pick(['Child', 'OldMan2', 'Inspector', 'OldMan', 'Woman', 'Villager2', 'Boy']), x: c[0], y: c[1], dir: 1, anim: 0, path: null, task: null, taskT: 0 });
    } else if (s.folk.length > want) s.folk.pop();
  }
  folkStep(f) {
    const s = this.s; f.anim += DT;
    if (f.inside) { f.inside -= DT; if (f.inside <= 0) f.inside = 0; return; }
    if (!f.task) {
      const food = this.R.chance(0.35) && this.facilities(this.R.chance(0.5) ? 'food' : 'shop');
      const b = food && food.length ? this.R.pick(food) : null;
      f.task = b ? { b: b.id } : { dest: this.randomTownCell() }; f.taskT = 0; f.path = null;
    }
    f.taskT += DT;
    const t = f.task;
    if (t.b) {
      const b = s.buildings.find(o => o.id === t.b); if (!b) { f.task = null; return; }
      const [dx, dy] = this.door(b);
      if (t.travelLimit === undefined) t.travelLimit = 40 + Math.max(0, Math.hypot(dx - f.x, dy - f.y) - 40) * 2;
      if (this.walkTo(f, dx, dy)) {
        const p = Math.max(2, Math.round((FAC[b.type].price || 12) * 0.4));
        s.gold += p; s.stats.income += p; b.sales += p; b.visits++; f.inside = 3; f.task = null;
        s.fx.push({ k: 'coin', x: b.x + FAC[b.type].fp[0] / 2, y: b.y, t: 0, life: 1, text: `+${p}G` });
      } else if (f.taskT > t.travelLimit) f.task = null;
    } else if (!t.dest || this.walkTo(f, t.dest[0], t.dest[1]) || f.taskT > 25) { f.task = null; }
  }
  animalStep(an) {
    an.t -= DT;
    if (an.t <= 0) { an.t = this.R.range(2, 6); const c = this.grid.nearestWalkable(an.x + this.R.int(-3, 3), an.y + this.R.int(-3, 3), 3); if (c && townDist(this.s, c[0], c[1]) === 0) { an.tx = c[0]; an.ty = c[1]; } }
    const dx = an.tx - an.x; if (Math.abs(dx) > 0.05) an.flip = dx > 0;
    an.moving = Math.hypot(an.tx - an.x, an.ty - an.y) > 0.05;
    if (an.moving) this.stepToward(an, an.tx, an.ty, 0.9 * DT);
  }
  // ---------- charters & seeded world ----------
  charter(key) { const c = this.s.charter && CHARTERS.find(c => c.id === this.s.charter); return (c && typeof c.mods[key] === 'number') ? c.mods[key] : 0; }
  charterHappen(id) { const c = this.s.charter && CHARTERS.find(c => c.id === this.s.charter); return (c && c.mods.happen && c.mods.happen[id]) || 1; }
  zoneMons(z) { const w = this.s.world, l = w && w.zoneMons && w.zoneMons[z]; return l && l.length ? l : ZONE_MONS[z]; }
  chooseCharter(id) {
    const s = this.s, C = CHARTERS.find(c => c.id === id);
    if (!C) return 'Unknown charter';
    if (s.charter) return 'A charter is already signed';
    if (s.charterChoices.length && !s.charterChoices.includes(id)) return 'That charter was not offered';
    s.charter = id; const st = C.start || {};
    if (st.gold) s.gold = Math.max(0, s.gold + st.gold);
    for (const t of [...(st.build || []), ...(st.decor || [])]) this.placeFree(t);
    if (st.adv) {
      const a = spawnAdventurer(s, this.R, { x: 37, y: 28 }); teachJob(a, st.adv, this.R);
      a.lv = 4; a.resident = true; a.sat = 80; a.hp = maxHp(a, s);
      const home = this.facilities('home').find(b => s.advs.filter(o => o.home === b.id).length < this.capOf(b)); a.home = home ? home.id : null;
    }
    this.rebuildGrid(); this.recomputeTraits(true); this.invalidatePaths();
    log(s, `Charter signed: ${C.name}. ${C.up}.`, 'title'); this.emit('fanfare', C.name, C.up);
    return null;
  }
  // Place a building/decor for free on the nearest valid spot around the Guild Hall (spiral search).
  placeFree(type) {
    const s = this.s, cx = 37, cy = 27;
    for (let r = 2; r < 16; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy; if (this.canPlace(type, x, y, true)) continue;
      const [w, h] = defOf(type).fp;
      s.props = s.props.filter(p => !(p.soft && p.x >= x - 1 && p.x < x + w && p.y >= y && p.y < y + h));
      place(s, type, x, y).free = true; this.rebuildGrid(); return true;
    }
    return false;
  }

  // ---------- happenings (weekly random events, see js/happenings.js) ----------
  happening(id) { return this.s.happen && this.s.happen.find(h => h.id === id); }
  rollHappening() {
    const s = this.s, R = this.R;
    if (!R.chance(Math.min(0.95, HAPPEN_CHANCE + this.charter('happenChance')))) return;
    const recent = new Set(s.happenLog.slice(-3).map(h => h.id));
    const pool = HAPPENINGS.filter(h => s.stars >= h.minStars && !this.happening(h.id) && !recent.has(h.id) && (h.id !== 'merchant' || this.merchantPool().length));
    if (!pool.length) return;
    const w = h => h.weight * this.charterHappen(h.id);
    let r = R.range(0, pool.reduce((n, h) => n + w(h), 0));
    const pick = pool.find(h => (r -= w(h)) <= 0) || pool[pool.length - 1];
    this.startHappening(pick.id);
  }
  startHappening(id) {
    const s = this.s, R = this.R, H = HAPPENINGS.find(h => h.id === id); if (!H) return 'Unknown happening';
    if (this.happening(id)) return 'Already happening';
    if (id === 'merchant' && !this.merchantPool().length) return 'The merchant has nothing left to sell';
    const h = { id, weeks: H.weeks, data: {} };
    s.happen.push(h); s.happenLog.push({ id, t: `Y${s.time.year} M${s.time.month} W${s.time.week}` }); if (s.happenLog.length > 24) s.happenLog.shift();
    const guild = s.buildings.find(b => b.type === 'guild');
    const nearGuild = dx => { const [x, y] = guild ? this.door(guild) : [37, 28]; return this.grid.nearestWalkable(x + dx, y + 1, 6) || [x, y]; };
    switch (id) {
      case 'merchant': { h.data.offer = this.merchantOffer(); const [x, y] = nearGuild(3); s.npcs.push({ kind: 'merchant', spr: 'OldMan', x, y, dir: 0, anim: 0 }); break; }
      case 'goldslime': {
        const z = R.int(1, Math.min(4, 1 + s.stars));
        const m = this.spawnMonster(z, 'slimeB', null, { golden: true, flee: true, lvBonus: 2 });
        if (m) { m.hp = m.mhp = m.mhp * 3; h.data.mob = m.id; }
        break;
      }
      case 'rain': case 'sunny': case 'harvest': case 'fog': break;          // passive: read via this.happening(id)
      case 'bard': { for (const a of s.advs) this.addSat(a, 12); s.pop += 15; const [x, y] = nearGuild(-3); s.npcs.push({ kind: 'bard', spr: 'OldMan2', x, y, dir: 0, anim: 0 }); break; }
      case 'stampede': {
        const z = Math.min(4, 1 + Math.floor(s.stars / 2)), n = Math.min(10, 4 + Math.round(s.stars * 1.5)), t = s.town, side = R.pick(['n', 'e', 'w']);
        h.data.mobs = []; h.data.side = side; h.data.breaches = 0;
        for (let i = 0; i < n; i++) {
          const x = side === 'w' ? R.int(1, 4) : side === 'e' ? R.int(HOME_W - 5, HOME_W - 2) : R.int(t.x0, t.x1 - 1);
          const y = side === 'n' ? R.int(1, 4) : R.int(t.y0 + 2, t.y1 - 3);
          const tx = side === 'w' ? t.x0 : side === 'e' ? t.x1 - 1 : Math.max(t.x0, Math.min(t.x1 - 1, x));
          const ty = side === 'n' ? t.y0 : Math.max(t.y0, Math.min(t.y1 - 1, y));
          const m = this.spawnMonster(z, null, [x, y], { raid: 'stampede', charge: { x: tx, y: ty }, delay: 2 + i * 1.0 });
          if (m) h.data.mobs.push(m.id);
        }
        this.rally();
        break;
      }
      case 'bandits': {
        const n = 2 + Math.min(3, s.stars), bz = s.stars < 2 ? 1 : Math.min(4, 1 + Math.floor(s.stars / 2)); h.data.mobs = [];
        const gang = s.stars < 2 ? ['cutthroat', 'thief'] : s.stars < 3 ? ['cutthroat', 'thief', 'swine', 'brute'] : s.stars < 4 ? ['thief', 'swine', 'brute', 'ronin'] : ['cutthroat', 'brute', 'ronin', 'ronin'];
        const f = [0.55, 0.6, 0.75, 0.85, 0.9, 1][s.stars];            // outlaw stats are zone-3/4 grade: scale them to the rank
        for (let i = 0; i < n + (s.stars >= 4 ? 1 : 0); i++) {
          let c = null;
          for (let k = 0; k < 60 && !c; k++) {
            const x = R.int(s.town.x0 - 4, s.town.x1 + 3), y = R.int(s.town.y0 - 4, s.town.y1 + 3), d = townDist(s, x, y);
            if (d >= 2 && d <= 4 && this.grid.walkable(x, y) && !(Math.abs(x - 38) < 4 && y >= s.town.y1)) c = [x, y];
          }
          if (!c) continue;
          const m = this.spawnMonster(bz, i === n ? 'chief' : R.pick(gang), c, { raid: 'bandits', lvBonus: 1 });
          if (m) { m.hp = m.mhp = Math.round(m.mhp * f); m.atk = Math.round(m.atk * f); m.def = Math.round(m.def * f); h.data.mobs.push(m.id); }
        }
        this.rally();
        break;
      }
      case 'meteor': h.data.crystals = 2 + s.stars; break;
      case 'wanderer': {
        const a = spawnAdventurer(s, R, this.edgeSpawn());
        const pool = Object.keys(JOBS).filter(j => JOBS[j].tier >= 2 && JOBS[j].tier <= Math.min(4, 2 + Math.floor(s.stars / 2)));
        teachJob(a, R.pick(pool), R);
        a.lv = 8 + s.stars * 5; a.gold += 400 + s.stars * 150; a.sat = 45; a.legend = true; a.stay = 21; a.hp = maxHp(a, s);
        h.data.adv = a.id;
        break;
      }
    }
    if ((id === 'stampede' || id === 'bandits') && !h.data.mobs.length) {      // no room to spawn: call it off, no reward
      s.happen = s.happen.filter(x => x !== h); s.happenLog.pop(); return 'No room for a raid';
    }
    log(s, `${H.name}! ${H.desc}`, 'title'); this.emit('fanfare', H.name, H.desc); this.emit('sfx', 'alert');
    return null;
  }
  tickHappenings() {
    const s = this.s;
    for (const h of s.happen) h.weeks--;
    const done = s.happen.filter(h => h.weeks <= 0);
    s.happen = s.happen.filter(h => h.weeks > 0);
    for (const h of done) this.endHappening(h);
  }
  endHappening(h) {
    const s = this.s, alive = ids => s.mons.filter(m => (ids || []).includes(m.id) && m.hp > 0), bonus = 1 + this.charter('raidReward');
    switch (h.id) {
      case 'merchant': s.npcs = s.npcs.filter(n => n.kind !== 'merchant'); log(s, 'The traveling merchant packed up and left.'); break;
      case 'bard': s.npcs = s.npcs.filter(n => n.kind !== 'bard'); break;
      case 'goldslime': for (const m of alive([h.data.mob])) { m.hp = 0; m.deadT = 0.3; log(s, 'The Golden Slime slipped away…'); } break;
      case 'stampede': {
        const left = alive(h.data.mobs);
        for (const m of left) { m.hp = 0; m.deadT = 0.3; }
        if (!left.length && !h.data.breaches) { const tp = Math.round((5 + s.stars * 2) * bonus); s.tp += tp; s.pop += 20; log(s, `Stampede repelled without a single breach! +${tp} TP`, 'title'); this.emit('fanfare', 'Stampede repelled!', `+${tp} Town Points`); }
        else log(s, `The stampede is over (${h.data.breaches} broke through).`, h.data.breaches ? 'bad' : 'good');
        break;
      }
      case 'bandits': {
        const left = alive(h.data.mobs);
        for (const m of left) { m.hp = 0; m.deadT = 0.3; }
        if (left.length) { const steal = Math.floor(Math.min(s.gold * 0.1, 200 + s.stars * 150)); s.gold -= steal; log(s, `The bandits made off with ${steal}G!`, 'bad'); this.emit('sfx', 'fail'); }
        else { const g = Math.round((150 + s.stars * 100) * bonus); s.gold += g; s.tp += 3; log(s, `Bandits driven off! Their loot: +${g}G, +3 TP`, 'title'); this.emit('fanfare', 'Bandits driven off!', `+${g}G`); }
        break;
      }
      case 'meteor': {
        const n = Math.round(h.data.crystals * (1 + this.charter('matDrops'))); s.mats.crystal = (s.mats.crystal || 0) + n;
        log(s, `Fallen stars collected: +${n} Crystal.`, 'good');
        if (this.R.chance(0.35)) this.treasure({ x: 37, y: 20, lv: 5 + s.stars * 4 }, { name: 'A falling star' });
        break;
      }
      case 'wanderer': { const a = s.advs.find(o => o.id === h.data.adv); if (a && !a.resident) log(s, `${a.name} the wanderer moved on.`); break; }
    }
  }
  merchantPool() { const s = this.s, cap = 2 + Math.floor(s.stars / 2); return Object.keys(ITEMS).filter(id => !ITEMS[id].legendary && !s.unlocked[id] && ITEMS[id].dev && this.itemTier(id) <= cap); }
  merchantOffer() {
    return shuffle(this.R, this.merchantPool()).slice(0, 3).map(id => ({ id, price: Math.round(ITEMS[id].price * 2.5) }));
  }
  buyMerchant(id) {
    if (!ITEMS[id] || ITEMS[id].legendary) return 'Relics cannot be bought';
    const s = this.s, h = this.happening('merchant'); if (!h) return 'The merchant has left';
    const o = h.data.offer.find(o => o.id === id); if (!o) return 'Sold out';
    if (s.unlocked[id]) return 'Already in stock';
    if (s.gold < o.price) return 'Not enough gold';
    s.gold -= o.price; s.unlocked[id] = true; h.data.offer = h.data.offer.filter(x => x !== o);
    log(s, `Bought a licence for ${ITEMS[id].name} from the merchant (${o.price}G). Shops now stock it.`, 'good');
    this.emit('fanfare', 'Licence bought!', ITEMS[id].name);
    return null;
  }
  fleeStep(m, spd) {
    const s = this.s; let near = null, nd = 5;
    for (const a of s.advs) { if (a.ko || a.inside || a.dungeon) continue; const d = Math.hypot(a.x - m.x, a.y - m.y); if (d < nd) { nd = d; near = a; } }
    if (near) {
      const dx = m.x - near.x, dy = m.y - near.y, d = Math.hypot(dx, dy) || 1, ox = m.x, oy = m.y;
      this.stepToward(m, m.x + dx / d * 2, m.y + dy / d * 2, spd * 1.6);
      if (townDist(s, Math.round(m.x), Math.round(m.y)) <= 1) { m.x = ox; m.y = oy; }   // never flees into town
    } else if (Math.hypot(m.tx - m.x, m.ty - m.y) < 0.1 || this.R.chance(0.01)) {
      const nx = m.hx + this.R.int(-5, 5), ny = m.hy + this.R.int(-5, 5); if (this.grid.walkable(nx, ny) && townDist(s, nx, ny) > 1) { m.tx = nx; m.ty = ny; }
    } else this.stepToward(m, m.tx, m.ty, spd * 0.6);
  }
  // Stampede monsters run straight at the village edge (trampling through scenery); reaching it = a breach.
  chargeStep(m, spd) {
    const s = this.s, c = m.charge, dx = c.x - m.x, dy = c.y - m.y, d = Math.hypot(dx, dy) || 1, v = Math.min(d, spd);
    m.x += dx / d * v; m.y += dy / d * v; m.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    if (townDist(s, Math.round(m.x), Math.round(m.y)) === 0) {
      const M = MONSTERS[m.type], h = this.happening('stampede');
      const hurt = !h || h.data.breaches < 5;                     // penalties stop after 5 breaches per stampede
      if (hurt) { s.pop = Math.max(0, s.pop - 3); s.gold = Math.max(0, s.gold - (10 + s.stars * 5)); }
      if (h) h.data.breaches++;
      s.fx.push({ k: 'poof', x: m.x, y: m.y, t: 0, life: 0.5 }); m.hp = 0; m.deadT = 0.3;
      log(s, `A ${M.name} broke into the village!${hurt ? ' Visitors are scared (−3 popularity).' : ''}`, 'bad'); this.emit('sfx', 'alert');
    }
  }
  // Everyone who is free drops what they are doing and defends the village (stampedes, bandits).
  rally() {
    for (const a of this.s.advs) {
      if (a.inside || a.ko || a.dungeon || this.questForPawn(a.id) || (a.task && a.task.type === 'quest') || a.hp < maxHp(a, this.s) * 0.4) continue;
      a.task = { type: 'hunt', zone: 9, defend: true, dur: 90 }; a.taskT = 0; a.path = null; this.emote(a, 'exclaim');
    }
  }
  npcStep(n) {
    n.anim += DT;
    if (n.kind === 'bard' && (!n.dest || this.walkTo(n, n.dest[0], n.dest[1]))) n.dest = this.randomTownCell();
  }
  towerStep() {
    const s = this.s; if (s.tick % 12) return;
    for (const b of s.buildings) {
      if (b.type !== 'tower') continue;
      const cx = b.x + 1, cy = b.y;
      const m = s.mons.find(m => m.hp > 0 && Math.hypot(m.x - cx, m.y - cy) < FAC.tower.range + b.lv);
      if (m) { s.fx.push({ k: 'proj', x: cx, y: cy - 1.5, tx: m.x, ty: m.y, t: 0, life: 0.3, p: 'arrow' });
        const dmg = Math.round((FAC.tower.dmg + b.lv * 4) * (1 + this.bonus('defense')));
        const shooter = s.advs[0] || { id: -1, gold: 0, kills: 0, x: cx, y: cy, persona: [] };
        this.hitMonster(m, dmg, shooter); }
    }
  }

  emote(a, k) { a.emote = k; a.emoteT = 1.6; }
  bark(a, text) { a.bark = text; a.barkT = 1.8; }

  // ---------- quests ----------
  refreshQuests() {
    const s = this.s, R = this.R; s.quests = [];
    const maxZone = Math.min(4, 1 + s.stars);
    for (let z = 1; z <= maxZone; z++) {
      const type = R.pick(this.zoneMons(z));
      s.quests.push({ id: s.nextId++, kind: 'outbreak', zone: z, mon: type, n: 5 + z, fee: 100 * z, reward: { gold: 350 * z, tp: 4 * z, pop: 20 * z },
        name: MONSTERS[type].human ? `${MONSTERS[type].name} Hideout` : `${MONSTERS[type].name} Outbreak`,
        desc: MONSTERS[type].human ? `A band of ${MONSTERS[type].name}s hides in the ${BIOMES[ZONE_BIOME[z]].name}. Drive them out!` : `A swarm of ${MONSTERS[type].name}s gathers in the ${BIOMES[ZONE_BIOME[z]].name}.` });
    }
    if (s.stars >= 1) {
      const floors = 3 + s.stars;
      s.quests.push({ id: s.nextId++, kind: 'dungeon', zone: Math.min(4, 2 + Math.floor(s.stars / 2)), floors, fee: 150 * floors, reward: { gold: 220 * floors, tp: 3 * floors, pop: 12 * floors },
        name: `Old Cave · ${floors} floors`, desc: 'Delve into the cave north of town. Treasure waits at the bottom.' });
    }
    // the next two undefeated bosses whose star requirement is met
    const next = Object.entries(BOSSES).filter(([id, B]) => !s.bossesBeaten[id] && !s.activeQuests.some(q => !q.frontier && q.boss === id) && B.star <= s.stars).sort((p, q) => p[1].rec - q[1].rec).slice(0, 2);
    for (const [id, B] of next) s.quests.push({ id: s.nextId++, kind: 'boss', zone: B.zone, boss: id, fee: Math.round(B.gold * 0.3), reward: { gold: B.gold, tp: 8 + Math.round(B.rec * 1.5), pop: 40 + B.rec * 12 },
      name: `Defeat ${B.name}`, desc: `${B.name} terrorises the ${BIOMES[ZONE_BIOME[B.zone]].name}. Assemble your best!` });
  }
  questLevel(q) { return q.rec || (q.boss ? BOSSES[q.boss].rec : [0, 1, 5, 10, 16][q.zone]); }
  frontierQuest(id) {
    const f = FRONTIERS.find(f => f.id === id); if (!f) return null;
    return { id: 'frontier:' + id, frontier: id, kind: 'boss', name: f.bossName, desc: `Capture ${f.name}`, boss: f.boss, zone: f.zone, fee: f.fee, rec: f.rec, spot: [f.x, f.y], reward: { gold: f.fee * 2, tp: 10 + f.star * 5, pop: 50 + f.star * 20 } };
  }
  questById(id) { return String(id).startsWith('frontier:') ? this.frontierQuest(String(id).slice(9)) : this.s.quests.find(q => q.id === +id); }
  frontierBlock(id) {
    const f = FRONTIERS.find(f => f.id === id), s = this.s;
    if (!f) return 'Unknown territory';
    if (s.frontier.completed[id]) return 'Territory already captured';
    if (s.activeQuests.some(q => q.frontier === id)) return 'A party is already challenging this den';
    if (s.stars < f.star) return `Needs a ${f.star}-star village`;
    const missing = f.requires.filter(id => !s.frontier.completed[id]);
    if (missing.length) return 'Capture first: ' + missing.map(id => FRONTIERS.find(f => f.id === id).name).join(', ');
    return null;
  }
  captureFrontier(id) {
    const s = this.s, f = FRONTIERS.find(f => f.id === id);
    if (!f || s.frontier.completed[id]) return;
    s.frontier.completed[id] = true; s.frontier.relics[f.relic] = null;
    s.props = s.props.filter(p => p.k === 'cave' || townDist(s, p.x, p.y) > 0 || p.soft);
    for (const m of s.mons) if (!m.quest && !m.raid && townDist(s, m.x, m.y) === 0) m.hp = 0;
    this.rebuildGrid(); this.invalidatePaths();
    log(s, `${f.name} captured! Land is buildable. ${f.benefit}. Relic: ${ITEMS[f.relic].name}.`, 'title');
  }
  equipRelic(id, pawnId) {
    const s = this.s, it = ITEMS[id];
    if (!it?.legendary || !Object.hasOwn(s.frontier.relics, id)) return 'Relic not yet earned';
    const a = pawnId == null ? null : s.advs.find(a => a.id === pawnId && a.resident);
    if (pawnId != null && !a) return 'Choose a resident adventurer';
    const old = s.advs.find(a => a.id === s.frontier.relics[id]);
    if (old === a && a?.eq.acc === id) return null;
    if ([old, a].some(a => a && (a.ko || this.questForPawn(a.id)))) return 'Wait until the adventurer returns and recovers';
    if (old?.eq.acc === id) { old.eq.acc = null; old.hp = Math.min(old.hp, maxHp(old, s)); }
    if (a) {
      if (ITEMS[a.eq.acc]?.legendary) s.frontier.relics[a.eq.acc] = null;
      a.eq.acc = id; a.hp = Math.min(a.hp, maxHp(a, s));
    }
    s.frontier.relics[id] = a ? a.id : null;
    return null;
  }
  questForPawn(id) { return this.s.activeQuests.find(q => q.members.includes(id)); }
  questCandidates() {
    const s = this.s;
    return s.advs.filter(a => !a.ko && a.hp > 0 && !a.dungeon && a.task?.type !== 'quest' && !this.questForPawn(a.id));
  }
  questReady(q) { return this.questCandidates().filter(a => a.lv >= this.questLevel(q) && a.hp >= maxHp(a, this.s) * 0.5); }
  autoQuestParty(qid) {
    const q = this.questById(qid); if (!q) return [];
    const cands = this.questReady(q);
    return shuffle(this.R, cands).slice(0, 4).map(a => a.id);
  }
  questExtraFee(q) { return Math.ceil(q.fee * 0.25); }
  questCost(q, count) { return q.fee + Math.max(0, count - 4) * this.questExtraFee(q); }
  instantQuest(qid) {
    const q = this.questById(qid); if (!q) return 'Quest gone';
    if (q.frontier) { const err = this.frontierBlock(q.frontier); if (err) return err; }
    if (this.s.gold < q.fee) return 'Not enough gold for the quest';
    if (!this.questReady(q).length) return 'No capable adventurers are available right now';
    return this.startQuest(qid, this.autoQuestParty(qid));
  }
  startQuest(qid, memberIds) {
    const s = this.s, q = this.questById(qid); if (!q) return 'Quest gone';
    if (q.frontier) { const err = this.frontierBlock(q.frontier); if (err) return err; }
    const ids = [...new Set(memberIds)];
    if (!ids.length) return 'Pick at least one adventurer';
    if (ids.length > 8) return 'A party can have at most 8 adventurers';
    const members = this.questCandidates().filter(a => ids.includes(a.id));
    if (members.length !== ids.length) return 'A selected adventurer is unavailable. Check your party';
    const cost = this.questCost(q, members.length);
    if (s.gold < cost) return 'Not enough gold for the quest and extra adventurers';
    s.gold -= cost;
    const cv = cavePos(s), spot = q.frontier ? q.spot : q.kind === 'dungeon' ? [cv.x + 1, cv.y + 1] : (this.randomCellInZone(q.zone) || [38, 50]);
    q.spot = spot; q.mobs = []; q.floor = 0; q.ft = 0;
    if (q.kind === 'dungeon') { /* no field mobs */ }
    else if (q.kind === 'outbreak') for (let i = 0; i < q.n; i++) { const c = this.grid.nearestWalkable(spot[0] + this.R.int(-2, 2), spot[1] + this.R.int(-2, 2)) || spot; const m = this.spawnMonster(q.zone, q.mon, c, { quest: q.id, lvBonus: 1 }); if (m) q.mobs.push(m.id); }
    else {
      const m = this.spawnBoss(q.boss, spot, { quest: q.id, ...(q.frontier ? { frontier: q.frontier, lv: q.rec } : {}) });
      if (q.frontier) { m.hp = m.mhp = Math.round(m.mhp * 1.35); m.atk = Math.round(m.atk * 1.15); }
      q.mobs.push(m.id);
    }
    for (const a of members) { if (a.inside) { const b = s.buildings.find(o => o.id === a.inside.b); if (b) b.occ = b.occ.filter(i => i !== a.id); a.inside = null; } a.task = { type: 'quest', qid: q.id }; a.path = null; }
    s.activeQuests.push({ ...q, members: members.map(a => a.id), t: 0 });
    s.quests = s.quests.filter(o => o.id !== q.id);
    log(s, `Quest started: ${q.name}. ${members.map(a => a.name).join(', ')} set out!`, 'title');
    this.emit('sfx', 'quest');
    return null;
  }
  questStep(a) {
    const s = this.s, q = s.activeQuests.find(q => q.id === a.task.qid);
    if (!q || q.id !== a.task.qid) { a.task = null; return; }
    const hpR = a.hp / maxHp(a, s);
    if (hpR < 0.3 && a.potions > 0) { a.potions--; a.hp = Math.min(maxHp(a, s), Math.round(a.hp + this.potion().heal * (1 + this.bonus('heal') + perkSum(a, 'healPct')))); this.emote(a, 'heart'); }
    if (q.kind === 'dungeon') { if (!a.dungeon && this.walkTo(a, q.spot[0], q.spot[1])) { a.dungeon = true; this.emit('sfx', 'secret'); } return; }
    let m = s.mons.find(o => o.quest === q.id && o.hp > 0 && Math.hypot(o.x - a.x, o.y - a.y) < 8);
    if (m) this.fight(a, m); else this.walkTo(a, q.spot[0], q.spot[1] + 1);
  }
  questCheck() {
    for (const q of this.s.activeQuests) this.checkQuest(q);
  }
  checkQuest(q) {
    if (!this.s.activeQuests.includes(q)) return;
    const s = this.s;
    q.t += DT * 10;
    const party = s.advs.filter(a => q.members.includes(a.id));
    if (q.kind === 'dungeon') return this.dungeonTick(q, party);
    const alive = s.mons.filter(m => m.quest === q.id && m.hp > 0);
    if (!alive.length) {
      s.gold += q.reward.gold; s.tp += q.reward.tp; s.pop += q.reward.pop; s.cleared++;
      if (q.frontier) this.captureFrontier(q.frontier);
      else if (q.boss) s.bossesBeaten[q.boss] = true;
      for (const a of party) { if (a.task?.qid === q.id) { a.task = null; a.path = null; } a.work += 5; this.addSat(a, 20); }
      log(s, `Quest cleared: ${q.name}! +${q.reward.gold}G +${q.reward.tp}TP +${q.reward.pop} popularity`, 'title');
      this.emit('fanfare', 'Quest Cleared!', q.name);
      s.activeQuests = s.activeQuests.filter(o => o.id !== q.id);
      if (q.boss && !q.frontier) s.quests = s.quests.filter(o => o.boss !== q.boss);
      this.checkStars(); return;
    }
    if (party.every(a => a.ko) || q.t > WEEK_SECONDS * (q.frontier ? 20 : 8)) {
      for (const m of alive) m.hp = 0;
      for (const a of party) if (a.task?.qid === q.id) { a.task = null; a.path = null; }
      log(s, `Quest failed: ${q.name}. The party retreated.`, 'bad'); this.emit('sfx', 'fail');
      s.activeQuests = s.activeQuests.filter(o => o.id !== q.id);
    }
  }

  dungeonTick(q, party) {
    const s = this.s, R = this.R;
    const inside = party.filter(a => a.dungeon);
    if (inside.length < party.filter(a => !a.ko).length && q.t < 60) return;   // wait for the party to gather
    if (!inside.length) { this.endDungeon(q, party, false); return; }
    q.ft += 1; if (q.ft < 7) return; q.ft = 0; q.floor++;
    const zl = [0, 1, 5, 10, 16][q.zone], foe = 3 * (6 + zl * 3) * (1 + q.floor * 0.15);
    const up = inside.filter(a => !a.ko);
    const pow = up.reduce((n, a) => n + Math.max(stat(a, 'atk', s), stat(a, 'mag', s) * 1.1) + stat(a, 'def', s) * 0.5 + a.lv, 0);
    const heal = up.filter(a => JOBS[a.job].heal).reduce((n, a) => n + stat(a, 'mag', s) * 2, 0);
    for (const a of up) {
      const dmg = Math.max(1, Math.round(maxHp(a, s) * 0.22 * Math.pow(foe / Math.max(1, pow), 1.5) * R.range(0.7, 1.3) - heal / up.length));
      if (a.potions > 0 && a.hp - dmg < maxHp(a, s) * 0.35) { a.potions--; a.hp = Math.min(maxHp(a, s), Math.round(a.hp + this.potion().heal)); }
      a.hp -= dmg; if (a.hp <= 0) { a.hp = 0; a.ko = true; a.koT = 0; }
      this.gainXp(a, Math.round(foe * 0.35));
    }
    s.stats.kills += 3; s.stats.monthKills += 3;
    const zm = ['herb', 'wood', 'hide', 'ore', 'crystal'];
    const mat = zm[Math.min(4, q.zone + R.int(-1, 1))]; s.mats[mat] = (s.mats[mat] || 0) + R.int(1, 2 + q.zone);
    if (party.every(a => a.ko)) { log(s, `The party was overwhelmed on floor ${q.floor} of the Old Cave.`, 'bad'); this.endDungeon(q, party, false); return; }
    log(s, `Old Cave floor ${q.floor}/${q.floors} cleared (${MATS[mat].name} found).`);
    if (q.floor >= q.floors) this.endDungeon(q, party, true);
  }
  endDungeon(q, party, win) {
    const s = this.s;
    for (const a of party) {
      if (a.dungeon || a.task?.qid === q.id) { a.dungeon = false; a.x = q.spot[0]; a.y = q.spot[1] + 0.5; a.path = null; if (a.task?.qid === q.id) a.task = null; }
      if (win) { a.work += 5; this.addSat(a, 20); }
    }
    if (win) {
      s.gold += q.reward.gold; s.tp += q.reward.tp; s.pop += q.reward.pop; s.cleared++;
      this.treasure({ x: q.spot[0], y: q.spot[1], lv: 5 + q.floors * 2 }, party[0]);
      log(s, `Dungeon cleared! +${q.reward.gold}G +${q.reward.tp}TP`, 'title'); this.emit('fanfare', 'Dungeon Cleared!', q.name);
      this.checkStars();
    } else this.emit('sfx', 'fail');
    s.activeQuests = s.activeQuests.filter(o => o.id !== q.id);
  }

  // ---------- events & jobs ----------
  runEvent(id) {
    const s = this.s, e = EVENTS.find(e => e.id === id); if (!e) return 'Unknown event';
    if (s.tp < e.tp) return 'Not enough Town Points';
    if (id === 'expand') {
      const t = s.town; if (t.x0 <= 16 && t.y0 <= 11) return 'Village is at maximum size';
      s.tp -= e.tp; t.x0 = Math.max(16, t.x0 - 3); t.x1 = Math.min(60, t.x1 + 3); t.y0 = Math.max(11, t.y0 - 3); t.y1 = Math.min(46, t.y1 + 3);
      s.props = s.props.filter(p => townDist(s, p.x, p.y) > 0 || p.soft);
      for (const m of s.mons) if (townDist(s, Math.round(m.x), Math.round(m.y)) <= 1 && !m.quest) m.hp = 0;
      this.rebuildGrid(); this.invalidatePaths();
    } else if (id === 'recruit') {
      s.tp -= e.tp; for (let i = 0; i < 3; i++) { const a = spawnAdventurer(s, this.R, this.edgeSpawn()); a.lv = this.R.int(2, 4 + s.stars * 3); a.hp = maxHp(a, s); }
    } else {
      if (this.eventOn(id)) return 'Already running'; s.tp -= e.tp; s.events.push({ id, weeks: e.weeks });
    }
    log(s, `Event: ${e.name}!`, 'title'); this.emit('fanfare', e.name, e.desc);
    return null;
  }
  canChangeJob(a, jobId) {
    const j = JOBS[jobId]; if (jobId === a.job) return 'Current job';
    if (!a.jobLv[jobId] && (a.jobLv[a.job] || 1) < MASTERY) return `Master ${JOBS[a.job].name} first (Lv${a.jobLv[a.job] || 1}/${MASTERY})`;
    for (const r of j.req || []) if ((a.jobLv[r] || 0) < MASTERY) return `Master ${JOBS[r].name} first`;
    const tp = this.jobCost(jobId); if (this.s.tp < tp) return `${tp} TP needed`;
    return null;
  }
  jobCost(jobId) { return TIER_TP[JOBS[jobId].tier]; }
  changeJob(a, jobId) {
    const err = this.canChangeJob(a, jobId); if (err) return err;
    this.s.tp -= this.jobCost(jobId); a.job = jobId; a.jobLv[jobId] = a.jobLv[jobId] || 1; a.jobXp = 0;
    a.spr = this.R.pick(JOBS[jobId].sprites);
    if (a.eq.weapon && !this.canEquip(a, ITEMS[a.eq.weapon])) a.eq.weapon = null;
    a.hp = maxHp(a, this.s); log(this.s, `${a.name} became a ${JOBS[jobId].name}!`, 'good'); this.emit('fanfare', `${a.name} → ${JOBS[jobId].name}`, JOBS[jobId].desc);
    return null;
  }
  gift(a, gold) {
    const s = this.s; if (s.gold < gold) return 'Not enough gold';
    s.gold -= gold; a.gold += gold; this.addSat(a, gold / 6); a.work = Math.min(999, a.work + gold / 25); this.emote(a, 'love');
    return null;
  }
}
