import { ITEMS } from './items.js';
import { makeRng } from './rng.js';

export const RELIC_AFFIXES = {
  vital: { name: 'Vital', key: 'hpPct', label: 'HP', min: 12, max: 30, pctMin: 8, pctMax: 12 },
  fierce: { name: 'Fierce', key: 'atkPct', label: 'ATK', min: 2, max: 6, pctMin: 5, pctMax: 8 },
  warded: { name: 'Warded', key: 'defPct', label: 'DEF', min: 2, max: 6, pctMin: 5, pctMax: 8 },
  mystic: { name: 'Mystic', key: 'magPct', label: 'MAG', min: 2, max: 6, pctMin: 5, pctMax: 8 },
  fleet: { name: 'Fleet', key: 'spd', label: 'movement speed', min: 3, max: 8, percent: true, pctMin: 4, pctMax: 7 },
  keen: { name: 'Keen', key: 'crit', label: 'critical chance', min: 1, max: 3, percent: true, pctMin: 2, pctMax: 4 },
};

const affixBonus = (A, value) => {
  // Saved values keep their original ranges as quality inputs, preserving old rolls and RNG draws.
  const raw = value * (A.percent ? 100 : 1);
  return Math.round(A.pctMin + (raw - A.min) / (A.max - A.min) * (A.pctMax - A.pctMin)) / 100;
};

// World code + unique item identity, independent of combat RNG and capture order.
export function seedRelicRolls(s) {
  s.frontier.rolls ??= {};
  for (const id of Object.keys(s.frontier.relics)) {
    if (!ITEMS[id]?.legendary || s.frontier.rolls[id]) continue;
    let seed = (s.world?.code ?? 4242) ^ 0x52454c49;
    for (const ch of id) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
    const R = makeRng({ seed }), pool = Object.keys(RELIC_AFFIXES), affixes = [];
    for (let i = 0; i < 2; i++) {
      const key = pool.splice(R.int(0, pool.length - 1), 1)[0], A = RELIC_AFFIXES[key];
      const value = R.int(A.min, A.max) / (A.percent ? 100 : 1);
      affixes.push({ id: key, value });
    }
    s.frontier.rolls[id] = { affixes };
  }
}

export function relicItem(s, id) {
  const base = ITEMS[id];
  if (!base?.legendary || !s?.frontier?.rolls?.[id]) return base;
  const item = { ...base }, names = [];
  for (const a of s.frontier.rolls[id].affixes) {
    const A = RELIC_AFFIXES[a.id];
    if (!A) continue;
    item[A.key] = (item[A.key] || 0) + affixBonus(A, a.value); names.push(A.name);
  }
  item.name = `${names.join(' ')} ${base.name}`;
  return item;
}

export function relicRollText(s, id) {
  const roll = s?.frontier?.rolls?.[id];
  if (!roll) return 'Two random bonus traits revealed on capture';
  return roll.affixes.map(a => {
    const A = RELIC_AFFIXES[a.id];
    return `${A.name}: +${Math.round(affixBonus(A, a.value) * 100)}% ${A.label}`;
  }).join(' / ');
}
