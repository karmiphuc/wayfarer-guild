// Gear catalogue. Weapons: `type` gates which classes can use them (JOBS[j].wt); `hand` is the in-hand sprite;
// `tint` hue-rotates both icon and in-hand sprite. armor = body; offhand = one helm OR shield.
// dev: materials to develop at the Blacksmith (null = starter stock). Treasure chests can also reveal gear.

const W = (name, type, hand, stats, price, dev, tint = 0, bow = false) =>
  ({ name, slot: 'weapon', type, hand, icon: 'w_' + hand, tint, ...stats, price, dev, bow });

export const ITEMS = {
  // Unique frontier blessings: one assigned resident per relic, separate from ordinary equipment.
  rootheart:    { name: 'Rootheart Pendant', slot: 'blessing', icon: 'c_charm', hp: 30, def: 3, price: 1200, legendary: true },
  mireSeal:     { name: 'Seal of the Mire', slot: 'blessing', icon: 'c_charm', def: 8, hp: 15, price: 1500, legendary: true },
  ironOath:     { name: 'Iron Oath Emblem', slot: 'blessing', icon: 'c_charm', atk: 8, def: 6, price: 2000, legendary: true },
  moonTear:     { name: 'Tear of the Moon', slot: 'blessing', icon: 'c_charm', mag: 12, hp: 20, price: 2200, legendary: true },
  cinderSignet: { name: 'Cinder Signet', slot: 'blessing', icon: 'c_charm', atk: 14, crit: 0.03, price: 3000, legendary: true },
  stormKnot:    { name: 'Tempest Knot', slot: 'blessing', icon: 'c_charm', mag: 10, spd: 0.12, price: 2800, legendary: true },
  paleEmber:    { name: 'Pale Ember Heart', slot: 'blessing', icon: 'c_charm', hp: 60, def: 10, price: 4000, legendary: true },
  regentStar:   { name: 'Last Regent Star', slot: 'blessing', icon: 'c_charm', atk: 18, mag: 18, def: 8, price: 6000, legendary: true },
  // ---- swords ----
  woodSword:   W('Wood Sword', 'sword', 'Sword', { atk: 3 }, 60, null),
  ironSword:   W('Iron Sword', 'sword', 'Sword2', { atk: 7 }, 220, { ore: 4 }),
  knightBlade: W('Knight Blade', 'sword', 'Sword2', { atk: 13, def: 2 }, 700, { ore: 10, hide: 3 }, 45),
  flameSword:  W('Flame Sword', 'sword', 'Sword', { atk: 19, mag: 4 }, 1500, { ore: 14, crystal: 5 }, -40),
  greatSword:  W('Great Sword', 'sword', 'BigSword', { atk: 24 }, 2200, { ore: 22, crystal: 6, hide: 6 }),
  dragonSlayer:W('Dragon Slayer', 'sword', 'Voidblade', { atk: 36, def: 4 }, 5200, { ore: 34, crystal: 16 }),
  // ---- axes / hammers / clubs ----
  club:        W('Club', 'club', 'Club', { atk: 5 }, 110, { wood: 4 }),
  boneClub:    W('Bone Club', 'club', 'Bone', { atk: 10, hp: 6 }, 420, { hide: 6, wood: 4 }),
  ogreClub:    W('Ogre Club', 'club', 'Club', { atk: 22, hp: 15 }, 2000, { wood: 16, hide: 8 }, -25),
  handAxe:     W('Hand Axe', 'axe', 'AxeTool', { atk: 6 }, 160, { wood: 5 }),
  battleAxe:   W('Battle Axe', 'axe', 'Axe', { atk: 12 }, 560, { wood: 6, ore: 8 }),
  berserkAxe:  W('Berserker Axe', 'axe', 'Axe', { atk: 26, def: -3 }, 2600, { ore: 20, hide: 10 }, -35),
  warHammer:   W('War Hammer', 'hammer', 'Hammer', { atk: 15, def: 2 }, 900, { ore: 14, wood: 6 }),
  thunderMaul: W('Thunder Maul', 'hammer', 'Hammer', { atk: 30, mag: 6 }, 4200, { ore: 26, crystal: 12 }, 190),
  pickaxe:     W('Miner Pick', 'hammer', 'Pickaxe', { atk: 9 }, 300, { wood: 3, ore: 5 }),
  // ---- spears ----
  spear:       W('Spear', 'spear', 'Lance2', { atk: 6 }, 170, { wood: 6 }),
  lance:       W('Lance', 'spear', 'Lance', { atk: 12, def: 2 }, 620, { ore: 10, wood: 6 }),
  holyLance:   W('Holy Lance', 'spear', 'Runelance', { atk: 24, mag: 6, def: 3 }, 3300, { ore: 20, crystal: 12 }, 40),
  trident:     W('Trident', 'trident', 'Fork', { atk: 16, mag: 3 }, 1200, { ore: 12, crystal: 4 }),
  seaFork:     W('Sea King Fork', 'trident', 'Fork', { atk: 28, mag: 8 }, 3800, { ore: 22, crystal: 14 }, 180),
  // ---- bows ----
  shortBow:    W('Short Bow', 'bow', 'Bow', { atk: 5 }, 140, { wood: 5, hide: 2 }, 0, true),
  longBow:     W('Long Bow', 'bow', 'Bow2', { atk: 12 }, 700, { wood: 10, hide: 4 }, 0, true),
  elvenBow:    W('Elven Bow', 'bow', 'Bow2', { atk: 22, def: 2 }, 2600, { wood: 16, crystal: 8 }, 90, true),
  // ---- staves / tomes ----
  oakWand:     W('Oak Wand', 'staff', 'MagicWand', { mag: 6 }, 160, { wood: 4, herb: 3 }),
  walkStaff:   W('Pilgrim Staff', 'staff', 'Stick', { mag: 4, def: 2 }, 120, { wood: 4 }),
  crystalWand: W('Crystal Wand', 'staff', 'FrostStaff', { mag: 16 }, 1300, { herb: 8, crystal: 6 }),
  sageStaff:   W('Sage Staff', 'staff', 'Stick', { mag: 26, def: 4 }, 3400, { herb: 14, crystal: 14 }, 50),
  sutra:       W('Sutra Tome', 'book', 'Book', { mag: 11, def: 2 }, 650, { herb: 10, crystal: 3 }),
  grimoire:    W('Grimoire', 'book', 'Book', { mag: 26 }, 3600, { herb: 16, crystal: 14 }, 230),
  // ---- light blades ----
  ninjaku:     W('Ninjaku', 'dagger', 'Ninjaku', { atk: 9 }, 380, { ore: 6 }),
  shadowBlade: W('Shadow Blade', 'dagger', 'Ninjaku', { atk: 21 }, 2400, { ore: 14, crystal: 8 }, 250),
  katana:      W('Katana', 'katana', 'Katana', { atk: 18 }, 1400, { ore: 16, crystal: 4 }),
  muramasa:    W('Muramasa', 'katana', 'Katana', { atk: 34 }, 5000, { ore: 28, crystal: 18 }, -40),
  rapier:      W('Rapier', 'rapier', 'Rapier', { atk: 8, mag: 3 }, 400, { ore: 6, hide: 2 }),
  royalRapier: W('Royal Rapier', 'rapier', 'RegalBlade', { atk: 18, mag: 10 }, 2800, { ore: 12, crystal: 10 }),
  whip:        W('Whip', 'whip', 'Whip', { atk: 7 }, 260, { hide: 6 }),
  thornWhip:   W('Thorn Whip', 'whip', 'Whip', { atk: 17, mag: 4 }, 1700, { hide: 12, herb: 8 }, 100),
  sai:         W('Sai', 'fist', 'Sai', { atk: 10 }, 420, { ore: 6 }),
  ironKnuckle: W('Iron Knuckles', 'fist', 'Sai', { atk: 17 }, 1200, { ore: 12, hide: 4 }, 200),
  dragonClaw:  W('Dragon Claws', 'fist', 'Sai', { atk: 25 }, 3200, { ore: 18, crystal: 10 }, -30),
  bone:        W('Ritual Bone', 'bone', 'Bone', { atk: 5, mag: 8 }, 360, { hide: 5, herb: 4 }),
  lichFemur:   W('Lich Femur', 'bone', 'Bone', { atk: 12, mag: 20 }, 2600, { hide: 12, crystal: 10 }, 260),

  // ---- masterwork weapons ----
  dawnblade:   W('Dawnblade', 'sword', 'Dawnblade', { atk: 32, mag: 8, hp: 15 }, 5400, { ore: 32, crystal: 18 }),
  runelance:   W('Runic Halberd', 'spear', 'Runelance', { atk: 32, def: 7 }, 5200, { ore: 30, wood: 16, crystal: 16 }),
  crystalAxe:  W('Crystal Reaver', 'axe', 'CrystalAxe', { atk: 36, hp: 15 }, 5400, { ore: 32, crystal: 20 }),
  archonStaff: W('Archon Staff', 'staff', 'ArchonStaff', { mag: 34, hp: 20 }, 5500, { wood: 18, herb: 20, crystal: 24 }),
  starTome:    { ...W('Starbound Codex', 'book', 'Book', { mag: 32, def: 8 }, 5300, { herb: 24, crystal: 22 }), icon: 'w_StarTome' },
  duskfang:    W('Duskfang', 'dagger', 'Voidblade', { atk: 28, crit: 0.08 }, 5000, { ore: 26, hide: 16, crystal: 18 }),
  skyBow:      W('Skywarden Bow', 'bow', 'Bow2', { atk: 30, crit: 0.05 }, 5000, { wood: 30, hide: 16, crystal: 18 }, 180, true),

  // ---- armor ----
  cloth:       { name: 'Traveler Garb', slot: 'armor', icon: 'a_cloth', def: 2, price: 50, dev: null },
  leather:     { name: 'Leather Vest', slot: 'armor', icon: 'a_leather', def: 5, price: 150, dev: { hide: 5 } },
  chain:       { name: 'Chain Mail', slot: 'armor', icon: 'a_chain', def: 9, hp: 10, price: 420, dev: { ore: 10, hide: 4 } },
  mageRobe:    { name: 'Mage Robe', slot: 'armor', icon: 'a_robe', def: 5, mag: 6, price: 600, dev: { herb: 8, hide: 4 } },
  plate:       { name: 'Plate Armor', slot: 'armor', icon: 'a_plate', def: 15, hp: 20, price: 1200, dev: { ore: 20, crystal: 5 } },
  ninjaGarb:   { name: 'Shinobi Garb', slot: 'armor', icon: 'a_ninja', def: 10, atk: 4, price: 1000, dev: { hide: 12, crystal: 4 } },
  buckler:     { name: 'Wood Buckler', slot: 'offhand', icon: 'a_buckler', def: 4, hp: 4, price: 120, dev: { wood: 6 } },
  ironHelm:    { name: 'Iron Helm', slot: 'offhand', icon: 'a_helm', def: 12, hp: 12, price: 800, dev: { ore: 14 } },
  kiteShield:  { name: 'Kite Shield', slot: 'offhand', icon: 'a_kite', def: 13, price: 900, dev: { ore: 12, wood: 6 } },
  hornHelm:    { name: 'Horned Warhelm', slot: 'offhand', icon: 'a_hornhelm', def: 14, atk: 5, price: 1800, dev: { ore: 16, hide: 8 } },
  bronzeShield:{ name: 'Sun Shield', slot: 'offhand', icon: 'a_bronze', def: 18, mag: 4, price: 2200, dev: { ore: 18, crystal: 6 } },
  aegis:       { name: 'Golden Aegis', slot: 'offhand', icon: 'a_aegis', def: 30, hp: 30, price: 6000, dev: { ore: 30, crystal: 24 } },
  dragonMail:  { name: 'Dragon Mail', slot: 'armor', icon: 'a_dragon', def: 26, hp: 40, price: 4800, dev: { ore: 30, crystal: 16, hide: 12 } },
  warlordPlate:{ name: 'Warlord Plate', slot: 'armor', icon: 'a_warlord', def: 24, atk: 6, hp: 25, price: 4700, dev: { ore: 28, hide: 16, crystal: 12 } },
  astralMail:  { name: 'Astral Mail', slot: 'armor', icon: 'a_astral', def: 22, mag: 8, hp: 35, price: 5100, dev: { ore: 26, herb: 18, crystal: 20 } },
  duskRobe:    { name: 'Duskweave Robe', slot: 'armor', icon: 'a_robe', tint: 210, def: 16, mag: 14, hp: 20, price: 4200, dev: { hide: 22, herb: 22, crystal: 16 } },
  ironCap:     { name: 'Iron Cap', slot: 'offhand', icon: 'a_ironcap', def: 2, price: 60, dev: null },
  crownHelm:   { name: 'Warlord Crown', slot: 'offhand', icon: 'a_crown', def: 20, atk: 7, hp: 15, price: 3900, dev: { ore: 26, hide: 12, crystal: 14 } },
  mirrorHelm:  { name: 'Mirror Helm', slot: 'offhand', icon: 'a_mirror', def: 18, mag: 9, hp: 20, price: 4100, dev: { ore: 24, crystal: 20 } },
  citadelShield:{ name: 'Citadel Shield', slot: 'offhand', icon: 'a_citadel', def: 23, hp: 20, price: 3400, dev: { ore: 24, wood: 16, crystal: 10 } },
  dawnShield:  { name: 'Dawnguard Shield', slot: 'offhand', icon: 'a_dawnshield', def: 26, mag: 5, hp: 25, price: 5000, dev: { ore: 28, crystal: 20 } },

  // ---- accessories ----
  luckyCharm:  { name: 'Lucky Charm', slot: 'acc', icon: 'c_charm', crit: 0.05, price: 300, dev: { herb: 4, crystal: 1 } },
  powerRing:   { name: 'Power Ring', slot: 'acc', icon: 'c_ring', atk: 6, price: 800, dev: { ore: 8, crystal: 3 } },
  sageAmulet:  { name: 'Sage Amulet', slot: 'acc', icon: 'c_amulet', mag: 8, price: 900, dev: { herb: 10, crystal: 4 } },
  guardBand:   { name: 'Guard Band', slot: 'acc', icon: 'c_band', def: 6, hp: 12, price: 850, dev: { ore: 8, hide: 6 } },
  swiftBoots:  { name: 'Swift Boots', slot: 'acc', icon: 'c_boots', spd: 0.15, price: 1100, dev: { hide: 10, herb: 4 } },
  vitalRing:   { name: 'Vital Ring', slot: 'acc', icon: 'c_emerald', hp: 25, price: 700, dev: { herb: 8, crystal: 2 } },
  focusRing:   { name: 'Focus Ring', slot: 'acc', icon: 'c_sapphire', mag: 5, crit: 0.04, price: 1000, dev: { crystal: 5, ore: 4 } },
  boneCharm:   { name: 'Bone Charm', slot: 'acc', icon: 'c_bone', atk: 4, mag: 4, price: 600, dev: { hide: 8 } },
  fistGloves:  { name: 'Brawler Gloves', slot: 'acc', icon: 'c_gloves', atk: 5, crit: 0.03, price: 750, dev: { hide: 8, ore: 3 } },
  gauntlets:   { name: 'Titan Gauntlets', slot: 'acc', icon: 'c_gauntlet', atk: 10, def: 6, price: 2400, dev: { ore: 16, crystal: 6 } },
  rangerBoots: { name: 'Ranger Boots', slot: 'acc', icon: 'c_ranger', spd: 0.1, def: 3, price: 600, dev: { hide: 8 } },
  hermesBoots: { name: 'Winged Boots', slot: 'acc', icon: 'c_goldboots', spd: 0.25, crit: 0.03, price: 3000, dev: { hide: 14, crystal: 10 } },
  heroCrest:   { name: 'Hero Crest', slot: 'acc', icon: 'c_crest', atk: 8, mag: 8, def: 8, price: 4000, dev: { crystal: 20, ore: 12 } },

  // ---- consumables ----
  potion:      { name: 'Life Potion', slot: 'item', icon: 'LifePot', heal: 30, price: 25, dev: null },
  medipack:    { name: 'Medipack', slot: 'item', icon: 'Medipack', heal: 80, price: 70, dev: { herb: 6 } },
};

// Which shop sells which slot
export const SHOP_SLOTS = { weapon: ['weapon'], armor: ['armor', 'offhand', 'acc'], item: ['item', 'acc'] };
