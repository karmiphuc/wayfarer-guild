# Asset & Audio Plan

The goal is a cohesive, charming pixel game — not a collage of whatever free files happen to exist.

## License policy

Preferred order:

1. **CC0 / public domain** — default.
2. **CC-BY / OGA-BY** — acceptable when attribution is recorded.
3. Other permissive licenses — only after reading the actual terms and recording them.
4. **CC-BY-NC** — do not use. Keep future distribution/commercial options open.
5. No-license / “free download” only — do not use.
6. Ripped/extracted assets from commercial games — never use.

Every adopted asset must be logged in `../ASSET_ATTRIBUTION.md`.

### Public GitHub Pages warning
This repository and deployed web build are public. Do not commit source audio/art whose license forbids redistribution of the raw asset.

## Visual direction

Target:
- top-down fantasy;
- cute/chibi rather than realistic;
- dense but readable;
- warm town colors;
- darker/cooler dungeon palettes;
- satisfying micro-animation;
- original Wayfarer identity.

Recommended logical art grid:
- **16×16 tile base**;
- characters roughly 16×24 or 24×24;
- render at integer 2× / 3× scaling with nearest-neighbor filtering;
- multi-tile buildings;
- keep gameplay hitboxes separate from sprite dimensions.

Why: it gives the dense “tiny people doing lots of things” feel while scaling cleanly on desktop and iPad.

## Preferred free art sources

### Kenney — first stop
Kenney states that game assets on its asset pages are CC0 and attribution is not required.

Useful starting packs:
- RPG Base — 2D RPG tiles/assets, CC0  
  https://kenney.nl/assets/rpg-base
- Medieval RTS — 2D medieval buildings/tilemap, CC0  
  https://kenney.nl/assets/medieval-rts
- Pixel Pack — general pixel assets, CC0  
  https://kenney.nl/assets/pixel-pack
- UI Pack (RPG Expansion) — interface pieces, CC0  
  https://kenney.nl/assets/ui-pack-rpg-expansion

These should be treated as **raw material**, not necessarily pasted unchanged. Recolor and adapt permissive assets into one palette/style.

### OpenGameArt
Use as a curated secondary source. Prefer CC0.

Interesting reference:
- Tiny RPG - Forest — 16×16 top-down RPG pixel art, page marks visual assets CC0  
  https://opengameart.org/content/tiny-rpg-forest

Important: one submission page can contain components with different attribution notes. Verify each actual file used.

### itch.io
Useful discovery source:
https://itch.io/game-assets/free/tag-pixel-art

Rule: inspect the individual pack/license. “Free” is a price, not a license.

## Music direction

Music should support long management sessions rather than constantly demand attention.

Desired palette:
- cheerful/folky town theme;
- quieter night/home variant;
- curious exploration/frontier loop;
- moody dungeon loop;
- energetic boss loop;
- short rank-up / discovery stingers.

Prefer OGG for browser delivery.

CC0 music candidates to audition:
- Medieval: The Bard's Tale — calm medieval/village/tavern loop  
  https://opengameart.org/content/medieval-the-bards-tale
- Fairy Adventure — loopable fantasy field music  
  https://opengameart.org/content/fairy-adventure
- JRPG - End Dungeon — loopable dungeon theme  
  https://opengameart.org/content/jrpg-end-dungeon
- Chiptune Battle Music — CC0 loopable battle track  
  https://opengameart.org/content/chiptune-battle-music
- A Small Fire Will Do — calming camp/home loop  
  https://opengameart.org/content/a-small-fire-will-do-calming-loop

These are candidates, not automatically approved. Listen for stylistic cohesion before importing.

## SFX direction

SFX should be short, readable and restrained. The game has many simultaneous agents; over-audible footsteps/attacks would become noise.

Priority vocabulary:
- UI hover/select/confirm/cancel;
- construction/upgrade;
- coin/shop;
- item pickup/chest;
- job level/mastery;
- sword/bow/magic/heal;
- KO/rescue;
- monster hit/death;
- boss alert;
- egg hatch/companion;
- town rank/event.

### Kenney audio
Strong default:
- RPG Audio — 50 files, CC0  
  https://kenney.nl/assets/rpg-audio
- UI Audio — 50 files, CC0  
  https://kenney.nl/assets/ui-audio
- Interface Sounds — 100 files, CC0  
  https://kenney.nl/assets/interface-sounds

### Freesound
Useful for missing niche sounds. Freesound hosts CC0, CC-BY and CC-BY-NC files.

Policy:
- CC0 preferred;
- CC-BY allowed with exact attribution;
- CC-BY-NC excluded;
- record the exact sound URL, creator and license at import time.

https://freesound.org/

### Sonniss GDC bundles
The bundles are useful professionally and their current license permits use/modification in games without attribution, but prohibits redistribution of the sound effects as sound effects.

Because this project is a **public web repository**, do not use Sonniss as the default source without a deliberate packaging/license review.

## Audio architecture

Implement three buses:
- Music
- Ambience
- SFX

Player settings:
- master mute;
- independent sliders;
- persist in localStorage.

Behavior:
- do not restart music on ordinary UI changes;
- crossfade town ↔ dungeon;
- duck music slightly for boss/rank-up stingers;
- spatial/volume limits for repeated pawn actions;
- throttle repetitive combat sounds;
- only nearby/selected pawn micro-SFX should be prominent.

## Proposed asset folder structure

```
wayfarer-guild/
  assets/
    art/
      terrain/
      buildings/
      pawns/
      monsters/
      items/
      ui/
      vfx/
    audio/
      music/
      ambience/
      sfx/
  ASSET_ATTRIBUTION.md
```

## Import checklist

Before adding any third-party file:

- [ ] source URL recorded
- [ ] creator recorded
- [ ] explicit license verified
- [ ] license compatible with public repo/web deployment
- [ ] attribution text captured if required
- [ ] filename normalized
- [ ] visual/audio style fits the project
- [ ] asset optimized for web
- [ ] entry added to `ASSET_ATTRIBUTION.md`

Do not let the project become dependent on an asset whose provenance we cannot explain later.
