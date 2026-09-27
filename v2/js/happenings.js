// Replayability layer (not in DV2; our own): weekly random HAPPENINGS and the new-game VILLAGE CHARTERS.
// All randomness comes from the seeded RNG in sim.js, so a seed + the same choices always replays identically.
//
// HAPPENINGS: rolled at the start of each in-game week (Sim.rollHappening). Every `id` below must have a branch in
// Sim.startHappening (and optionally endHappening) — tests/validate.mjs checks this.
//   icon     image key from js/assets.js assetList() (i_<item icon>, e<emote>, m_<monster sheet>/c_<character sheet>: first frame, pt_<particle>)
//   short    label for the top-bar chip                   weight   relative chance among eligible happenings
//   weeks    how long it lasts                            minStars earliest village rank it can appear
//   night    true = its visuals/effects happen at night
export const HAPPENINGS = [
  { id: 'merchant', icon: 'i_GoldCoin', short: 'Merchant', name: 'Traveling Merchant', weight: 10, weeks: 1, minStars: 0,
    desc: 'A merchant camps by the Guild Hall and sells licences for gear you have not developed yet — no Blacksmith or materials needed.' },
  { id: 'goldslime', icon: 'e29', short: 'Golden Slime', name: 'Golden Slime Sighting', weight: 8, weeks: 2, minStars: 0,
    desc: 'A glittering slime roams the fields. It runs from adventurers — catch it for a fortune.' },
  { id: 'rain', icon: 'pt_Rain', short: 'Rain', name: 'Rainy Week', weight: 9, weeks: 1, minStars: 0,
    desc: 'Fewer hunts; adventurers crowd the food stalls and inns (+25% there).' },
  { id: 'sunny', icon: 'e6', short: 'Clear Skies', name: 'Clear Skies', weight: 9, weeks: 1, minStars: 0,
    desc: 'Perfect travelling weather: +40% visitors.' },
  { id: 'bard', icon: 'e11', short: 'Bard', name: 'Wandering Bard', weight: 6, weeks: 1, minStars: 0,
    desc: 'Songs in the square: every adventurer is happier and popularity rises.' },
  { id: 'harvest', icon: 'i_Beaf', short: 'Harvest', name: 'Bumper Harvest', weight: 6, weeks: 2, minStars: 0,
    desc: 'Plenty of food: food shops earn 25% more.' },
  { id: 'stampede', icon: 'e15', short: 'Stampede!', name: 'Monster Stampede', weight: 6, weeks: 1, minStars: 1,
    desc: 'A pack charges the village! Each monster that reaches the edge scares visitors away — stop them all for a reward.' },
  { id: 'bandits', icon: 'c_NinjaRed2', short: 'Bandits!', name: 'Bandit Raid', weight: 5, weeks: 1, minStars: 1,
    desc: 'A bandit gang camps outside the village. Beat them all this week or they steal gold.' },
  { id: 'meteor', icon: 'i_GoldCup', short: 'Meteors', name: 'Meteor Shower', weight: 4, weeks: 1, minStars: 1, night: true,
    desc: 'Falling stars scatter crystals over the fields tonight.' },
  { id: 'fog', icon: 'e23', short: 'Fog', name: 'Mysterious Fog', weight: 4, weeks: 1, minStars: 2,
    desc: 'Monsters hit 15% harder in the fog — but treasure chests appear 50% more often.' },
  { id: 'wanderer', icon: 'e22', short: 'Wanderer', name: 'Legendary Wanderer', weight: 3, weeks: 2, minStars: 2,
    desc: 'A famous adventurer passes through and may settle if a home is free.' },
];

// Base chance that a week starts a happening (charters can add to it via mods.happenChance).
// 0.37 ≈ one every 2.7 weeks (was 0.55 — play-test 2026-09-27: "quite frequent, make it 50% slower").
export const HAPPEN_CHANCE = 0.37;

// VILLAGE CHARTERS: the player picks 1 of 3 (seeded) when founding a village. Each has an upside and a downside.
// mods keys are read in sim.js via Sim.charter(key) — tests/validate.mjs checks every key is known and consumed.
//   shopSales visitors killGold monsterPop decorAppeal joy buildCost matDrops jobXp tamePct treasure upkeep
//   tpKills happenChance raidReward       happen: { <happeningId>: weight multiplier }
// start: bonuses applied once when chosen — gold (+/-), build: [facility types placed for free], decor: [decor types],
//   adv: job id of a free starting adventurer who already lives here.
export const CHARTERS = [
  { id: 'market', name: 'Crossroads Market', icon: 'i_GoldCoin',
    up: 'Shops +20% sales · starts with an Item Shop', down: 'Monsters drop 15% less gold',
    mods: { shopSales: 0.2, killGold: -0.15 }, start: { build: ['item'] } },
  { id: 'hunters', name: "Hunters' Haven", icon: 'i_w_Bow',
    up: '+30% monsters · kill gold +20% · a Warrior already lives here', down: '10% fewer visitors',
    mods: { monsterPop: 0.3, killGold: 0.2, visitors: -0.1 }, start: { adv: 'warrior' } },
  { id: 'sakura', name: 'Sakura Valley', icon: 'i_TeaLeaf',
    up: 'Decor appeal +50% · satisfaction +15% · free sakura trees', down: 'Buildings cost 10% more',
    mods: { decorAppeal: 0.5, joy: 0.15, buildCost: 0.1 }, start: { decor: ['treePink', 'treePink', 'flower', 'flower'] } },
  { id: 'mine', name: 'Old Mine Town', icon: 'i_w_Pickaxe',
    up: 'Material drops ×2 · starts with a Blacksmith', down: 'Upkeep +25%',
    mods: { matDrops: 1.0, upkeep: 0.25 }, start: { build: ['smith'] } },
  { id: 'pilgrim', name: 'Pilgrim Road', icon: 'i_Letter',
    up: 'Visitors +30% · +300 G', down: 'Town Points from kills −25%',
    mods: { visitors: 0.3, tpKills: -0.25 }, start: { gold: 300 } },
  { id: 'beast', name: "Beast Tamers' Rest", icon: 'i_c_bone',
    up: 'Monsters befriend 3× as often · starts with a Monster Stable', down: 'Monsters drop 10% less gold',
    mods: { tamePct: 2.0, killGold: -0.1 }, start: { build: ['stable'] } },
  { id: 'fort', name: 'Frontier Fort', icon: 'i_a_kite',
    up: 'Starts with a Watchtower · repelling raids pays double', down: 'Stampedes and bandit raids twice as common',
    mods: { raidReward: 1.0, happen: { stampede: 2, bandits: 2 } }, start: { build: ['tower'] } },
  { id: 'scholars', name: "Scholars' Hill", icon: 'i_w_Book',
    up: 'Job EXP +30% — mastery comes sooner', down: 'Start with 1,000 G less',
    mods: { jobXp: 0.3 }, start: { gold: -1000 } },
  { id: 'lucky', name: 'Lucky Star', icon: 'i_GoldCup',
    up: 'Happenings twice as often · treasure chests +50%', down: 'Upkeep +25%',
    mods: { happenChance: 0.37, treasure: 0.5, upkeep: 0.25 } },
];

// Seeded world variety: each new village keeps only this many species per zone (picked from ZONE_MONS in sim.js).
export const ROSTER_SIZE = { 1: 7, 2: 9, 3: 10, 4: 9 };
