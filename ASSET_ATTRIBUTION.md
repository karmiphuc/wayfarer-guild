# Asset Attribution Ledger

This file records every third-party art, music, ambience and sound file actually used by Wayfarer Guild.

**Rule:** do not commit a third-party asset until its row exists here with an explicit source and license.

The project prefers CC0. Attribution is still welcome for CC0 creators, but not legally required unless the source says otherwise.

## Assets in use

The v0.5 pixel preview now uses two CC0 Kenney atlases in the live renderer.

| Repo path | Asset / pack | Creator | Source | License | Modified? | Required attribution / notes |
|---|---|---|---|---|---|---|
| `assets/art/kenney-tiny-town.png` | Tiny Town | Kenney | https://kenney.nl/assets/tiny-town | CC0 1.0 | No source-pixel edits; cropped/scaled at render time | Attribution not required; credit retained here |
| `assets/art/kenney-tiny-dungeon.png` | Tiny Dungeon | Kenney | https://kenney.nl/assets/tiny-dungeon | CC0 1.0 | No source-pixel edits; cropped/scaled at render time | Attribution not required; credit retained here |

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

## Attribution template

For CC-BY / OGA-BY assets, store something like:

```
"Asset title" by Creator Name
Source: https://...
License: CC BY 4.0
Changes: recolored, cropped, resampled
```

Keep this ledger useful even if Wayfarer remains a personal project. Clean provenance means we can safely keep improving and sharing the build later.
