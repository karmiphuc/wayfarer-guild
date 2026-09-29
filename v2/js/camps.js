import { JOBS } from './jobs.js';
import { makeRng } from './rng.js';

export const CAMP_FACTIONS = {
  iron: { label: 'Iron Company', color: '#b9c4cf', description: 'Shield fighters hold the line while archers fire from behind.',
    jobs: { warrior: 5, brawler: 2, archer: 3, knight: 5, gladiator: 2, samurai: 3, master: 1 },
    leaders: ['warrior', 'knight', 'samurai'], second: ['archer'], signature: 'ore',
    captains: ['Captain Flint', 'Captain Bracken', 'Captain Steelthorn', 'Captain Rook'] },
  moonfang: { label: 'Moonfang Hunters', color: '#a6ce8c', description: 'Scouts and rangers keep their distance, backed by beast-tamer fighters.',
    jobs: { scout: 5, archer: 2, warrior: 1, ranger: 5, tamer: 3, ninja: 1, sharpshooter: 3, assassin: 1 },
    leaders: ['scout', 'ranger', 'sharpshooter'], second: ['warrior', 'tamer'], signature: 'hide',
    captains: ['Huntmaster Vale', 'Huntmaster Briar', 'Huntmaster Rowan', 'Huntmaster Grey'] },
  ash: { label: 'Ash Covenant', color: '#d19bc7', description: 'Spellcasters shelter behind a guard with at most one healer in each company.',
    jobs: { mage: 6, warrior: 2, brawler: 1, onmyoji: 5, royal: 3, bomber: 1 },
    leaders: ['mage', 'onmyoji', 'royal'], second: ['warrior', 'brawler'], signature: 'crystal',
    captains: ['Magister Cinder', 'Magister Vesper', 'Magister Sable', 'Magister Ember'] },
};

export const CAMP_MODIFIERS = {
  reinforced: { label: 'Reinforced', description: 'Guards have 4% more health and deal 4% less damage. Patrols are unchanged.' },
  eliteCaptain: { label: 'Veteran captain', description: 'The captain has 18% more health and deals 8% more damage; the remaining guards trade away that share. Patrols are unchanged.' },
  richStores: { label: 'Rich stores', description: 'One extra faction material on victory; no combat bonus.' },
};

function campHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Separate per-camp RNG makes migrations order-independent and leaves the live RNG untouched.
export function seedCampFactions(s) {
  for (const c of s.banditCamps || []) {
    const R = makeRng({ seed: campHash(`${s.world?.code ?? 4242}:${c.id}`) });
    const faction = R.pick(Object.keys(CAMP_FACTIONS));
    if (!Object.hasOwn(CAMP_FACTIONS, c.faction)) c.faction = faction;
    const captain = R.pick(CAMP_FACTIONS[c.faction].captains);
    const modifier = R.pick([null, null, 'reinforced', 'eliteCaptain', 'richStores']);
    if (typeof c.captainName !== 'string' || !c.captainName.trim()) c.captainName = captain;
    if (c.modifier !== null && !Object.hasOwn(CAMP_MODIFIERS, c.modifier)) c.modifier = modifier;
  }
}

export function campProfile(c) {
  const faction = Object.hasOwn(CAMP_FACTIONS, c?.faction) ? c.faction : 'iron', F = CAMP_FACTIONS[faction];
  const tier = Math.max(1, Math.min(4, Math.floor(c?.tier || 1)));
  const modifier = Object.hasOwn(CAMP_MODIFIERS, c?.modifier) ? c.modifier : null;
  // Same 3 + 4*tier material count as the existing reward; faction changes its contents.
  const materials = faction === 'iron' ? { wood: 3, ore: tier * 3, crystal: tier }
    : faction === 'moonfang' ? { wood: 3 + tier * 2, ore: tier, hide: tier }
      : { herb: 3 + tier, ore: tier, crystal: tier * 2 };
  if (modifier === 'richStores') materials[F.signature] = (materials[F.signature] || 0) + 1;
  return { ...F, faction, modifier, materials, captainName: c?.captainName || F.captains[0],
    modifierLabel: CAMP_MODIFIERS[modifier]?.label || 'Standard company',
    modifierDescription: CAMP_MODIFIERS[modifier]?.description || 'Named captain and standard guard strength.' };
}

function weightedCampJob(weights, tier, R) {
  const entries = Object.entries(weights).filter(([job, weight]) => weight > 0 && JOBS[job]?.tier <= tier);
  let choice = R.next() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [job, weight] of entries) { choice -= weight; if (choice < 0) return job; }
  return entries[entries.length - 1]?.[0] || 'warrior';
}

export function campMember(c, level, index, total, R, mode = 'challenge') {
  const P = campProfile(c), lv = Math.max(1, Math.min(99, Math.round(level)));
  const tier = lv >= 20 ? 3 : lv >= 8 ? 2 : 1, captain = mode === 'challenge' && index === 0;
  let weights = P.jobs;
  if (index === 0) weights = Object.fromEntries(P.leaders.map(job => [job, JOBS[job].tier * 2]));
  else if (index === 1) weights = Object.fromEntries(P.second.map(job => [job, JOBS[job].tier * 2]));
  else if (P.faction === 'ash' && total >= 4 && index === total - 1) weights = { monk: 1, shaman: 2 };
  const job = weightedCampJob(weights, tier, R);
  let hpScale = 1, atkScale = 1;
  // Only one modifier applies. Veteran scaling redistributes, rather than stacks, a fixed budget.
  if (mode === 'challenge' && P.modifier === 'reinforced') { hpScale = 1.04; atkScale = 0.96; }
  else if (mode === 'challenge' && P.modifier === 'eliteCaptain' && total > 1) {
    hpScale = captain ? 1.18 : 1 - 0.18 / (total - 1);
    atkScale = captain ? 1.08 : 1 - 0.08 / (total - 1);
  }
  return { job, name: captain ? P.captainName : `${P.label} ${JOBS[job].name}`, captain, faction: P.faction, hpScale, atkScale, defScale: 1 };
}
