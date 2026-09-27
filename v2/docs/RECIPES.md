# Recipes — copy these exactly

Every recipe ends with the same verification. Do not skip it.

```
node v2/tests/check.mjs          # must print: all checks passed
python3 v2/tools/serve.py 8766 . # then open http://localhost:8766/v2/?new and look at your change
```

If a recipe adds or changes a PNG, also run `uv run --with pillow python3 v2/tools/pack_atlas.py` before the check.

Contents: [Class](#1-add-a-class-job) · [Perk effect](#2-add-a-new-perk-effect-new-mechanic) · [Weapon](#3-add-a-weapon) ·
[Armor/accessory](#4-add-armor-or-an-accessory) · [Monster](#5-add-a-monster) · [Boss](#6-add-a-boss) ·
[Facility](#7-add-a-facility-building) · [Decor](#8-add-decor) · [Title](#9-add-a-town-title) · [Event](#10-add-a-town-event) ·
[Saved field](#11-add-a-field-to-the-save) · [Sound](#12-add-music-or-a-sound-effect) · [UI action](#13-add-a-ui-button--action) ·
[Balance](#14-balance-change-workflow) · [New art pack](#15-add-art-from-a-new-pack) · [Happening](#16-add-a-happening-weekly-random-event) ·
[Charter](#17-add-a-village-charter)

---

## 1. Add a class (job)

1. Pick a character sheet: run `node v2/tests/free-sprites.mjs` — it lists sheets in `v2/assets/chars/` that no job uses yet,
   with their size. **Only 64×112 sheets work for jobs** (4 directions × 7 rows); 64×32 sheets like `Child`/`OldWoman` are
   townsfolk-only (the validator rejects them). Reusing a sheet another job already uses is allowed but looks samey.
   To import a new one from the Ninja Adventure pack, copy `Actor/Characters/<Name>/SpriteSheet.png` → `assets/chars/<Name>.png`
   and `Faceset.png` → `assets/chars/<Name>.face.png` (some packs name it `Faceset1.png`).
2. Add a perk to `PERKS` in `js/jobs.js` using ONLY existing keys (list in [ARCHITECTURE.md §5](ARCHITECTURE.md#5-perks-mastery--how-effects-are-wired)):
   ```js
   frostbite:   { name: 'Frostbite',      desc: '+10% critical chance.', crit: 0.10 },
   ```
   **The `desc` must describe exactly what the keys do — nothing more.** "Slows foes" with only a `crit` key is a lie the
   player will notice. A new effect needs a new key (recipe 2).
3. Add the job to `JOBS` in `js/jobs.js` (all fields are required; the validator checks them):
   ```js
   iceMage: { name: 'Ice Mage', tier: 2, sprites: ['NinjaEskimo'], hp: 28, atk: 4, def: 3, mag: 12, spd: 1.0, range: 3,
     weapon: 'MagicWand', wt: ['staff', 'book'], perk: 'frostbite', req: ['mage'], desc: 'Freezes the battlefield.' },
   ```
   Rules: `tier` 1–4 · tier ≥ 2 needs `req` · tier ≥ 3 needs at least one tier-2+ `req` · each `req` must be a LOWER tier ·
   `wt` only weapon types that exist in `items.js` · `weapon` = default in-hand sprite name (`h_<weapon>.png` must exist) ·
   one unique perk per job · magic jobs have `mag > atk` (they cast fireballs) · healers add `heal: true`.
   Stat guide (base values): tier 1 ≈ hp 22–38, main stat 7–9 · tier 2 ≈ hp 26–46, main 10–13 · tier 3 ≈ hp 34–50, main 12–18 ·
   tier 4 ≈ hp 46–72, main 18–22.
4. Optional: let visitors arrive with it — add the id to a list in `VISITOR_JOBS` (index = village stars / 1.5).
5. Verify. In game: System panel is not needed — open a resident's inspector → **Change job** → your class appears in the right tier.

## 2. Add a new perk effect (new mechanic)

Only when no existing key fits.
1. Choose a camelCase key, e.g. `thorns` (reflect % of damage taken).
2. Use it in a perk in `PERKS`: `thornskin: { name: 'Thorn Skin', desc: 'Reflects 20% of damage taken.', thorns: 0.2 },`
3. Read it in `js/sim.js` where the effect happens, always via `perkSum(adventurer, 'thorns')`. Example in `hurtAdv()`:
   ```js
   const th = perkSum(a, 'thorns');
   if (th && src && src.hp > 0) this.hitMonster(src, Math.max(1, Math.round(dmg * th)), a);
   ```
4. Add `'thorns'` to `KNOWN_PERK_KEYS` in `tests/validate.mjs`.
5. Add a row to the perk table in `docs/ARCHITECTURE.md §5`.
6. Verify (the validator fails if the key is declared but never read).

## 3. Add a weapon

1. In-hand sprite: `assets/items/h_<Name>.png` (blade/head pointing DOWN, handle at the TOP). Icon: `assets/items/w_<Name>.png`.
   Bows: only `w_<Name>.png`, horizontal, facing right, and set the last `W()` argument `bow = true`.
   Recolour an existing weapon instead of new art: reuse its `hand` and give a `tint` (hue degrees, e.g. `-40` red, `45` gold,
   `90` green, `180` cyan, `250` purple).
2. Add a line to `ITEMS` in `js/items.js` with the `W()` helper:
   ```js
   frostBrand:  W('Frost Brand', 'sword', 'Sword2', { atk: 16, mag: 4 }, 1300, { ore: 12, crystal: 5 }, 180),
   //             name           type     hand      stats                price  develop cost          tint
   ```
   `type` must be one some job lists in `wt` (`sword axe club hammer spear trident bow staff book dagger katana rapier whip fist bone`).
   Price/stat curve (main stat): 60G→3 · 160G→6 · 400G→9 · 700G→13 · 1300G→17 · 2500G→22 · 4000G→30 · 5500G→36.
   `dev` = materials to develop at the Blacksmith (`wood hide herb ore crystal`); `null` = sold from the start.
3. Verify. In game: Develop panel → Weapons tab shows it with the tinted icon; after developing, an adventurer of a
   matching class buys and holds it.

## 4. Add armor or an accessory

1. Icon in `assets/items/` (16×16): armor files are named `a_<name>.png`, accessories `c_<name>.png`.
2. Add to `ITEMS` in `js/items.js`:
   ```js
   frostMail:   { name: 'Frost Mail', slot: 'armor', icon: 'a_plate', def: 18, hp: 15, price: 2000, dev: { ore: 16, crystal: 6 } },
   frostHelm:   { name: 'Frost Helm', slot: 'offhand', icon: 'a_helm', def: 12, price: 1500, dev: { ore: 12, crystal: 4 } },
   windCharm:   { name: 'Wind Charm', slot: 'acc',   icon: 'c_charm', spd: 0.12, crit: 0.02, price: 900, dev: { herb: 8 } },
   ```
   Allowed stat keys: `atk def mag hp` (flat), `crit` (0.05 = +5%), `spd` (0.1 = +10% move speed), `heal` (consumables only).
   Body armor (`armor`) and the shared helm/shield slot (`offhand`) are sold by the Armor Shop;
   accessories by the Armor Shop and the Item Shop (`SHOP_SLOTS`). Each slot contributes its stats independently.
3. Verify.

## 5. Add a monster

1. Sheet `assets/monsters/<Spr>.png` must be 64×64 (4 columns = down, up, left, right; 4 rows = frames) plus
   `assets/monsters/<Spr>.face.png`. Ninja Adventure: `Actor/Monsters/<Name>/SpriteSheet.png` (or `<Name>.png`) + `Faceset.png`.
   Every sheet already in `assets/monsters/` is used (`node v2/tests/free-sprites.mjs` lists spares) — so copy a new one from
   the Ninja Adventure pack first (see [ASSETS.md](ASSETS.md)). The `Spirit2` in the example below must be copied too.
2. Add to `MONSTERS` in `js/data.js`:
   ```js
   frostImp: { name: 'Frost Imp', spr: 'Spirit2', hp: 48, atk: 14, def: 5, spd: 1.1, xp: 22, gold: 22, drops: { crystal: 0.2 } },
   ```
   Zone guide: zone 1 hp 11–20 atk 3–6 · zone 2 hp 22–40 atk 7–10 · zone 3 hp 38–62 atk 10–17 · zone 4 hp 50–120 atk 17–27.
   `xp ≈ gold ≈ hp / 2`. `drops` = chance per kill for each material.
3. Make it spawn: add the id to the right zone in `ZONE_MONS` in `js/data.js`. Each world keeps only `ROSTER_SIZE[zone]`
   species per zone (seeded, `js/happenings.js`), so a new monster lives in some worlds, not all. To test it, force it:
   `__game.sim.spawnMonster(3, 'frostImp')` in the browser console.
4. Run `pack_atlas.py`, then verify.

**Outlaw (human enemy) variant** — a monster row with `human: true` uses a CHARACTER sheet instead of a monster sheet:
```js
duelist: { name: 'Duelist', spr: 'NinjaGray', human: true, weapon: 'Rapier', hp: 70, atk: 20, def: 8, spd: 1.1, xp: 32, gold: 45, drops: { ore: 0.3 } },
```
`spr` = `assets/chars/<Spr>.png` (64×112, needs the attack row) + `.face.png`; `weapon` = an `assets/items/h_<Weapon>.png` in-hand
sprite. Add `raidOnly: true` if it should only appear in raids (then keep it OUT of `ZONE_MONS`). To join the Bandit Raid gang,
add its id to the `gang` lists in `startHappening('bandits')` in `sim.js`. Outlaws can't be tamed and are never Elites.

## 6. Add a boss

1. Files: `assets/bosses/<Dir>/Idle.png` (one row of frames) and `assets/bosses/<Dir>/Faceset.png`.
   Frame size: usually `fh = image height`, `frames = image width / fw`. The validator checks `fw × frames = width`.
2. Add to `BOSSES` in `js/data.js`, **keeping the object ordered by `rec`**:
   ```js
   frostKing: { name: 'Frost King', dir: 'GiantSpirit', idle: 'Idle.png', fw: 50, fh: 50, frames: 5,
     hp: 2500, atk: 58, def: 21, rec: 15, star: 3, zone: 3, xp: 480, gold: 1900, drops: { crystal: 9 } },
   ```
   `rec` = suggested party level (shown in the UI) · `star` = village stars needed before the quest appears · `zone` = where it spawns.
   Curve: rec 3 → hp 300 atk 13 · rec 10 → 1300/38 · rec 14 → 2200/55 · rec 19 → 3400/72 · rec 23 → 4200/78.
3. Run `node v2/tests/bossprobe.mjs` — your boss's "min party Lv" should be within ±2 of `rec`. Adjust hp/atk/def.
4. If it is part of the main ladder (star ≤ 4), add it to `expect` in `tests/check.mjs` and run `check.mjs --full`.

## 7. Add a facility (building)

1. Find the sprite rectangle. Buildings come from `assets/tiles/House.png` (plus Towers/Element/Nature).
   Run `uv run --with pillow python3 v2/tools/find_sprites.py v2/assets/tiles/House.png /tmp/house.png /tmp/house.json`
   and open `/tmp/house.png`: every sprite has a red box and a number; `/tmp/house.json` holds `[x, y, w, h]` per number.
   Top-row buildings are exact 16 px grid rects (e.g. `H(0, 0, 64, 48)`).
2. Add the sprite to `SPR` in `js/data.js`: `bathhouse: H(385, 226, 78, 78),` (example rect; `H` = House.png, `N` = Nature.png, `E` = Element.png;
   other sheets: `{ img: 'towers', x, y, w, h }` where `img` is a key loaded in `assetList()`).
3. Add the facility to `FAC` in `js/data.js`:
   ```js
   bath: { name: 'Public Bath', spr: 'bathhouse', fp: [5, 3], cat: 'training', cost: 2000, kind: 'heal', price: 20, rank: 3, appeal: 7,
           desc: 'Soak away the aches. Restores HP and mood.' },
   ```
   `fp` = footprint in tiles (the sprite bottom sits on the footprint bottom; roofs may overhang upward) ·
   `cat` = Build-menu tab (`lodging food shop training defense special`) · `rank` N = needs N-1 stars ·
   `kind` must be one the sim handles: `sleep home food shop train heal craft defense stable guild`.
   Kind-specific fields: food `fill` (hunger removed) and optional `fun`; sleep/home `cap`; shop `slot`; defense `dmg, range`.
4. Add its traits to `FAC_TRAITS`: `bath: { Rest: 6, Culture: 2 },` (names from `TRAIT_NAMES`).
5. A NEW `kind` needs sim work: a score in `decide()`, handling in `settleVisit()`, and the kind added to `KINDS` in `tests/validate.mjs`.
6. Verify: Build menu → tab → place it → adventurers visit (coins pop above the door).

## 8. Add decor

1. Sprite in `SPR` (see recipe 7 step 1–2).
2. Add to `DECOR` in `js/data.js`: `lanternPost: { name: 'Lantern Post', cost: 80, fp: [1, 1], spr: ['lamp'], appeal: 2, r: 3 },`
   (`spr` is an array: variants are picked by position; `appeal` is added to facilities within `r` tiles).
3. Add traits to `FAC_TRAITS`. Verify.

## 9. Add a town title

Add to `TITLES` in `js/data.js`:
```js
{ id: 'frost', name: 'Winter Haven', need: { Rest: 25, Nature: 15 }, bonus: { heal: 0.2 }, pop: 150, gold: 900, desc: 'Healing +20%' },
```
`need` uses `TRAIT_NAMES`. `bonus` keys already read: `visitors xp foodSales shopSales joy heal tame defense` (sim.js, via `this.bonus(key)`)
and the stat keys `hp atk def mag` (state.js `stat()`, via `titleBonus(s, key)`).
A new bonus key must be read somewhere via `this.bonus('<key>')`.

## 10. Add a town event

Timed effect: add `{ id: 'hotpot', name: 'Hot Pot Night', tp: 20, desc: '...', weeks: 1 }` to `EVENTS` in `js/data.js`, then
use `this.eventOn('hotpot')` where the effect applies in `sim.js` (e.g. in `settleVisit`).
Instant effect: no `weeks`; add an `else if (id === 'hotpot') { ... }` branch in `runEvent()` in `sim.js`.
The validator requires the literal `'hotpot'` somewhere in `sim.js` for every instant event (issue #34 replaces this with
data-driven `effect.type`s — follow that issue if it has landed).

## 11. Add a field to the save

1. Give it a default where the object is created (`newGame()` or `makeAdventurer()` in `state.js`).
2. In `migrate()` (state.js) fill it for old saves: `for (const a of s.advs) a.medals = a.medals || 0;`
3. `migrate()` runs on EVERY load, including brand-new saves. Any transform must do nothing on a save that is already in
   the new shape: guard on the OLD field being present, e.g.
   `if (a.base.hp !== undefined) { a.base.hth = a.base.hp; delete a.base.hp; }` — never on `s.schema` alone.
4. Test the round trip: `check.mjs` already saves → reloads → migrates → simulates. For a shape change, also load an old save
   (export one from the live game before your change) through `migrate()` and simulate 200 steps.

## 12. Add music or a sound effect

1. Convert to MP3 (Safari/iPad): `ffmpeg -i in.ogg -ac 2 -b:a 96k v2/assets/audio/music/<name>.mp3` (SFX: `-ac 1 -b:a 64k` into `audio/sfx/`).
2. SFX: add `myKey: 'FileName'` to `SFX` in `js/audio.js`, play with `this.emit('sfx', 'myKey')` in sim or `game.audio.sfx('myKey')` in UI.
   Music: call `game.audio.music('<name>')` (see the music choice at the end of `frame()` in `main.js`).
3. Record the source in `ASSET_ATTRIBUTION.md`. Verify.

## 13. Add a UI button / action

1. In the panel/inspector HTML: `<button class="btn sm" data-act="myAction" data-id="${a.id}">Do it</button>`
2. In `act(a, d)` in `ui.js` add: `case 'myAction': err(sim.myAction(+d.id)); this.renderPanel(); break;`
   (`err()` shows the error toast or plays the accept sound).
3. The real work goes in a `Sim` method that returns `null` or an error string.

## 14. Balance change workflow

1. Change numbers in the tables.
2. `node v2/tests/bot.mjs 30 1` — a greedy bot plays 30 months and prints one line per month (stars, gold, residents, levels…).
3. `node v2/tests/bossprobe.mjs` — minimum party level per boss.
4. `node v2/tests/check.mjs --full` — must pass. If you changed the curve on purpose, update `expect` in `check.mjs`
   and the "Balance gates" line in `AGENTS.md`.

## 15. Add art from a new pack

Read [ASSETS.md](ASSETS.md) first: license rules, style check, naming, atlas, attribution. Short version:
verify CC0/CC-BY from the primary source → compare side-by-side with a Ninja Adventure sprite → copy with the naming
convention → reference it in code → `pack_atlas.py` → attribution row → `check.mjs`.

## 16. Add a happening (weekly random event)

Happenings are rolled by the sim each week (not bought with TP like events). Data in `js/happenings.js`, logic in `sim.js`.
1. Add a row to `HAPPENINGS`:
   ```js
   { id: 'festivalFood', icon: 'i_Beaf', short: 'Food Fair', name: 'Food Fair', weight: 6, weeks: 1, minStars: 1,
     desc: 'Food stalls earn 30% more this week.' },
   ```
   `icon` = an image key from `assetList()` (`i_<item icon>`, `e<emote>`, `m_<monster sheet>`, `pt_<particle>`) ·
   `weight` = relative chance · `minStars` = earliest rank · `desc` must describe exactly what your code does.
2. In `startHappening(id)` in `sim.js` add a `case 'festivalFood':` — for a passive effect just `break;` (add it to the
   `case 'rain': case 'sunny': …` line) and read it where it applies: `if (this.happening('festivalFood')) paid *= 1.3;`.
   Spawns go in `h.data` (`h.data.mobs = [ids]`) so `endHappening` can clean them up.
3. Rewards, penalties and clean-up go in `endHappening(h)` (`case 'festivalFood':`). Anything you spawned must be removed there.
4. Run `node v2/tests/happenings.mjs` — every happening is forced once; yours must print `ok` and must not stay active.
   Then play: `__game.sim.startHappening('festivalFood')` in the browser console.

## 17. Add a village charter

1. Add a row to `CHARTERS` in `js/happenings.js`:
   ```js
   { id: 'river', name: 'River Crossing', icon: 'i_TeaLeaf', up: 'Food shops +15% sales · starts with a Bakery',
     down: 'Monsters +20%', mods: { foodSales: 0.15, monsterPop: 0.2 }, start: { build: ['bakery'] } },
   ```
2. `mods` keys must be known (list and where each is read: ARCHITECTURE §4b). A NEW key (like `foodSales` above) needs:
   read it in `sim.js` with `this.charter('foodSales')` where it applies, and add it to `KNOWN_CHARTER_KEYS` in
   `tests/validate.mjs`. `start`: `gold` (+/-), `build: [FAC types]`, `decor: [DECOR types]`, `adv: '<job id>'`.
3. `up`/`down` must describe exactly what the mods and start do. Keep each charter a real trade-off.
4. `node v2/tests/happenings.mjs` signs every charter once; then `node v2/tests/check.mjs --full` (charters change balance).
