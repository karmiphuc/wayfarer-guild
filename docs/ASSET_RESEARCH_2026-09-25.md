# Free Pixel-Art Asset Research — 2026-09-25

This document supersedes the assumption that Wayfarer Guild should hand-draw its own core character/monster art during prototyping.

The current `custom-sprites.js` and `readable-sprites.js` are **temporary programmer-art only**. They failed the practical readability/quality bar compared with widely available free asset packs. Do not invest further time polishing those sets unless they are needed as placeholders.

## Decision principle

For this game, art quality is not "more detail". The priority order is:

1. **instant class/species recognition at normal gameplay zoom**;
2. coherent style across many simultaneous units;
3. clear weapons/tools/headgear as silhouette anchors;
4. enough animation for walking/combat/KO;
5. permissive licensing compatible with a public GitHub repo and browser deployment;
6. then palette adaptation and bespoke Wayfarer identity.

A visually strong external pack is preferred over homemade placeholder art.

## Public-repo license rule

Wayfarer is deployed from a public GitHub repository. Browser assets are necessarily downloadable by users.

Preferred:
- CC0 / public domain;
- CC-BY / OGA-BY when attribution is tracked;
- CC-BY-SA only if we deliberately accept share-alike obligations for derivative art.

Avoid:
- "free for commercial use" packs that prohibit redistribution/repackaging;
- "CC0" pages that also add a contradictory no-redistribution restriction;
- NC licenses;
- ripped or extracted commercial game assets.

If a source license is ambiguous, **do not commit it** until the author/license text is clarified.

---

# Tier A — strongest immediate candidates

## 1. Ninja Adventure — Pixel-boy

Source:
https://pixel-boy.itch.io/ninja-adventure-asset-pack

License shown by source:
**CC0 1.0 Universal**

Why this is the strongest first test:
- 50+ animated characters;
- 30+ animated monsters;
- 9 bosses;
- tilesets, items, UI, VFX;
- 100+ SFX and 37 music tracks;
- 16x16 top-down style;
- Godot examples;
- no generative AI disclosed;
- one coherent pack can cover humans + monsters + effects instead of mixing many unrelated styles.

Wayfarer fit:
- strongest candidate to replace **all current pawn sprites**;
- first candidate for common monsters and bosses;
- animation coverage is materially better than current procedural gait;
- compact scale is appropriate for a crowded management game.

Risks / questions for Work-mode inspection:
- exact job archetype coverage: Fighter / Archer / Mage / Cleric / Knight / Ninja / Wizard / Paladin / Farmer / Blacksmith / Researcher;
- whether civilian/tool-bearing characters can cleanly cover worker classes;
- whether its visual tone is sufficiently "cozy management RPG" rather than ninja-heavy;
- whether monster species include boar/wolf/bat/slime/skeleton/goblin equivalents.

**Action: download and build an unlabeled 12-job + 12-monster contact sheet before any integration.**

---

## 2. OpenGameArt — 32x32 RPG Character Sprites by Eldiran

Source:
https://opengameart.org/content/32x32-rpg-character-sprites

License:
**CC0**

Contents:
- 20 distinct 32x32 characters;
- named/tagged archetypes include knight, mage, archer, rogue, assassin, ninja, lancer, dragoon, cleric, monk;
- standing/walking/charging poses;
- some directional coverage is incomplete.

Why it matters:
- much stronger **class silhouette vocabulary** than our current hand-drawn set;
- 32x32 gives more room for hats, shields, bows and robes to remain readable;
- suitable as a direct alternative if Ninja Adventure's classes are too visually similar.

Risks:
- older art and uneven animation completeness;
- may need palette cleanup;
- worker jobs may need kit-bashing from CC0 parts.

**Action: compare its Fighter/Archer/Mage/Cleric/Ninja silhouettes side by side with Ninja Adventure at Wayfarer's actual viewport scale.**

---

## 3. Tiny Creatures — Clint Bellanger

Source:
https://clintbellanger.itch.io/tiny-creatures

License:
**CC0 1.0 Universal**

Contents:
- 180 sprites;
- 100+ monsters;
- 50+ animals;
- 16x16;
- thick outlines;
- specifically designed as an expansion compatible with Kenney Tiny Dungeon / Tiny Town.

Why this is valuable:
- Wayfarer already uses Kenney Tiny Town/Tiny Dungeon;
- enormous species coverage means we should never again map a cyclops-looking sprite to a boar;
- thick outlines and simple silhouettes are appropriate for high-density play.

Best use:
- animal/field monster roster;
- boar, wolf and other natural creatures;
- fallback species where Ninja Adventure lacks an obvious match.

Risk:
- mostly static / limited animation compared with Ninja Adventure.

**Action: use as the primary species-coverage library unless Ninja Adventure provides a better animated equivalent.**

**Integrated in v0.7.3:** the checked-in CC0 tilemap now supplies twelve
distinct runtime monster silhouettes. Keep Ninja Adventure or another coherent
animated pack as a future comparison for attack/hurt animation, not as a reason
to return to programmer-drawn species art.

---

## 4. Tiny Pixel Pack: RPG CHARACTERS — Y.P.C. Studio

Source:
https://ypc-studio.itch.io/tiny-pixel-pack-rpg-characters

License:
**CC0**

Contents:
- 16+ unique RPG characters;
- idle animation;
- distinct poses/designs;
- made in Aseprite;
- no generative AI disclosed.

Why inspect it:
- recent 2026 pack;
- deliberately small readable fantasy characters;
- possible source for distinct worker/specialist classes if Ninja Adventure lacks them.

**Action: treat as a supplementary character source, not the baseline until visual comparison is done.**

---

# Tier A/B — building art candidates

## 5. Pixel Art Isometric Building Assets — Black Coffee Panda

Source:
https://blackcoffeepanda.itch.io/isometric-building-assets

License:
**CC BY 4.0**

Contents:
- 28 unique pixel-art isometric buildings;
- some variations;
- no generative AI disclosed.

Why it is important:
- directly attacks the exact weakness of v0.6.9;
- authored isometric pixel sprites, not canvas geometry;
- public-repo use is allowed under CC-BY as long as attribution/license requirements are met.

**Action: first authored-building candidate. Download, inspect footprint/perspective, then map closest assets to Inn/Tavern/Guild/Forge/Temple/Library/Market/Stable.**

---

## 6. Isometric Medieval Pack — Artyom Zagorskiy

Source:
https://artyom-zagorskiy.itch.io/isometric-medieval-pack

License:
**CC0 1.0 Universal**

Contents:
- 269 isometric tiles;
- houses in multiple colors;
- blacksmith;
- mill;
- crops;
- castle blocks/towers;
- roads, rivers, trees and stones;
- SVG/EPS and spritesheets;
- no generative AI disclosed.

Why it matters:
- extremely safe license;
- broad settlement coverage;
- useful for a coherent town/world even if the style is less "pure pixel" than Black Coffee Panda.

**Action: candidate for town infrastructure/terrain and missing facility types.**

---

## 7. OpenGameArt — Feudal Wars isometric medieval set

Sources:
- Houses: https://opengameart.org/content/western-european-medieval-houses-isometric-25d
- Castle: https://opengameart.org/content/western-european-castle-isometric-25d
- Barracks: https://opengameart.org/content/medieval-barracks-isometric-25d
- Stable: https://opengameart.org/content/isometric-25d-medieval-stable
- broader CC0 isometric collection: https://opengameart.org/content/cc0-isometric

License:
**CC0**

Why keep it in the pool:
- strong architectural silhouettes;
- explicit medieval building types;
- multiple related assets from the same ecosystem;
- source files are available for some pieces.

Risk:
- more rendered/2.5D than hand-pixelled;
- may need downsampling/palette treatment to fit Wayfarer.

**Action: use as a structural fallback/reference if the pixel-specific packs do not cover enough facilities.**

---

# Worth testing, but license handling is special

## 8. Tiny Swords — Pixel Frog

Source:
https://pixelfrog-assets.itch.io/tiny-swords

Important distinction:
- the page currently offers a separate download named **`TS_old version_CC0 Licensed`**;
- the **current Free Pack** uses a custom license allowing personal/commercial use and modification but prohibiting redistribution/repackaging.

Why it is attractive:
- exceptionally readable chunky fantasy units;
- strong Warrior / Lancer / Archer / Monk silhouettes;
- buildings/resources/terrain/UI are available;
- 64x64 grid gives clear class identity;
- no generative AI disclosed.

Repository rule:
- **only the explicitly CC0 old-version download is automatically safe for this public repo**;
- do not commit current Free Pack files under the custom no-redistribution terms unless we obtain explicit permission covering public GitHub/browser exposure.

**Action: Work mode should download and inspect only the file explicitly labeled `TS_old version_CC0 Licensed` first.**

---

# Secondary / specialist options

## 9. Pixel Monsters & Enemies — elesrech

Source:
https://elesrech.itch.io/pixel-monsters-enemies-asset-pack

License:
**CC0**

Contents:
- 20 monsters;
- 16x16 to 32x32;
- walk/fly animation;
- most have idle animation;
- color variants;
- no generative AI disclosed.

Use:
- animated monster supplement if Tiny Creatures is too static.

---

## 10. Debts in the Depths — Reaktori

Source:
https://reaktori.itch.io/debts-in-the-depths-asset-pack

License:
**CC0**

Contents:
- 24 creature sprites with 4-frame walk cycles;
- animated wizard and dragon;
- dungeon tiles/effects/props;
- Aseprite files;
- no generative AI disclosed.

Use:
- dungeon monsters/effects;
- reference for compact animated enemy silhouettes.

---

## 11. Liberated Pixel Cup (LPC)

Useful sources:
- https://lpc.opengameart.org/content/lpc-medieval-fantasy-character-sprites
- https://opengameart.org/content/lpc-character-bases

Licenses vary across assets:
**CC-BY-SA 3.0 / GPL 3.0 / some OGA-BY 3.0**

Strength:
- extremely mature modular character system;
- armor, weapons, bow/thrust/slash/spell animations;
- huge community asset ecosystem.

Why it is not first choice:
- much larger/more realistic sprite proportions than the Kairosoft-like tiny-management target;
- attribution and share-alike bookkeeping is substantially more complex.

Use only if we later decide Wayfarer should move to a larger 64x64 RPG character style.

---

# Reject / hold for this public repository

These may be visually strong, but their normal licenses are poor fits for committing raw browser assets publicly.

## LimeZu Modern Exteriors / Interiors
https://limezu.itch.io/modernexteriors
https://limezu.itch.io/moderninteriors

License permits use/editing in games but prohibits redistribution of the assets. Good art, wrong default license for a public source repo.

## Mystic Woods — Game Endeavor
https://game-endeavor.itch.io/mystic-woods

No-redistribution restriction. Do not commit to the public repo without separate permission.

## Sprout Lands — Cup Nooble
https://cupnooble.itch.io/sprout-lands-asset-pack

Free version is non-commercial; premium version prohibits redistribution. Not a good project baseline.

## "CC0 + no redistribution" pages
Some itch pages label assets CC0 but separately say the pack may not be redistributed. Those terms conflict conceptually with normal CC0 expectations. Treat them as **ambiguous/unsafe** until the creator clarifies.

---

# Recommended Wayfarer asset stack to test first

Do not mix ten packs immediately.

### Character baseline
**Ninja Adventure**

Fallback / comparison:
**OpenGameArt 32x32 RPG Character Sprites**

Potential chunky alternative:
**Tiny Swords — old CC0 version only**

### Monster baseline
**Ninja Adventure monsters** first for animation/style consistency.

Fill missing species with:
**Tiny Creatures**

Optional animated supplements:
**Pixel Monsters & Enemies** / **Debts in the Depths**

### Buildings
First comparison:
1. **Black Coffee Panda isometric buildings** — pixel art / CC-BY 4.0;
2. **Artyom Zagorskiy Isometric Medieval Pack** — CC0;
3. **Feudal Wars CC0 isometric buildings** — structural fallback.

### Terrain / props during migration
Keep existing **Kenney Tiny Town** temporarily. Do not force the current Kenney character sprites to remain once a better character pack is selected.

---

# Work-mode execution plan

## Step 1 — download candidates, do not integrate yet

Download:
1. Ninja Adventure;
2. Tiny Creatures;
3. OpenGameArt 32x32 RPG Character Sprites;
4. Tiny Swords **old CC0** version;
5. Black Coffee Panda isometric buildings;
6. Artyom Zagorskiy Isometric Medieval Pack.

Keep original license/readme files beside each downloaded pack during evaluation.

## Step 2 — generate visual contact sheets

Create one **unlabeled** comparison sheet at the exact game render scale:

### Jobs
- Adventurer
- Fighter
- Archer
- Mage
- Cleric
- Knight
- Ninja
- Wizard
- Paladin
- Blacksmith
- Farmer
- Researcher

Render candidates on:
- plain background;
- actual Wayfarer grass/town background;
- 1x logical pixel scale;
- current normal gameplay zoom.

No class names on the recognition version.

### Monsters
- Slime
- Bat
- Wasp/Bee
- Boar
- Wolf
- Goblin
- Skeleton
- Ogre/Orc
- Cyclops
- Mushroom
- Ghost/Warlock
- Wyrm/Dragon

A boar must look like a boar before reading a label.

## Step 3 — selection criteria

A pack passes only if:
- role/species is readable from silhouette at normal zoom;
- Fighter/Archer/Mage/Cleric are not confusable;
- Farmer/Blacksmith/Researcher have obvious job tools or headgear;
- units still read against grass/buildings/combat FX;
- animation doesn't destroy silhouette;
- palette works under day/night tint;
- license permits public GitHub/browser deployment.

Do not "fix" a fundamentally weak pack with dozens of custom redraws. Pick a better pack.

## Step 4 — integrate one category at a time

Order:
1. pawns;
2. monsters;
3. buildings;
4. terrain/props;
5. UI;
6. animation polish.

Keep old art behind a feature flag/fallback until each category passes visual review.

## Step 5 — delete failed programmer art

After external replacements are approved:
- remove `readable-sprites.js`;
- remove `custom-sprites.js` if no longer needed;
- remove dead Kenney character/monster mappings;
- keep attribution/provenance history in docs.

---

# Non-negotiable visual acceptance test

Before calling a character-art pass "done":

> Hide every pawn name, class label and task marker. At ordinary gameplay zoom, a player must still be able to distinguish the major jobs and monster species from the sprite alone.

If that fails, the art pass fails.

The previous homemade sprite passes fail this test and should not be used as the quality baseline.
