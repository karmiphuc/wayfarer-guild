// Data-integrity validator. Catches the mistakes that are easy to make when adding content by hand:
// missing sprite files, typos in perk/stat keys, perks the sim never reads, broken job prerequisites,
// boss sheets whose frame size doesn't match the image, decor pointing at a sprite that doesn't exist, etc.
//
//   node v2/tests/validate.mjs            (exit code 1 on any ERROR; WARN lines are advisory)
//
// If you add a NEW perk effect key or item stat key, add it to KNOWN_* below AND make sim.js/state.js read it —
// the validator fails if a key is declared but never consumed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const V2 = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(V2);
const D = await import('../js/data.js');
const { assetList, EMOTE } = await import('../js/assets.js');
const { JOBS, PERKS, TIER_TP, VISITOR_JOBS, ITEMS, SHOP_SLOTS, SPR, FAC, DECOR, FAC_TRAITS, TRAIT_NAMES, TITLES, RANKS, EVENTS,
  MONSTERS, BOSSES, MATS, ROAD_TILES, NAMES, BIOMES, ZONE_MONS, HAPPENINGS, CHARTERS, ROSTER_SIZE, VISITOR_CAP, ELITE_CHANCE } = D;

const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);
const exists = p => fs.existsSync(p);
const png = p => { const b = fs.readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const simSrc = fs.readFileSync('js/sim.js', 'utf8') + fs.readFileSync('js/state.js', 'utf8');

// ---------------- jobs & perks ----------------
const KNOWN_PERK_KEYS = ['name', 'desc', 'allPct', 'hpPct', 'atkPct', 'defPct', 'magPct', 'spdPct', 'range', 'crit', 'critMul',
  'splash', 'splashAll', 'healPct', 'goldPct', 'popKill', 'dodge', 'bondPct', 'burn', 'tamePct', 'doubleHit', 'auraAtk', 'xpPct',
  'incomePct', 'treasurePct', 'execute', 'lifesteal', 'revive'];
const perkUse = {};
const allWeaponTypes = new Set(Object.values(ITEMS).filter(i => i.slot === 'weapon').map(i => i.type));
for (const [id, j] of Object.entries(JOBS)) {
  const where = `JOBS.${id}`;
  if (j.attack !== undefined && !['bow', 'magic', 'throw'].includes(j.attack)) err(`${where}: unknown attack mode "${j.attack}"`);
  for (const k of ['name', 'tier', 'sprites', 'hp', 'atk', 'def', 'mag', 'spd', 'range', 'weapon', 'wt', 'perk', 'desc'])
    if (j[k] === undefined) err(`${where}: missing field "${k}"`);
  if (!(j.tier >= 0 && j.tier < TIER_TP.length)) err(`${where}: tier ${j.tier} outside TIER_TP`);
  for (const s of j.sprites || []) {
    if (!exists(`assets/chars/${s}.png`)) err(`${where}: sprite assets/chars/${s}.png missing`);
    else { const d = png(`assets/chars/${s}.png`); if (d.w !== 64 || d.h !== 112) err(`${where}: ${s}.png is ${d.w}x${d.h}, character sheets must be 64x112 (4 dirs x 7 rows)`); }
    if (!exists(`assets/chars/${s}.face.png`)) err(`${where}: portrait assets/chars/${s}.face.png missing`);
  }
  const hand = j.weapon && (j.weapon.startsWith('Bow') ? `assets/items/w_${j.weapon}.png` : `assets/items/h_${j.weapon}.png`);
  if (hand && !exists(hand)) err(`${where}: default weapon sprite ${hand} missing`);
  if (!PERKS[j.perk]) err(`${where}: perk "${j.perk}" not in PERKS`);
  (perkUse[j.perk] = perkUse[j.perk] || []).push(id);
  for (const t of j.wt || []) if (!allWeaponTypes.has(t)) err(`${where}: weapon type "${t}" has no items in items.js`);
  for (const r of j.req || []) {
    if (!JOBS[r]) err(`${where}: req "${r}" is not a job`);
    else if (JOBS[r].tier >= j.tier) err(`${where}: req "${r}" (tier ${JOBS[r].tier}) must be a lower tier than ${j.tier}`);
  }
  if (j.tier >= 2 && !(j.req && j.req.length)) err(`${where}: tier ${j.tier} jobs need at least one req`);
  if (j.tier >= 3 && !(j.req || []).some(r => JOBS[r] && JOBS[r].tier >= 2)) err(`${where}: tier ${j.tier} jobs need a tier-2+ req (no tier skipping)`);
  // cheapest usable weapon: every class should find something affordable early
  const cheapest = Math.min(...Object.values(ITEMS).filter(i => i.slot === 'weapon' && (j.wt || []).includes(i.type)).map(i => i.price));
  if (cheapest > 500) warn(`${where}: cheapest usable weapon costs ${cheapest}G (> 500)`);
}
for (const [p, P] of Object.entries(PERKS)) {
  if (!perkUse[p]) warn(`PERKS.${p}: not granted by any job`);
  if ((perkUse[p] || []).length > 1) err(`PERKS.${p}: granted by several jobs (${perkUse[p]}) — each job needs its own perk`);
  for (const k of Object.keys(P)) {
    if (!KNOWN_PERK_KEYS.includes(k)) err(`PERKS.${p}: unknown effect key "${k}" (typo? or add it to KNOWN_PERK_KEYS and implement it in sim.js)`);
    else if (!['name', 'desc'].includes(k) && !simSrc.includes(`'${k}'`) && !simSrc.includes(`.${k}`)) err(`PERKS.${p}: effect "${k}" is never read by sim.js/state.js`);
  }
}
for (const [i, pool] of VISITOR_JOBS.entries()) for (const j of pool) if (!JOBS[j]) err(`VISITOR_JOBS[${i}]: "${j}" is not a job`);
for (const [id, j] of Object.entries(JOBS)) if (j.tier === 3 && !Object.values(JOBS).some(next => next.tier === 4 && next.req?.includes(id))) err(`JOBS.${id}: tier-3 job has no tier-4 successor`);

// ---------------- items ----------------
const KNOWN_ITEM_KEYS = ['name', 'slot', 'type', 'hand', 'icon', 'tint', 'price', 'dev', 'bow', 'atk', 'def', 'mag', 'hp', 'atkPct', 'defPct', 'magPct', 'hpPct', 'crit', 'spd', 'heal', 'legendary', 'revive', 'star', 'researchOnly'];
for (const [id, it] of Object.entries(ITEMS)) {
  const where = `ITEMS.${id}`;
  if (!['weapon', 'armor', 'offhand', 'acc', 'item', 'blessing'].includes(it.slot)) err(`${where}: bad slot "${it.slot}"`);
  if ((it.slot === 'blessing') !== !!it.legendary) err(`${where}: only unique relics belong in the blessing slot`);
  if (!exists(`assets/items/${it.icon}.png`)) err(`${where}: icon assets/items/${it.icon}.png missing`);
  if (!(it.price > 0)) err(`${where}: price must be > 0`);
  for (const k of Object.keys(it)) if (!KNOWN_ITEM_KEYS.includes(k)) err(`${where}: unknown key "${k}"`);
  if (it.dev) for (const m of Object.keys(it.dev)) if (!MATS[m]) err(`${where}: dev material "${m}" not in MATS`);
  if (it.slot === 'weapon') {
    if (!Object.values(JOBS).some(j => j.wt.includes(it.type))) err(`${where}: no job can equip type "${it.type}"`);
    const hand = it.bow ? `assets/items/w_${it.hand}.png` : `assets/items/h_${it.hand}.png`;
    if (!exists(hand)) err(`${where}: in-hand sprite ${hand} missing`);
    if (it.tint !== undefined && typeof it.tint !== 'number') err(`${where}: tint must be a number (hue degrees)`);
  }
}
for (const slot of ['weapon', 'armor', 'offhand', 'acc', 'item']) if (!Object.values(SHOP_SLOTS).some(s => s.includes(slot))) err(`SHOP_SLOTS: no shop sells "${slot}"`);
for (const s of Object.keys(SHOP_SLOTS)) if (!Object.values(FAC).some(f => f.kind === 'shop' && f.slot === s)) err(`SHOP_SLOTS.${s}: no FAC shop with slot "${s}"`);

// ---------------- monsters & bosses ----------------
for (const [id, m] of Object.entries(MONSTERS)) {
  if (m.human) {          // outlaw: a character sheet + portrait from assets/chars and an in-hand weapon sprite
    if (!exists(`assets/chars/${m.spr}.png`)) err(`MONSTERS.${id}: human sheet assets/chars/${m.spr}.png missing`);
    else { const d = png(`assets/chars/${m.spr}.png`); if (d.w !== 64 || d.h !== 112) err(`MONSTERS.${id}: ${m.spr}.png is ${d.w}x${d.h}, human sheets must be 64x112 (they need the attack row)`); }
    if (!exists(`assets/chars/${m.spr}.face.png`)) err(`MONSTERS.${id}: portrait assets/chars/${m.spr}.face.png missing`);
    if (!m.weapon || !exists(`assets/items/h_${m.weapon}.png`)) err(`MONSTERS.${id}: weapon "${m.weapon}" needs assets/items/h_${m.weapon}.png`);
  } else {
    if (!exists(`assets/monsters/${m.spr}.png`)) err(`MONSTERS.${id}: sprite assets/monsters/${m.spr}.png missing`);
    else { const d = png(`assets/monsters/${m.spr}.png`); if (d.w !== 64 || d.h !== 64) err(`MONSTERS.${id}: ${m.spr}.png is ${d.w}x${d.h}, monster sheets must be 64x64 (4 dirs x 4 frames)`); }
    if (!exists(`assets/monsters/${m.spr}.face.png`)) err(`MONSTERS.${id}: portrait missing`);
  }
  for (const k of Object.keys(m.drops || {})) if (!MATS[k]) err(`MONSTERS.${id}: drop "${k}" not in MATS`);
  const inZone = Object.values(ZONE_MONS).some(z => z.includes(id));
  if (!inZone && !m.raidOnly) warn(`MONSTERS.${id}: not in any ZONE_MONS list (never spawns)`);
  if (inZone && m.raidOnly) err(`MONSTERS.${id}: raidOnly but listed in ZONE_MONS`);
}
if (!(Array.isArray(VISITOR_CAP) && VISITOR_CAP.length === 6 && VISITOR_CAP.every((v, i) => v > 0 && (!i || v >= VISITOR_CAP[i - 1]))))
  err('VISITOR_CAP: needs 6 positive, non-decreasing entries (index = stars 0..5)');
if (!(ELITE_CHANCE >= 0 && ELITE_CHANCE < 0.5)) err('ELITE_CHANCE: must be between 0 and 0.5');
for (const [z, list] of Object.entries(ZONE_MONS)) for (const id of list) if (!MONSTERS[id]) err(`ZONE_MONS[${z}]: "${id}" not in MONSTERS`);
let lastRec = 0, lastStar = 0;
for (const [id, b] of Object.entries(BOSSES)) {
  const f = `assets/bosses/${b.dir}/${b.idle}`;
  if (!exists(f)) err(`BOSSES.${id}: ${f} missing`);
  else { const d = png(f); if (d.w !== b.fw * b.frames || d.h !== b.fh) err(`BOSSES.${id}: ${f} is ${d.w}x${d.h} but fw*frames x fh = ${b.fw * b.frames}x${b.fh}`); }
  if (!exists(`assets/bosses/${b.dir}/Faceset.png`)) err(`BOSSES.${id}: Faceset.png missing`);
  for (const k of ['rec', 'star', 'zone', 'hp', 'atk', 'def', 'xp', 'gold']) if (typeof b[k] !== 'number') err(`BOSSES.${id}: missing number "${k}"`);
  if (b.rec < lastRec || b.star < lastStar) warn(`BOSSES.${id}: rec/star lower than the previous boss (keep BOSSES ordered by rec)`);
  lastRec = b.rec; lastStar = b.star;
}

// ---------------- sprites, facilities, decor ----------------
const imgKeys = new Set(assetList().map(([k]) => k));
const imgPath = Object.fromEntries(assetList());
for (const [k, s] of Object.entries(SPR)) {
  if (!imgKeys.has(s.img)) { err(`SPR.${k}: image key "${s.img}" is not loaded in js/assets.js assetList()`); continue; }
  const p = imgPath[s.img]; if (!exists(p)) { err(`SPR.${k}: ${p} missing`); continue; }
  const d = png(p); if (s.x < 0 || s.y < 0 || s.x + s.w > d.w || s.y + s.h > d.h) err(`SPR.${k}: rect ${s.x},${s.y},${s.w}x${s.h} outside ${p} (${d.w}x${d.h})`);
}
const KINDS = ['guild', 'sleep', 'home', 'food', 'shop', 'train', 'heal', 'craft', 'defense', 'stable'];
for (const [id, f] of Object.entries({ ...FAC, ...DECOR })) {
  const where = (FAC[id] ? 'FAC.' : 'DECOR.') + id;
  if (!Array.isArray(f.fp) || f.fp.length !== 2 || !(f.fp[0] > 0 && f.fp[1] > 0)) err(`${where}: fp must be [w, h] > 0`);
  if (!f.road) for (const s of [].concat(f.spr || [])) if (!SPR[s]) err(`${where}: spr "${s}" not in SPR`);
  if (FAC[id] && !KINDS.includes(f.kind)) err(`${where}: kind "${f.kind}" not handled (${KINDS.join('/')})`);
  if (f.kind === 'shop' && !SHOP_SLOTS[f.slot]) err(`${where}: shop slot "${f.slot}" not in SHOP_SLOTS`);
  if (typeof f.cost !== 'number') err(`${where}: cost must be a number`);
  if (f.rank !== undefined && !(f.rank >= 1 && f.rank <= RANKS.length)) err(`${where}: rank ${f.rank} (needs rank-1 stars) out of range`);
  if (!f.road && !FAC_TRAITS[id]) warn(`${where}: no FAC_TRAITS entry (adds nothing to town traits)`);
}
for (const [id, t] of Object.entries(FAC_TRAITS)) {
  if (!FAC[id] && !DECOR[id]) err(`FAC_TRAITS.${id}: not a facility or decor`);
  for (const k of Object.keys(t)) if (!TRAIT_NAMES.includes(k)) err(`FAC_TRAITS.${id}: trait "${k}" not in TRAIT_NAMES`);
}
for (const t of TITLES) for (const k of Object.keys(t.need)) if (!TRAIT_NAMES.includes(k)) err(`TITLES.${t.id}: trait "${k}" not in TRAIT_NAMES`);
for (const [i, r] of RANKS.entries()) for (const [k, v] of Object.entries(r.need || {})) {
  if (!['pop', 'residents', 'income', 'build', 'quests', 'titles', 'boss'].includes(k)) err(`RANKS[${i}]: unknown condition "${k}"`);
  if (k === 'build' && !FAC[v]) err(`RANKS[${i}]: build "${v}" not in FAC`);
  if (k === 'boss' && !BOSSES[v]) err(`RANKS[${i}]: boss "${v}" not in BOSSES`);
}
for (const e of EVENTS) if (!simSrc.includes(`'${e.id}'`) && !e.weeks) err(`EVENTS.${e.id}: not handled in sim.js runEvent (and has no "weeks" duration)`);
for (const e of new Set(Object.values(EMOTE))) if (!exists(`assets/ui/emote/emote${e}.png`)) err(`EMOTE: emote${e}.png missing`);
if (Object.keys(ROAD_TILES).length !== 47) err(`ROAD_TILES: expected 47 blob autotile entries, got ${Object.keys(ROAD_TILES).length}`);
if (NAMES.length < 40) warn(`NAMES: only ${NAMES.length} names; duplicates get roman numerals`);
for (const [b, B] of Object.entries(BIOMES)) for (const m of B.mons) if (!MONSTERS[m]) err(`BIOMES.${b}: monster "${m}" missing`);

// ---------------- loader list ----------------
// ---------------- happenings, charters, seeded world (js/happenings.js) ----------------
const hIds = new Set();
for (const h of HAPPENINGS) {
  const where = `HAPPENINGS.${h.id}`;
  for (const k of ['id', 'icon', 'short', 'name', 'weight', 'weeks', 'minStars', 'desc']) if (h[k] === undefined) err(`${where}: missing field "${k}"`);
  if (hIds.has(h.id)) err(`${where}: duplicate id`); hIds.add(h.id);
  if (!(h.weight > 0)) err(`${where}: weight must be > 0`);
  if (!(h.weeks >= 1)) err(`${where}: weeks must be >= 1`);
  if (!(h.minStars >= 0 && h.minStars <= 5)) err(`${where}: minStars must be 0..5`);
  if (!imgKeys.has(h.icon)) err(`${where}: icon "${h.icon}" is not an image key in js/assets.js assetList()`);
  if (!simSrc.includes(`case '${h.id}'`)) err(`${where}: no "case '${h.id}'" in Sim.startHappening (js/sim.js)`);
}
const KNOWN_CHARTER_KEYS = ['shopSales', 'visitors', 'killGold', 'monsterPop', 'decorAppeal', 'joy', 'buildCost', 'matDrops', 'jobXp',
  'tamePct', 'treasure', 'upkeep', 'tpKills', 'happenChance', 'raidReward', 'happen'];
const cIds = new Set();
for (const c of CHARTERS) {
  const where = `CHARTERS.${c.id}`;
  for (const k of ['id', 'name', 'icon', 'up', 'down', 'mods']) if (c[k] === undefined) err(`${where}: missing field "${k}"`);
  if (cIds.has(c.id)) err(`${where}: duplicate id`); cIds.add(c.id);
  if (!imgKeys.has(c.icon)) err(`${where}: icon "${c.icon}" is not an image key in js/assets.js assetList()`);
  for (const [k, v] of Object.entries(c.mods || {})) {
    if (!KNOWN_CHARTER_KEYS.includes(k)) { err(`${where}: unknown mods key "${k}" (add it to KNOWN_CHARTER_KEYS and read it in sim.js via this.charter('${k}'))`); continue; }
    if (k === 'happen') { for (const [hid, m] of Object.entries(v)) { if (!hIds.has(hid)) err(`${where}: mods.happen.${hid} is not a HAPPENINGS id`); if (!(m > 0)) err(`${where}: mods.happen.${hid} must be a positive weight multiplier`); } }
    else if (typeof v !== 'number') err(`${where}: mods.${k} must be a number`);
  }
  const st = c.start || {};
  for (const t of st.build || []) if (!FAC[t]) err(`${where}: start.build "${t}" is not a FAC type`);
  for (const t of st.decor || []) if (!DECOR[t]) err(`${where}: start.decor "${t}" is not a DECOR type`);
  if (st.adv && !JOBS[st.adv]) err(`${where}: start.adv "${st.adv}" is not a JOBS id`);
  if (st.gold !== undefined && typeof st.gold !== 'number') err(`${where}: start.gold must be a number`);
}
for (const k of KNOWN_CHARTER_KEYS) if (k !== 'happen' && !simSrc.includes(`charter('${k}')`)) err(`KNOWN_CHARTER_KEYS: "${k}" is never read in sim.js (this.charter('${k}'))`);
if (CHARTERS.length < 3) err('CHARTERS: need at least 3 (the new-game picker offers 3)');
for (const [z, n] of Object.entries(ROSTER_SIZE)) {
  if (!ZONE_MONS[z]) { err(`ROSTER_SIZE[${z}]: no ZONE_MONS[${z}]`); continue; }
  if (!(n >= 1 && n <= ZONE_MONS[z].length)) err(`ROSTER_SIZE[${z}] = ${n}: must be 1..${ZONE_MONS[z].length} (ZONE_MONS[${z}].length)`);
}

for (const [k, p] of assetList()) if (!exists(p)) err(`assetList: ${k} -> ${p} missing`);

// ---------------- atlas freshness ----------------
if (exists('assets/atlas/atlas.json')) {
  const atlas = JSON.parse(fs.readFileSync('assets/atlas/atlas.json', 'utf8'));
  const stale = [];
  const present = assetList().filter(([, p]) => exists(p));      // missing files are already reported above
  for (const [, p] of present) {
    const r = atlas.frames[p];
    if (!r) { stale.push(`${p} (not in atlas)`); continue; }
    const d = png(p); if (d.w !== r[3] || d.h !== r[4]) stale.push(`${p} (size changed)`);
  }
  const newest = Math.max(...present.map(([, p]) => fs.statSync(p).mtimeMs));
  if (stale.length) err(`atlas is stale — run: uv run --with pillow python3 v2/tools/pack_atlas.py\n    ${stale.slice(0, 8).join('\n    ')}`);
  else if (newest > fs.statSync('assets/atlas/atlas.json').mtimeMs + 1000) warn('a sprite file is newer than the atlas — re-run tools/pack_atlas.py if you edited pixels');
} else err('assets/atlas/atlas.json missing — run tools/pack_atlas.py');

for (const w of warns) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(`validate: ${errors.length} error(s), ${warns.length} warning(s) — ${Object.keys(JOBS).length} jobs, ${Object.keys(PERKS).length} perks, ${Object.keys(ITEMS).length} items, ${Object.keys(MONSTERS).length} monsters, ${Object.keys(BOSSES).length} bosses, ${Object.keys(FAC).length} facilities, ${Object.keys(DECOR).length} decor`);
process.exit(errors.length ? 1 : 0);
