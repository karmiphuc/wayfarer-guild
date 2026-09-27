# Asset Attribution Ledger

This file records every third-party art, music, ambience and sound file actually used by Wayfarer Guild.

**Rule:** do not commit a third-party asset until its row exists here with an explicit source and license.

The project prefers CC0. Attribution is still welcome for CC0 creators, but not legally required unless the source says otherwise.

## Assets in use

### v2 (`/v2/`) — single-pack build

| Repo path | Asset / pack | Creator | Source | License | Modified? | Notes |
|---|---|---|---|---|---|---|
| `v2/assets/**` (tiles, chars, monsters, bosses, items, fx, ui, font) | Ninja Adventure – Asset Pack | Pixel-boy & AAA | https://pixel-boy.itch.io/ninja-adventure-asset-pack (mirror used: github.com/gainax2k1/godot_adventure) | CC0 1.0 (`v2/assets/NINJA_ADVENTURE_CC0_LICENSE.txt`) | Files copied unmodified; cropped at render time | Attribution not required; credited in-game (System → Credits) |
| `v2/assets/fx/fog.png`, `v2/assets/fx/pt_Rain.png` | Ninja Adventure – `FX/Environment/Fog.png`, `FX/Particle/Rain.png` | Pixel-boy & AAA | same | CC0 1.0 | Renamed only (byte-identical) | Mysterious Fog and Rainy Week happenings |
| `v2/assets/audio/music/*.mp3`, `v2/assets/audio/sfx/*.mp3` | Ninja Adventure – music & sounds | Pixel-boy & AAA | same | CC0 1.0 | Transcoded OGG/WAV → MP3 (ffmpeg) for iOS Safari | Tracks: Good Time, Chill, Adventure Begin, Road, The Cave, Fight, Dark Castle, Dream, Lost Village |

| `v2/assets/items/a_*.png`, `v2/assets/items/c_*.png` (26 armor/accessory icons) | 16x16 RPG Item Pack | Alex's Assets | https://alexs-assets.itch.io/16x16-rpg-item-pack (mirror: github.com/series-ai/jam-ready-assets) | CC0 1.0 (`v2/assets/ALEX_RPG_ITEMS_CC0_LICENSE.txt`) | Renamed only | Attribution not required |
| `v2/assets/tiles/mf_*.png` (fountain, basin, knight statue, castle, tower) | Medieval Fantasy (Superpowers asset packs) | Pixel-boy | https://github.com/sparklinlabs/superpowers-asset-packs | CC0 1.0 (`v2/assets/PIXELBOY_MEDIEVAL_FANTASY_CC0_LICENSE.txt`) | Renamed only | Same artist as Ninja Adventure |
| `v2/assets/atlas/*` | Packed copies of the files above | — | built by `v2/tools_pack_atlas.py` | inherits CC0 | Repacked into atlases | — |

### v1 (repo root) — legacy build

The v0.5 pixel preview now uses two CC0 Kenney atlases in the live renderer.

| Repo path | Asset / pack | Creator | Source | License | Modified? | Required attribution / notes |
|---|---|---|---|---|---|---|
| `assets/art/kenney-tiny-town.png` | Tiny Town | Kenney | https://kenney.nl/assets/tiny-town | CC0 1.0 | No source-pixel edits; cropped/scaled at render time | Attribution not required; credit retained here |
| `assets/art/kenney-tiny-dungeon.png` | Tiny Dungeon | Kenney | https://kenney.nl/assets/tiny-dungeon | CC0 1.0 | No source-pixel edits; cropped/scaled at render time | Attribution not required; credit retained here |
| `assets/art/puny-characters/Slime.png` | Puny Characters | Shade | https://opengameart.org/content/puny-characters | CC0 1.0 | Retained for future animated-slime evaluation; not sampled by the renderer | Attribution not required; credit and local license retained here |
| `assets/art/tiny-creatures/tilemap.png` | Tiny Creatures | Clint Bellanger | https://opengameart.org/node/160872 | CC0 1.0 | Species tiles cropped and nearest-neighbor scaled at render time | Attribution not required; credit and original license retained here |
| `assets/art/eldiran/RPGCharacterSprites32x32.png` | 32x32 RPG Character Sprites | Eldiran | https://opengameart.org/content/32x32-rpg-character-sprites | CC0 1.0 | Front walk frames (cols 0-2) of per-job rows sampled at runtime; charge/weapon-icon columns never sampled | All 12 jobs: Adv r9, Fighter r16, Archer r3, Mage r10, Cleric r6, Knight r4, Ninja r8, Wizard r5, Paladin r17, Farmer r2, Blacksmith r18, Researcher r12 |
| `assets/art/db32/*.png` (26 files) | 16x16 RPG Items DB32 | Ragnar Random | https://opengameart.org/content/16x16-rpg-items-db32 | CC0 1.0 | Individual 16px sprites drawn rotated at weapon hands, shields/books on pawns, all stash/loadout icons | 31 mapped bases, see ITEM_SPRITES |
| `assets/art/citysim/*.png` (11 files) | Isometric Medieval City Sim Assets | sketchylogic | https://opengameart.org/content/isometric-medieval-city-sim-assets | CC-BY 4.0 | White edge backgrounds keyed transparent at load; fitted into the existing facility sprite cache, footprints unchanged | Inn, Tavern, House, Guild=castle, Temple=chapel, Market=tailor, WeaponShop=villa, Training=watchtower, Farm=thatched, Library=clock, Stable=treehouse; Forge fire + Storehouse crates stay procedural |

No third-party audio is shipped yet: all game audio is procedural WebAudio
(generative loops, ambient beds, oscillator SFX — see issue #3). The audio
candidate rows below remain unauditioned.

## Candidate sources under evaluation

These are **not** “in use” until copied into the repo and moved to the table above.

| Candidate | Type | License shown by source | URL | Notes |
|---|---|---|---|---|
| Kenney RPG Base | 2D RPG art | CC0 | https://kenney.nl/assets/rpg-base | Strong baseline for tiles/props |
| Kenney Medieval RTS | 2D medieval art | CC0 | https://kenney.nl/assets/medieval-rts | Buildings/settlement reference |
| Kenney Pixel Pack | pixel art | CC0 | https://kenney.nl/assets/pixel-pack | General-purpose pieces |
| Kenney UI Pack (RPG Expansion) | UI | CC0 | https://kenney.nl/assets/ui-pack-rpg-expansion | Pixel/UI foundation candidate |
| Tiny RPG - Forest | top-down 16×16 art | CC0 on visual submission | https://opengameart.org/content/tiny-rpg-forest | Verify individual files before import |
| Kenney RPG Audio | SFX | CC0 | https://kenney.nl/assets/rpg-audio | RPG action/foley |
| Kenney UI Audio | SFX | CC0 | https://kenney.nl/assets/ui-audio | UI feedback |
| Kenney Interface Sounds | SFX | CC0 | https://kenney.nl/assets/interface-sounds | Additional UI vocabulary |
| Medieval: The Bard's Tale | music | CC0 | https://opengameart.org/content/medieval-the-bards-tale | Town/tavern candidate |
| Fairy Adventure | music | CC0 | https://opengameart.org/content/fairy-adventure | Frontier candidate |
| JRPG - End Dungeon | music | CC0 | https://opengameart.org/content/jrpg-end-dungeon | Dungeon candidate |
| Chiptune Battle Music | music | CC0 | https://opengameart.org/content/chiptune-battle-music | Battle candidate |
| A Small Fire Will Do | music | CC0 | https://opengameart.org/content/a-small-fire-will-do-calming-loop | Camp/home candidate |
| Ninja Adventure | characters / monsters / tiles / VFX / audio | CC0 1.0 | https://pixel-boy.itch.io/ninja-adventure-asset-pack | **Primary character+monster candidate**; 50+ characters, 30+ monsters, 9 bosses; inspect before import |
| 32x32 RPG Character Sprites | character classes | CC0 | https://opengameart.org/content/32x32-rpg-character-sprites | 20 distinct RPG characters; strong class-readability comparison |
| Tiny Creatures | monsters / animals | CC0 1.0 | https://clintbellanger.itch.io/tiny-creatures | 180 sprites; 100+ monsters, 50+ animals; Kenney Tiny-compatible |
| Tiny Pixel Pack: RPG CHARACTERS | characters | CC0 | https://ypc-studio.itch.io/tiny-pixel-pack-rpg-characters | 16+ recent tiny RPG characters; supplementary candidate |
| Pixel Monsters & Enemies | monsters | CC0 | https://elesrech.itch.io/pixel-monsters-enemies-asset-pack | 20 animated 16x16–32x32 monsters |
| Debts in the Depths | monsters / dungeon / VFX | CC0 | https://reaktori.itch.io/debts-in-the-depths-asset-pack | 24 animated creatures plus wizard/dragon/dungeon effects |
| Pixel Art Isometric Building Assets | buildings | CC BY 4.0 | https://blackcoffeepanda.itch.io/isometric-building-assets | **Primary authored-building candidate**; 28 isometric pixel buildings; attribution required |
| Isometric Medieval Pack | buildings / roads / terrain | CC0 1.0 | https://artyom-zagorskiy.itch.io/isometric-medieval-pack | 269 isometric tiles incl. houses, blacksmith, mill, crops, castle |
| Feudal Wars medieval isometric set | buildings | CC0 | https://opengameart.org/content/cc0-isometric | Houses/castle/barracks/stable/guards; structural fallback |
| Tiny Swords — old version only | characters / buildings / UI | separate download explicitly labeled CC0 | https://pixelfrog-assets.itch.io/tiny-swords | **Only evaluate `TS_old version_CC0 Licensed`**; current Free Pack has no-redistribution terms |


## Attribution template

For CC-BY / OGA-BY assets, store something like:

```
"Asset title" by Creator Name
Source: https://...
License: CC BY 4.0
Changes: recolored, cropped, resampled
```

Keep this ledger useful even if Wayfarer remains a personal project. Clean provenance means we can safely keep improving and sharing the build later.

| `assets/art/custom-sprites.js` | Wayfarer job + monster sprite set | Original project artwork generated for Wayfarer Guild, then manually mapped/quantized for the game | This project | Original project asset | Yes — reduced to a compact 24×24 indexed-pixel representation | No third-party attribution required |

| `assets/art/readable-sprites.js` | Readability-first job + monster sprite set | Original project pixel artwork drawn in code for Wayfarer Guild | This project | Original project asset | Yes — 24×24 source sprites with nearest-neighbor scaling | No third-party attribution required |
