// Static game data. Everything here is plain data: no state, no DOM.
// Sprite rects are pixel rects into Ninja Adventure (CC0) sheets.

export const T = 16;               // tile size in source pixels
// Camp guard waves by village stars; level caps never inherit visiting veterans.
export const CAMP_PATROLS = [
  { count: [0, 0], weeks: [7, 9], level: [1, 1] },
  { count: [1, 1], weeks: [6, 8], level: [1, 3] },
  { count: [1, 1], weeks: [5, 7], level: [3, 5] },
  { count: [1, 1], weeks: [4, 6], level: [5, 8] },
  { count: [2, 2], weeks: [3, 5], level: [8, 12] },
  { count: [2, 3], weeks: [2, 4], level: [12, 20] },
];
// The village sits in the middle of a wild field (DV2 style): monsters roam outside and adventurers hunt in view.
export const HOME_W = 76, HOME_H = 56;
export const MAP_W = HOME_W * 2, MAP_H = HOME_H * 2;
export const TOWN0 = { x0: 26, y0: 18, x1: 50, y1: 38 };  // initial buildable rect (x1/y1 exclusive); grows with Expand events
export const TOWN_MAX = { x0: 16, y0: 11, x1: 60, y1: 46 };

// ---------- tiles ----------
export const TILE = {
  grass: [0, 12], grassV: [[1, 12], [2, 12], [3, 12], [4, 12], [2, 11], [3, 11]],
  dirt: [1, 8],
};
// Road autotile: signature bits N,E,S,W,NE,SE,SW,NW (1 = grass on that side) -> [col,row] in Floor.png
export const ROAD_TILES = {"10011011":[0,7],"10001001":[1,7],"11001101":[2,7],"11011111":[3,7],"10011111":[4,7],"10001101":[5,7],"10001011":[6,7],"11001111":[7,7],"10001111":[8,7],"00001010":[9,7],"00010011":[0,8],"00000000":[1,8],"01001100":[2,8],"01011111":[3,8],"00010111":[4,8],"00000100":[5,8],"00000010":[6,8],"01001110":[7,8],"00000110":[8,8],"00000101":[9,8],"00110111":[0,9],"00100110":[1,9],"01101110":[2,9],"01111111":[3,9],"00011011":[4,9],"00001000":[5,9],"00000001":[6,9],"01001101":[7,9],"00001001":[8,9],"00001011":[9,9],"00001101":[10,9],"10111111":[0,10],"10101111":[1,10],"11101111":[2,10],"11111111":[3,10],"00111111":[4,10],"00101110":[5,10],"00100111":[6,10],"01101111":[7,10],"00101111":[8,10],"00000111":[9,10],"00001110":[10,10],"00011111":[4,11],"00001100":[5,11],"00000011":[6,11],"01001111":[7,11],"00001111":[8,11]};

// ---------- sprites ----------
const H = (x, y, w, h) => ({ img: 'house', x, y, w, h });
const N = (x, y, w, h) => ({ img: 'nature', x, y, w, h });
const E = (x, y, w, h) => ({ img: 'element', x, y, w, h });
export const SPR = {
  inn: H(0, 0, 64, 48), armor: H(64, 0, 64, 48), dojo: H(128, 0, 64, 48), guild: H(192, 0, 64, 48),
  food: H(256, 0, 48, 48), item: H(304, 0, 64, 48), bakery: H(368, 0, 48, 48), house: H(416, 0, 48, 48),
  weapon: H(464, 0, 64, 48), torii: H(0, 80, 48, 32), hutA: H(0, 112, 48, 48), hutB: H(48, 112, 48, 48),
  igloo: H(0, 176, 48, 46), smith: H(466, 64, 45, 63), tavern: H(385, 226, 78, 78),
  dojoSign: H(128, 64, 48, 16), statue: H(49, 242, 30, 30), statueBig: H(0, 241, 48, 63),
  palisadeH: H(160, 80, 16, 16), palisadeV: H(230, 64, 8, 32),
  fountain: { img: 'deco_fountain', x: 0, y: 0, w: 16, h: 16 }, basin: { img: 'deco_basin', x: 0, y: 0, w: 14, h: 12 },
  knightStatue: { img: 'deco_statue', x: 0, y: 0, w: 16, h: 26 }, castle: { img: 'deco_castle', x: 0, y: 0, w: 30, h: 39 },
  cave: H(0, 112, 48, 48), stableHut: { img: 'towers', x: 192, y: 64, w: 32, h: 32 },
  tower: { img: 'towers', x: 0, y: 0, w: 32, h: 32 }, towerB: { img: 'towers', x: 192, y: 32, w: 32, h: 32 },
  // nature
  treeRound: N(0, 0, 32, 32), treePine: N(32, 0, 32, 32), treeDead: N(64, 0, 32, 32), treeBush: N(96, 0, 32, 32),
  treeWhite: N(192, 0, 32, 32), treePink: N(224, 0, 32, 32), treeGreen: N(256, 0, 32, 32), treeYellow: N(288, 0, 32, 32),
  bigPink: N(0, 288, 48, 48), bigGreen: N(48, 288, 48, 48), bigWhite: N(96, 288, 48, 48), bigOrange: N(144, 288, 48, 48),
  stump: N(1, 134, 30, 23), bush: N(0, 160, 16, 16), bush2: N(16, 160, 16, 16), flowerSun: N(0, 176, 16, 16),
  flowerSun2: N(16, 176, 16, 16), clover: N(32, 176, 16, 16), flowerRed: N(48, 176, 16, 16), flowerWhite: N(96, 176, 16, 16),
  rock: N(128, 208, 16, 16), rockBig: N(208, 128, 32, 32), crystalBush: N(114, 227, 28, 25), berryBush: N(146, 227, 28, 25),
  // element props
  crate: E(1, 1, 14, 15), pot: E(17, 0, 14, 16), barrel: E(1, 17, 14, 15), cart: E(2, 51, 27, 27), cart2: E(36, 50, 27, 28),
  lamp: E(96, 48, 16, 32), well: E(67, 60, 27, 20), laundry: E(224, 41, 32, 21), bench: E(181, 39, 39, 22),
  signpost: E(51, 33, 11, 14), sack: E(1, 81, 14, 30), plant: E(0, 120, 15, 24),
};

// ---------- characters ----------
// Character sheets: 64x112, 4 columns (down, up, left, right) x 7 rows (0-3 walk, 4 attack, 5 jump, 6 misc)
export const DIR = { down: 0, up: 1, left: 2, right: 3 };

export { JOBS, PERKS, TIER_TP, VISITOR_JOBS } from './jobs.js';

export const NAMES = ['Mira', 'Brann', 'Toma', 'Kiko', 'Ren', 'Sora', 'Hana', 'Juno', 'Pip', 'Oda', 'Yuki', 'Taro', 'Lina', 'Goro',
  'Aki', 'Momo', 'Riku', 'Nami', 'Kaz', 'Emi', 'Bo', 'Ivo', 'Saya', 'Dax', 'Rin', 'Fenn', 'Kira', 'Ota', 'Luca', 'Mei', 'Zed', 'Nell',
  'Hiro', 'Ume', 'Kai', 'Tess', 'Jin', 'Ayla', 'Rook', 'Suki'];

export const PERSONA = {
  brave:    { name: 'Brave',    desc: 'Hunts more, retreats late.', hunt: 1.4, retreat: 0.2 },
  glutton:  { name: 'Glutton',  desc: 'Eats often, pays more for food.', food: 1.6 },
  shopper:  { name: 'Shopper',  desc: 'Loves browsing shops.', shop: 1.5 },
  lazy:     { name: 'Lazy',     desc: 'Rests a lot.', rest: 1.5, hunt: 0.7 },
  diligent: { name: 'Diligent', desc: 'Trains hard.', train: 1.6 },
  cheerful: { name: 'Cheerful', desc: 'Satisfaction grows faster.', joy: 1.3 },
  frugal:   { name: 'Frugal',   desc: 'Spends less, saves more.', shop: 0.6, food: 0.8 },
  cautious: { name: 'Cautious', desc: 'Retreats early.', retreat: 0.55, hunt: 0.8 },
};

// ---------- facilities ----------
// fp: footprint in tiles; spr: sprite key; cat: menu category.
// effect kinds: shop (sells from stock list), food, sleep (visitors), home (residents), train, heal, defense, farm, craft, guild, stable
export const FAC = {
  guild:  { name: 'Guild Hall', spr: 'guild', fp: [4, 2], cat: 'special', cost: 0, unique: true, kind: 'guild', rank: 1,
            desc: 'Quests, job changes and the heart of the village.' },
  inn:    { name: 'Inn', spr: 'inn', fp: [4, 2], cat: 'lodging', cost: 300, kind: 'sleep', price: 18, cap: 4, rank: 1, appeal: 4,
            desc: 'Visitors rest here. More beds, more guests.' },
  house:  { name: 'House', spr: 'house', fp: [3, 2], cat: 'lodging', cost: 220, kind: 'home', cap: 2, rank: 1, appeal: 2,
            desc: 'Two residents can live here.' },
  hut:    { name: 'Thatched Hut', spr: 'hutB', fp: [3, 2], cat: 'lodging', cost: 140, kind: 'home', cap: 1, rank: 1, appeal: 1,
            desc: 'Cheap single home.' },
  igloo:  { name: 'Snow Lodge', spr: 'igloo', fp: [3, 2], cat: 'lodging', cost: 900, kind: 'home', cap: 3, rank: 4, appeal: 6,
            desc: 'Cosy lodge for three. Residents love it.' },
  food:   { name: 'Onigiri Stand', spr: 'food', fp: [3, 2], cat: 'food', cost: 180, kind: 'food', price: 10, rank: 1, appeal: 3, fill: 60,
            desc: 'Quick bites. Hungry adventurers flock here.' },
  bakery: { name: 'Bakery', spr: 'bakery', fp: [3, 2], cat: 'food', cost: 420, kind: 'food', price: 22, rank: 2, appeal: 5, fill: 80,
            desc: 'Fresh bread from the stone oven.' },
  tavern: { name: 'Tavern', spr: 'tavern', fp: [5, 3], cat: 'food', cost: 1400, kind: 'food', price: 40, rank: 4, appeal: 9, fill: 100, fun: 40,
            desc: 'Hearty feasts and tall tales. Lifts spirits.' },
  weapon: { name: 'Weapon Shop', spr: 'weapon', fp: [4, 2], cat: 'shop', cost: 500, kind: 'shop', slot: 'weapon', rank: 1, appeal: 4,
            desc: 'Sells weapons you have developed.' },
  armor:  { name: 'Armor Shop', spr: 'armor', fp: [4, 2], cat: 'shop', cost: 500, kind: 'shop', slot: 'armor', rank: 2, appeal: 4,
            desc: 'Sells unlocked body armor, helmets, shields and accessories.' },
  item:   { name: 'Item Shop', spr: 'item', fp: [4, 2], cat: 'shop', cost: 380, kind: 'shop', slot: 'item', rank: 1, appeal: 4,
            desc: 'Sells unlocked potions and accessories.' },
  dojo:   { name: 'Dojo', spr: 'dojo', fp: [4, 2], cat: 'training', cost: 650, kind: 'train', price: 15, rank: 2, appeal: 3,
            desc: 'Train for job XP. Pays a lesson fee.' },
  shrine: { name: 'Shrine', spr: 'torii', fp: [3, 1], cat: 'training', cost: 480, kind: 'heal', price: 8, rank: 2, appeal: 6,
            desc: 'Blessings restore HP and mood.' },
  smith:  { name: 'Blacksmith', spr: 'smith', fp: [3, 2], cat: 'special', cost: 700, kind: 'craft', rank: 1, unique: true, appeal: 2,
            desc: 'Develop new weapons and armor from materials.' },
  tower:  { name: 'Watchtower', spr: 'tower', fp: [2, 1], cat: 'defense', cost: 450, kind: 'defense', rank: 3, appeal: 1, dmg: 8, range: 6,
            desc: 'Archers shoot at raiding monsters.' },
  stable: { name: 'Monster Stable', spr: 'stableHut', fp: [2, 1], cat: 'special', cost: 800, kind: 'stable', rank: 3, unique: true, cap: 4, appeal: 3,
            desc: 'Befriended monsters live here.' },
};

// Decor boosts appeal of facilities within `r` tiles.
export const DECOR = {
  road:      { name: 'Road', cost: 5, fp: [1, 1], road: true, desc: 'Adventurers walk faster on roads.' },
  palisade:  { name: 'Palisade', cost: 20, fp: [1, 1], spr: ['palisadeH', 'palisadeV'], barrier: true, cat: 'defense', desc: 'Blocks movement. Leave openings so people can pass.' },
  flower:    { name: 'Flowers', cost: 20, fp: [1, 1], spr: ['flowerSun', 'flowerRed', 'flowerWhite', 'flowerSun2'], appeal: 1, r: 2 },
  bush:      { name: 'Bush', cost: 15, fp: [1, 1], spr: ['bush', 'bush2'], appeal: 1, r: 2 },
  treeGreen: { name: 'Oak Tree', cost: 40, fp: [2, 1], spr: ['treeGreen'], appeal: 2, r: 3 },
  treePink:  { name: 'Sakura', cost: 90, fp: [2, 1], spr: ['treePink'], appeal: 4, r: 3, rank: 2 },
  bigPink:   { name: 'Great Sakura', cost: 260, fp: [3, 1], spr: ['bigPink'], appeal: 8, r: 4, rank: 3 },
  lamp:      { name: 'Street Lamp', cost: 60, fp: [1, 1], spr: ['lamp'], appeal: 2, r: 3 },
  well:      { name: 'Supply Crates', cost: 120, fp: [2, 1], spr: ['well'], appeal: 3, r: 3 },
  bench:     { name: 'Bench', cost: 70, fp: [3, 1], spr: ['bench'], appeal: 2, r: 2 },
  cart:      { name: 'Market Cart', cost: 110, fp: [2, 1], spr: ['cart', 'cart2'], appeal: 3, r: 3, rank: 2 },
  statue:    { name: 'Hero Statue', cost: 500, fp: [2, 1], spr: ['statue'], appeal: 10, r: 5, rank: 4 },
  crystal:   { name: 'Crystal Bush', cost: 180, fp: [2, 1], spr: ['crystalBush'], appeal: 5, r: 3, rank: 3 },
  fountain:  { name: 'Fountain', cost: 350, fp: [1, 1], spr: ['fountain'], appeal: 7, r: 4, rank: 2 },
  basin:     { name: 'Stone Basin', cost: 150, fp: [1, 1], spr: ['basin'], appeal: 3, r: 3 },
  knightStatue: { name: 'Knight Statue', cost: 700, fp: [1, 1], spr: ['knightStatue'], appeal: 9, r: 4, rank: 3 },
  castle:    { name: 'Castle', cost: 12000, fp: [2, 1], spr: ['castle'], appeal: 25, r: 7, rank: 5, desc: 'The pride of a legendary town.' },
};

// Town Traits (DV2): every building/decor adds points to town-wide trait totals.
// Titles fire when several trait thresholds are met at once -> permanent bonus + one-off reward.
export const TRAIT_NAMES = ['Rest', 'Food', 'Shopping', 'Battle', 'Nature', 'Culture', 'Cute', 'Safe', 'Monster'];
export const FAC_TRAITS = {
  guild: { Battle: 4, Culture: 2 }, inn: { Rest: 6 }, house: { Rest: 2, Safe: 1 }, hut: { Rest: 1, Nature: 1 },
  igloo: { Rest: 4, Cute: 3 }, food: { Food: 5 }, bakery: { Food: 7, Cute: 2 }, tavern: { Food: 10, Culture: 4 },
  weapon: { Battle: 6, Shopping: 3 }, armor: { Safe: 6, Shopping: 3 }, item: { Shopping: 6 }, dojo: { Battle: 8 },
  shrine: { Culture: 8, Safe: 2 }, smith: { Battle: 4, Culture: 2 }, tower: { Safe: 8 }, stable: { Monster: 10 },
  flower: { Nature: 2, Cute: 2 }, bush: { Nature: 1 }, treeGreen: { Nature: 3 }, treePink: { Nature: 4, Cute: 3 },
  bigPink: { Nature: 8, Cute: 6, Culture: 2 }, lamp: { Safe: 2, Culture: 1 }, well: { Rest: 2, Culture: 2 },
  bench: { Rest: 3 }, palisade: {}, fountain: { Culture: 4, Cute: 3, Rest: 2 }, basin: { Rest: 2, Nature: 1 }, knightStatue: { Culture: 8, Safe: 4 }, castle: { Culture: 30, Safe: 20, Battle: 10 }, cart: { Shopping: 4, Food: 1 }, statue: { Culture: 10, Battle: 3 }, crystal: { Nature: 4, Cute: 4 },
};
export const TITLES = [
  { id: 'rest',    name: 'Travelers Rest',   need: { Rest: 15, Food: 10 },               bonus: { visitors: 0.15 }, pop: 60,  gold: 300,  desc: '+15% visitors' },
  { id: 'hq',      name: 'Adventurer HQ',    need: { Rest: 20, Battle: 15, Safe: 10 },   bonus: { xp: 0.2 },        pop: 100, gold: 600,  desc: '+20% adventurer XP' },
  { id: 'gourmet', name: 'Gourmet Town',     need: { Food: 30, Culture: 8 },             bonus: { foodSales: 0.25 },pop: 120, gold: 800,  desc: '+25% food sales' },
  { id: 'shop',    name: 'Shopaholic Haven', need: { Shopping: 25, Cute: 8 },            bonus: { shopSales: 0.25 },pop: 120, gold: 800,  desc: '+25% shop sales' },
  { id: 'garden',  name: 'Garden Village',   need: { Nature: 30, Cute: 15 },             bonus: { joy: 0.3 },       pop: 150, gold: 500,  desc: 'Satisfaction grows 30% faster' },
  { id: 'fort',    name: 'Iron Fortress',    need: { Safe: 30, Battle: 25 },             bonus: { def: 0.15 },      pop: 180, gold: 1000, desc: '+15% adventurer defense' },
  { id: 'sacred',  name: 'Sacred Grounds',   need: { Culture: 30, Nature: 20 },          bonus: { heal: 0.5 },      pop: 200, gold: 1200, desc: 'Healing +50%' },
  { id: 'beast',   name: 'Living in Harmony',need: { Monster: 20, Battle: 30, Nature: 20 }, bonus: { tame: 0.5 },   pop: 250, gold: 1500, desc: 'Monsters befriend 50% more often' },
  { id: 'metro',   name: 'Bustling Metropolis', need: { Rest: 50, Food: 50, Shopping: 50, Culture: 30 }, bonus: { visitors: 0.3 }, pop: 500, gold: 5000, desc: '+30% visitors' },
];

// Town events cost Town Points (earned monthly from monster kills).
export const EVENTS = [
  { id: 'festival', name: 'Harvest Festival', tp: 20, desc: 'Visitors x2 and joy up for 2 weeks.', weeks: 2 },
  { id: 'contest',  name: 'Hunting Contest',  tp: 25, desc: 'Adventurers hunt eagerly; kill gold x2 for 2 weeks.', weeks: 2 },
  { id: 'sale',     name: 'Bargain Sale',     tp: 15, desc: 'Shops sell 50% more for 1 week.', weeks: 1 },
  { id: 'expand',   name: 'Expand Village',   tp: 40, desc: 'Grow the buildable area by 3 tiles each side.', once: false },
  { id: 'recruit',  name: 'Recruitment Drive',tp: 30, desc: 'Three adventurers arrive at once.' },
];

// ---------- items ----------
export { ITEMS, SHOP_SLOTS } from './items.js';
export { HAPPENINGS, HAPPEN_CHANCE, CHARTERS, ROSTER_SIZE } from './happenings.js';

export const MATS = {
  wood:    { name: 'Wood',    icon: 'w_AxeTool' },
  hide:    { name: 'Hide',    icon: 'Beaf' },
  herb:    { name: 'Herb',    icon: 'TeaLeaf' },
  ore:     { name: 'Ore',     icon: 'w_Pickaxe' },
  crystal: { name: 'Crystal', icon: 'GoldCup' },
};

// ---------- monsters ----------
export const MONSTERS = {
  warg:     { name: 'Dread Warg', spr: 'DreadWarg', hp: 120, atk: 29, def: 12, spd: 1.2, xp: 60, gold: 60, drops: {} },
  emberWarg:{ name: 'Ember Warg', spr: 'EmberWarg', hp: 115, atk: 28, def: 13, spd: 1.2, xp: 60, gold: 60, drops: {} },
  slime:    { name: 'Slime',     spr: 'Slime',       hp: 14, atk: 3,  def: 1, spd: 0.6, xp: 4,  gold: 6,  drops: { herb: 0.4 } },
  slimeB:   { name: 'Blue Slime', spr: 'Slime3',     hp: 20, atk: 4,  def: 2, spd: 0.6, xp: 6,  gold: 8,  drops: { herb: 0.5 } },
  mushroom: { name: 'Shroom',    spr: 'Mushroom',    hp: 18, atk: 5,  def: 1, spd: 0.7, xp: 6,  gold: 7,  drops: { herb: 0.6 } },
  bat:      { name: 'Bat',       spr: 'BlueBat',     hp: 12, atk: 6,  def: 0, spd: 1.3, xp: 6,  gold: 6,  drops: { hide: 0.3 } },
  snake:    { name: 'Snake',     spr: 'Snake',       hp: 22, atk: 7,  def: 2, spd: 0.9, xp: 9,  gold: 10, drops: { hide: 0.5 } },
  racoon:   { name: 'Bandit Racoon', spr: 'Racoon',  hp: 30, atk: 8,  def: 3, spd: 1.0, xp: 12, gold: 18, drops: { wood: 0.6, hide: 0.3 } },
  bamboo:   { name: 'Bamboo Imp', spr: 'Bamboo',     hp: 34, atk: 9,  def: 4, spd: 0.8, xp: 14, gold: 14, drops: { wood: 0.8 } },
  mole:     { name: 'Mole',      spr: 'Mole',        hp: 38, atk: 10, def: 6, spd: 0.7, xp: 16, gold: 16, drops: { ore: 0.7 } },
  spider:   { name: 'Spider',    spr: 'SpiderRed',   sheetRows: true, hp: 40, atk: 13, def: 3, spd: 1.2, xp: 20, gold: 20, drops: { hide: 0.5, herb: 0.3 } },
  cyclope:  { name: 'Cyclops',   spr: 'Cyclope',     hp: 60, atk: 15, def: 7, spd: 0.8, xp: 28, gold: 30, drops: { ore: 0.6, crystal: 0.15 } },
  skull:    { name: 'Skull',     spr: 'Skull',       hp: 55, atk: 17, def: 5, spd: 1.0, xp: 30, gold: 28, drops: { crystal: 0.25 } },
  flam:     { name: 'Flame',     spr: 'Flam',        hp: 50, atk: 20, def: 4, spd: 1.1, xp: 32, gold: 30, drops: { crystal: 0.3 } },
  dragon:   { name: 'Drake',     spr: 'Dragon',      hp: 90, atk: 22, def: 10, spd: 0.9, xp: 45, gold: 50, drops: { ore: 0.5, crystal: 0.4, hide: 0.5 } },
  reptile:  { name: 'Lizardman', spr: 'Reptile',     hp: 80, atk: 21, def: 12, spd: 0.9, xp: 42, gold: 44, drops: { hide: 0.7, ore: 0.3 } },
  eye:      { name: 'Evil Eye',  spr: 'Eye',         hp: 70, atk: 26, def: 6, spd: 1.0, xp: 48, gold: 48, drops: { crystal: 0.5 } },
  // zone 1
  butterfly:{ name: 'Moth',      spr: 'Butterfly',   hp: 11, atk: 4,  def: 0, spd: 1.2, xp: 4,  gold: 5,  drops: { herb: 0.4 } },
  larva:    { name: 'Grub',      spr: 'Larva',       hp: 16, atk: 4,  def: 2, spd: 0.5, xp: 5,  gold: 6,  drops: { hide: 0.3 } },
  axolot:   { name: 'Axolotl',   spr: 'Axolot',      hp: 15, atk: 4,  def: 1, spd: 0.8, xp: 5,  gold: 7,  drops: { herb: 0.5 } },
  slimeG:   { name: 'Green Slime', spr: 'Slime2',    hp: 17, atk: 4,  def: 1, spd: 0.6, xp: 5,  gold: 7,  drops: { herb: 0.5 } },
  // zone 2
  lizard:   { name: 'Lizard',    spr: 'Lizard',      hp: 26, atk: 8,  def: 3, spd: 1.0, xp: 10, gold: 11, drops: { hide: 0.5 } },
  kappa:    { name: 'Kappa',     spr: 'KappaGreen',  sheetRows: true, hp: 30, atk: 8,  def: 4, spd: 0.9, xp: 12, gold: 13, drops: { herb: 0.5, wood: 0.2 } },
  snakeB:   { name: 'Viper',     spr: 'Snake2',      hp: 24, atk: 9,  def: 2, spd: 1.1, xp: 11, gold: 11, drops: { hide: 0.5 } },
  owl:      { name: 'Owl',       spr: 'Owl',         hp: 22, atk: 8,  def: 2, spd: 1.2, xp: 10, gold: 12, drops: { herb: 0.3, wood: 0.3 } },
  shroomB:  { name: 'Blue Shroom', spr: 'Mushroom2', hp: 28, atk: 7,  def: 3, spd: 0.7, xp: 11, gold: 11, drops: { herb: 0.7 } },
  panda:    { name: 'Panda',     spr: 'Panda',       sheetRows: true, hp: 40, atk: 9,  def: 5, spd: 0.8, xp: 15, gold: 16, drops: { wood: 0.6, hide: 0.3 } },
  // zone 3
  bear:     { name: 'Bear',      spr: 'Bear',        hp: 62, atk: 14, def: 6, spd: 0.9, xp: 24, gold: 24, drops: { hide: 0.8 } },
  beast:    { name: 'Horned Beast', spr: 'Beast',    hp: 58, atk: 15, def: 7, spd: 1.0, xp: 26, gold: 26, drops: { hide: 0.6, ore: 0.3 } },
  spiderY:  { name: 'Wasp Spider', spr: 'SpiderYellow', sheetRows: true, hp: 44, atk: 15, def: 4, spd: 1.3, xp: 22, gold: 22, drops: { hide: 0.5, herb: 0.3 } },
  moleB:    { name: 'Rock Mole', spr: 'Mole2',       hp: 50, atk: 12, def: 9, spd: 0.7, xp: 22, gold: 22, drops: { ore: 0.9 } },
  lantern:  { name: 'Lantern Ghost', spr: 'LanternRed', hp: 46, atk: 16, def: 4, spd: 1.0, xp: 25, gold: 25, drops: { crystal: 0.25 } },
  goldRac:  { name: 'Gold Racoon', spr: 'GoldRacoon', hp: 52, atk: 13, def: 6, spd: 1.2, xp: 24, gold: 60, drops: { ore: 0.4 } },
  // zone 4
  drakeY:   { name: 'Thunder Drake', spr: 'DragonYellow', hp: 96, atk: 24, def: 11, spd: 0.95, xp: 50, gold: 54, drops: { crystal: 0.5, ore: 0.4 } },
  eyeB:     { name: 'Watcher',   spr: 'Eye2',        hp: 74, atk: 27, def: 7, spd: 1.0, xp: 50, gold: 50, drops: { crystal: 0.5 } },
  trex:     { name: 'T-Rex',     spr: 'TRex',        sheetRows: true, hp: 120, atk: 26, def: 12, spd: 0.8, xp: 58, gold: 60, drops: { hide: 1, ore: 0.3 } },
  skullB:   { name: 'Frost Skull', spr: 'SkullBlue', hp: 64, atk: 22, def: 6, spd: 1.05, xp: 42, gold: 40, drops: { crystal: 0.35 } },
  flamB:    { name: 'Wisp',      spr: 'Flam2',       hp: 58, atk: 24, def: 5, spd: 1.2, xp: 44, gold: 42, drops: { crystal: 0.4 } },
  spirit:   { name: 'Phantom',   spr: 'Spirit',      hp: 70, atk: 25, def: 8, spd: 1.1, xp: 48, gold: 46, drops: { crystal: 0.45 } },
  reptileB: { name: 'Lizard King', spr: 'Reptile2',  hp: 100, atk: 25, def: 14, spd: 0.9, xp: 55, gold: 56, drops: { hide: 0.8, ore: 0.4 } },
  // more wildlife (Ninja Adventure) — zone 1
  mouse:    { name: 'Field Mouse', spr: 'Mouse',     hp: 12, atk: 4,  def: 0, spd: 1.3, xp: 4,  gold: 5,  drops: { herb: 0.3 } },
  rat:      { name: 'Sewer Rat', spr: 'MouseBlack',  hp: 14, atk: 5,  def: 1, spd: 1.2, xp: 5,  gold: 6,  drops: { hide: 0.3 } },
  mothB:    { name: 'Blue Moth', spr: 'ButterflyBlue', hp: 12, atk: 5, def: 0, spd: 1.25, xp: 5, gold: 6,  drops: { herb: 0.4 } },
  axolotB:  { name: 'Frost Axolotl', spr: 'AxolotBlue', hp: 17, atk: 5, def: 1, spd: 0.8, xp: 6,  gold: 7,  drops: { herb: 0.4, crystal: 0.03 } },
  mudskip:  { name: 'Mudskipper', spr: 'Fish',       hp: 15, atk: 4,  def: 1, spd: 0.9, xp: 5,  gold: 7,  drops: { hide: 0.3 } },
  chomperG: { name: 'Heart Chomper', spr: 'HeartGreen', sheetRows: true, hp: 19, atk: 6, def: 1, spd: 0.9, xp: 7,  gold: 8,  drops: { herb: 0.5 } },
  // zone 2
  mudskipR: { name: 'Red Mudskipper', spr: 'FishRed', hp: 24, atk: 8, def: 2, spd: 1.0, xp: 10, gold: 11, drops: { hide: 0.4 } },
  bambooY:  { name: 'Golden Bamboo', spr: 'BambooYellow', hp: 36, atk: 9, def: 5, spd: 0.8, xp: 15, gold: 18, drops: { wood: 0.9 } },
  kappaR:   { name: 'Red Kappa', spr: 'KappaRed',    sheetRows: true, hp: 32, atk: 9,  def: 4, spd: 0.9, xp: 13, gold: 14, drops: { herb: 0.4, wood: 0.3 } },
  gecko:    { name: 'Gecko',     spr: 'Lizard2',     hp: 25, atk: 8,  def: 3, spd: 1.15, xp: 10, gold: 11, drops: { hide: 0.5 } },
  grassSnake: { name: 'Grass Snake', spr: 'Snake3',  hp: 23, atk: 8,  def: 2, spd: 1.0, xp: 10, gold: 10, drops: { hide: 0.4, herb: 0.2 } },
  octo:     { name: 'Octo',      spr: 'Octopus',     hp: 28, atk: 8,  def: 3, spd: 0.8, xp: 11, gold: 12, drops: { herb: 0.4 } },
  crab:     { name: 'Shellback', spr: 'Mollusc',     hp: 34, atk: 8,  def: 6, spd: 0.7, xp: 13, gold: 13, drops: { ore: 0.4 } },
  grubB:    { name: 'Frost Grub', spr: 'Larva2',     hp: 26, atk: 7,  def: 4, spd: 0.6, xp: 10, gold: 11, drops: { hide: 0.3, crystal: 0.05 } },
  bigSlime: { name: 'Big Slime', spr: 'Slime4',      hp: 38, atk: 8,  def: 3, spd: 0.6, xp: 14, gold: 14, drops: { herb: 0.7 } },
  // zone 3
  nightOwl: { name: 'Night Owl', spr: 'Owl2',        hp: 42, atk: 14, def: 4, spd: 1.25, xp: 20, gold: 21, drops: { hide: 0.4, crystal: 0.1 } },
  chomperR: { name: 'Heart Eater', spr: 'HeartRed',  sheetRows: true, hp: 50, atk: 16, def: 5, spd: 1.0, xp: 24, gold: 24, drops: { herb: 0.5, crystal: 0.1 } },
  thornshell: { name: 'Thornshell', spr: 'Mollusc2', hp: 56, atk: 12, def: 10, spd: 0.7, xp: 24, gold: 24, drops: { ore: 0.8 } },
  octoG:    { name: 'Swamp Octo', spr: 'GreenOctopus', sheetRows: true, hp: 48, atk: 14, def: 5, spd: 0.9, xp: 22, gold: 22, drops: { herb: 0.6 } },
  octoB:    { name: 'Frost Octo', spr: 'Octopus2',   hp: 46, atk: 15, def: 5, spd: 0.9, xp: 22, gold: 23, drops: { crystal: 0.2 } },
  cyclopeG: { name: 'Moss Cyclops', spr: 'Cyclope2', hp: 62, atk: 15, def: 7, spd: 0.8, xp: 28, gold: 29, drops: { ore: 0.5, crystal: 0.15 } },
  lanternG: { name: 'Swamp Lantern', spr: 'LanternGreen', hp: 45, atk: 16, def: 4, spd: 1.0, xp: 24, gold: 25, drops: { crystal: 0.25 } },
  pincer:   { name: 'Pincer Bat', spr: 'YellowsBat', sheetRows: true, hp: 40, atk: 15, def: 4, spd: 1.3, xp: 21, gold: 22, drops: { hide: 0.4 } },
  // zone 4
  ironRex:  { name: 'Iron Rex',  spr: 'GreyTrex',    sheetRows: true, hp: 125, atk: 27, def: 14, spd: 0.8, xp: 62, gold: 64, drops: { ore: 0.6, hide: 0.6 } },
  direBeast: { name: 'Dire Beast', spr: 'Beast2',    hp: 105, atk: 25, def: 11, spd: 1.0, xp: 55, gold: 55, drops: { hide: 0.9, ore: 0.3 } },
  kraken:   { name: 'Kraken Spawn', spr: 'RedOctopus', sheetRows: true, hp: 88, atk: 25, def: 9, spd: 0.9, xp: 50, gold: 52, drops: { crystal: 0.4, herb: 0.3 } },
  ember:    { name: 'Ember Spirit', spr: 'Spirit2',  hp: 72, atk: 26, def: 7, spd: 1.15, xp: 50, gold: 48, drops: { crystal: 0.5 } },
  bloodViper: { name: 'Blood Viper', spr: 'Snake4',  hp: 80, atk: 26, def: 8, spd: 1.2, xp: 50, gold: 50, drops: { hide: 0.7 } },
  // outlaws: HUMAN pawns drawn from character sheets (assets/chars, 64x112) holding an in-hand weapon (h_<weapon>).
  // They roam zones 3-4 and form the Bandit Raid gang. raidOnly = never spawns in the wild.
  cutthroat: { name: 'Cutthroat', spr: 'NinjaRed2',  human: true, weapon: 'Sai',      hp: 46, atk: 14, def: 4, spd: 1.1, xp: 22, gold: 34, drops: { hide: 0.3, ore: 0.2 } },
  thief:    { name: 'Shadow Thief', spr: 'NinjaBlue2', human: true, weapon: 'Ninjaku', hp: 40, atk: 13, def: 3, spd: 1.25, xp: 20, gold: 40, drops: { herb: 0.3 } },
  swine:    { name: 'Swine Raider', spr: 'Pig',       human: true, weapon: 'Fork',     hp: 60, atk: 15, def: 7, spd: 0.85, xp: 26, gold: 30, drops: { hide: 0.6 } },
  brute:    { name: 'Orc Brute', spr: 'GreenPig',     human: true, weapon: 'Club',     hp: 70, atk: 17, def: 8, spd: 0.8, xp: 32, gold: 36, drops: { hide: 0.5, ore: 0.4 } },
  ronin:    { name: 'Ronin',     spr: 'SamuraiRed',   human: true, weapon: 'Katana',   hp: 95, atk: 26, def: 11, spd: 1.05, xp: 56, gold: 70, drops: { ore: 0.5, crystal: 0.25 } },
  chief:    { name: 'Bandit Chief', spr: 'CaveLion2', human: true, weapon: 'BigSword', raidOnly: true, hp: 150, atk: 28, def: 13, spd: 0.95, xp: 90, gold: 160, drops: { ore: 0.8, crystal: 0.5 } },
};
// Total adventurer cap per village rank (index = stars 0..5): residents and travelers combined.
export const VISITOR_CAP = [5, 5, 10, 15, 20, 30];
// Chance that a wild spawn is an Elite (recoloured, tougher, double-plus rewards).
export const ELITE_CHANCE = 0.06;
export const FRONTIER_PETS = ['warg', 'emberWarg', 'drakeY', 'ironRex'];

// Monsters per zone (zone 1 = next to town … zone 4 = map edges). Each new village keeps a random subset
// (ROSTER_SIZE in happenings.js) so every seed has different wildlife. ZONE_POP = target monsters alive per zone,
// ZONE_LV = base monster level per zone.
export const ZONE_POP = [0, 14, 11, 9, 7];
export const ZONE_MONS = {
  1: ['slime', 'mushroom', 'bat', 'butterfly', 'larva', 'axolot', 'slimeG', 'mouse', 'rat', 'mothB', 'axolotB', 'mudskip', 'chomperG'],
  2: ['snake', 'racoon', 'bamboo', 'slimeB', 'lizard', 'kappa', 'snakeB', 'owl', 'shroomB', 'panda', 'mudskipR', 'bambooY', 'kappaR',
      'gecko', 'grassSnake', 'octo', 'crab', 'grubB', 'bigSlime'],
  3: ['mole', 'spider', 'cyclope', 'bear', 'beast', 'spiderY', 'moleB', 'lantern', 'goldRac', 'nightOwl', 'chomperR', 'thornshell',
      'octoG', 'octoB', 'cyclopeG', 'lanternG', 'pincer', 'cutthroat', 'thief', 'swine', 'brute'],
  4: ['flam', 'dragon', 'eye', 'reptile', 'skull', 'drakeY', 'eyeB', 'trex', 'skullB', 'flamB', 'spirit', 'reptileB', 'ironRex',
      'direBeast', 'kraken', 'ember', 'bloodViper', 'ronin'] };
export const ZONE_LV = [0, 1, 4, 9, 15];

// Bosses: sheet = frames laid horizontally, fw x fh
export const BOSSES = {
  giantSlime:  { name: 'King Slime',     dir: 'GiantSlime', idle: 'Idle.png', fw: 62, fh: 52, frames: 5, hp: 300,   atk: 13,  def: 4,  rec: 3,  star: 0, zone: 1, xp: 120,  gold: 400,   drops: { herb: 8, crystal: 1 } },
  giantFrog:   { name: 'Swamp Toad',     dir: 'GiantFrog', idle: 'Idle40x40.png', fw: 40, fh: 40, frames: 5, hp: 700, atk: 28, def: 9, rec: 6, star: 0, zone: 1, xp: 200, gold: 700, drops: { hide: 10, herb: 6 } },
  bamboo:      { name: 'Bamboo Titan',   dir: 'GiantBamboo', idle: 'Idle.png', fw: 62, fh: 62, frames: 6, hp: 850, atk: 30, def: 10, rec: 7, star: 1, zone: 2, xp: 240, gold: 850, drops: { wood: 16, herb: 6 } },
  racoon:      { name: 'Tanuki Lord',    dir: 'GiantRacoon', idle: 'Idle.png', fw: 60, fh: 60, frames: 6, hp: 1300, atk: 38, def: 14, rec: 10, star: 1, zone: 2, xp: 320, gold: 1200, drops: { wood: 14, ore: 8 } },
  blueSamurai: { name: 'Azure Ronin',    dir: 'GiantBlueSamurai', idle: 'Idle.png', fw: 48, fh: 48, frames: 12, hp: 1700, atk: 46, def: 17, rec: 12, star: 2, zone: 3, xp: 400, gold: 1500, drops: { ore: 12, crystal: 3 } },
  spirit:      { name: 'Wraith',         dir: 'GiantSpirit', idle: 'Idle.png', fw: 50, fh: 50, frames: 5, hp: 2200, atk: 55, def: 20, rec: 14, star: 2, zone: 3, xp: 450, gold: 1800, drops: { crystal: 8 } },
  giantFrog2:  { name: 'Venom Toad',     dir: 'GiantFrog2', idle: 'Idle.png', fw: 40, fh: 40, frames: 5, hp: 2700, atk: 62, def: 22, rec: 16, star: 3, zone: 3, xp: 520, gold: 2100, drops: { hide: 16, herb: 12 } },
  tenguBlue:   { name: 'Storm Tengu',    dir: 'TenguBlue', idle: 'Idle.png', fw: 68, fh: 68, frames: 6, hp: 3000, atk: 66, def: 24, rec: 17, star: 3, zone: 4, xp: 560, gold: 2300, drops: { crystal: 10, wood: 10 } },
  flam:        { name: 'Inferno',        dir: 'GiantFlam', idle: 'Idle.png', fw: 50, fh: 50, frames: 5, hp: 3400, atk: 72, def: 26, rec: 19, star: 4, zone: 4, xp: 600, gold: 2500, drops: { crystal: 12, ore: 10 } },
  redSamurai:  { name: 'Crimson Shogun', dir: 'GiantRedSamurai', idle: 'Idle.png', fw: 48, fh: 48, frames: 12, hp: 3900, atk: 76, def: 27, rec: 21, star: 4, zone: 4, xp: 750, gold: 3200, drops: { ore: 18, crystal: 10 } },
  cyclop:      { name: 'Demon Cyclops',  dir: 'DemonCyclop', idle: 'Idle.png', fw: 50, fh: 50, frames: 5, hp: 4200, atk: 78, def: 28, rec: 23, star: 4, zone: 4, xp: 900, gold: 4000, drops: { crystal: 20, ore: 20 } },
  // post-game legendary hunts (after 5 stars)
  magmaSlime:  { name: 'Magma King',     dir: 'GiantSlime2', idle: 'Idle.png', fw: 62, fh: 52, frames: 5, hp: 9000, atk: 125, def: 42, rec: 30, star: 5, zone: 4, xp: 1300, gold: 6000, drops: { crystal: 24, ore: 16 } },
  goldTanuki:  { name: 'Golden Tanuki',  dir: 'GiantRacoonGold', idle: 'Idle.png', fw: 60, fh: 60, frames: 6, hp: 16000, atk: 175, def: 55, rec: 45, star: 5, zone: 4, xp: 1800, gold: 12000, drops: { ore: 30, crystal: 20 } },
  tenguRed:    { name: 'Tengu Sovereign', dir: 'TenguRed', idle: 'Idle.png', fw: 82, fh: 82, frames: 6, hp: 26000, atk: 230, def: 70, rec: 60, star: 5, zone: 4, xp: 2500, gold: 16000, drops: { crystal: 36 } },
  cyclop2:     { name: 'Abyss Cyclops',  dir: 'DemonCyclop2', idle: 'Idle.png', fw: 50, fh: 50, frames: 5, hp: 42000, atk: 300, def: 90, rec: 80, star: 5, zone: 4, xp: 3500, gold: 25000, drops: { crystal: 50, ore: 40 } },
};

// One-time frontier conquests. Existing boss art/stats are reused; dormant sites have no actors.
export const FRONTIERS = [
  { id: 'greenmarch', name: 'Greenmarch Den', bossName: 'Rootbound Guardian', boss: 'bamboo', x: 64, y: 25, land: { x0: 50, y0: 18, x1: 76, y1: 38 }, requires: [], star: 1, rec: 10, fee: 400, bonus: { hp: 0.03 }, benefit: '+3% adventurer HP', relic: 'rootheart', zone: 2 },
  { id: 'sunken', name: 'Sunken Grotto', bossName: 'Mire Lord', boss: 'racoon', x: 45, y: 49, land: { x0: 26, y0: 38, x1: 50, y1: 58 }, requires: [], star: 1, rec: 13, fee: 600, bonus: { def: 0.03 }, benefit: '+3% adventurer DEF', relic: 'mireSeal', zone: 1 },
  { id: 'ironvale', name: 'Ironvale Stronghold', bossName: 'Iron Oath Ronin', boss: 'blueSamurai', x: 94, y: 32, land: { x0: 76, y0: 12, x1: 110, y1: 55 }, requires: ['greenmarch'], star: 2, rec: 16, fee: 900, bonus: { matDrops: 0.05 }, benefit: '+5% material drop yield', relic: 'ironOath', zone: 3 },
  { id: 'moonwood', name: 'Moonwood Hollow', bossName: 'Moonlit Warden', boss: 'spirit', x: 57, y: 70, land: { x0: 26, y0: 58, x1: 76, y1: 82 }, requires: ['sunken'], star: 2, rec: 18, fee: 1100, bonus: { mag: 0.03 }, benefit: '+3% adventurer MAG', relic: 'moonTear', zone: 2 },
  { id: 'emberreach', name: 'Emberreach Caldera', bossName: 'Cinder Crown', boss: 'flam', x: 128, y: 32, land: { x0: 110, y0: 12, x1: 148, y1: 55 }, requires: ['ironvale'], star: 3, rec: 25, fee: 1500, bonus: { atk: 0.03 }, benefit: '+3% adventurer ATK', relic: 'cinderSignet', zone: 4 },
  { id: 'stormfen', name: 'Stormfen Shrine', bossName: 'Tempest Keeper', boss: 'tenguBlue', x: 92, y: 67, land: { x0: 76, y0: 55, x1: 110, y1: 82 }, requires: ['ironvale'], star: 3, rec: 24, fee: 1400, bonus: { xp: 0.03 }, benefit: '+3% combat EXP', relic: 'stormKnot', zone: 3 },
  { id: 'frostveil', name: 'Frostveil Cavern', bossName: 'Pale Ember King', boss: 'magmaSlime', x: 67, y: 96, land: { x0: 26, y0: 82, x1: 110, y1: 108 }, requires: ['moonwood'], star: 4, rec: 36, fee: 2200, bonus: { shopSales: 0.03 }, benefit: '+3% shop revenue', relic: 'paleEmber', zone: 3 },
  { id: 'crownwaste', name: 'Crownwaste Vault', bossName: 'Last Golden Regent', boss: 'goldTanuki', x: 129, y: 90, land: { x0: 110, y0: 55, x1: 148, y1: 108 }, requires: ['emberreach', 'stormfen'], star: 5, rec: 52, fee: 3200, bonus: { killGold: 0.05 }, benefit: '+5% monster gold', relic: 'regentStar', zone: 4 },
];

// ---------- world ----------
// Zone names for quest text only (ZONE_BIOME in state.js maps zone -> biome; only `name` is read). The other fields are
// leftovers from v1's world map and are unused — multi-map support is issue #41, not this table.
export const BIOMES = {
  meadow: { name: 'Meadow',   ground: [0, 12], tint: '#9bbf4a', mons: ['slime', 'mushroom', 'bat'], mats: ['herb', 'wood'], deco: ['treeGreen', 'bush', 'flowerSun'] },
  forest: { name: 'Forest',   ground: [11, 12], tint: '#5e9a45', mons: ['snake', 'racoon', 'bamboo'], mats: ['wood', 'hide'], deco: ['treePine', 'treeRound', 'bush2'] },
  hills:  { name: 'Hills',    ground: [0, 5], tint: '#e0a060', mons: ['mole', 'spider', 'cyclope'], mats: ['ore', 'hide'], deco: ['rockBig', 'rock', 'stump'] },
  snow:   { name: 'Snowfield',ground: [0, 19], tint: '#e8e4ee', mons: ['skull', 'reptile', 'slimeB'], mats: ['crystal', 'ore'], deco: ['treeWhite', 'rock'] },
  ashen:  { name: 'Ashlands', ground: [11, 19], tint: '#a88f7a', mons: ['flam', 'dragon', 'eye'], mats: ['crystal', 'ore'], deco: ['treeDead', 'rockBig'] },
};

// Village stars (DV2 rank): meet every condition to earn the next star. Facility `rank` N needs N-1 stars.
export const RANKS = [
  { title: 'Hamlet' },
  { title: 'Village',        need: { pop: 150, residents: 2, build: 'weapon' } },
  { title: 'Busy Village',   need: { pop: 500, income: 1500, build: 'dojo', quests: 1 } },
  { title: 'Town',           need: { pop: 1200, residents: 5, titles: 1, build: 'smith' } },
  { title: 'Market Town',    need: { pop: 2500, income: 5000, titles: 3, quests: 4 } },
  { title: 'Legendary Town', need: { pop: 5000, residents: 10, titles: 5, boss: 'cyclop' } },
];

export const MUSIC = { town: 'town', town2: 'town2', night: 'night', field: 'field', battle: 'battle', boss: 'boss', cave: 'cave' };
