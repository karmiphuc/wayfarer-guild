# Assets — licensing, style, naming, pipeline

The game looks good because it uses ONE coherent pixel-art language. Most rejected attempts in this repo's history
mixed packs (isometric buildings on top-down grass, different outline weights, fractional scaling). Don't.

## 1. What we use (all CC0 — no attribution legally required, we credit anyway)

| Pack | Author | Used for | License file |
|---|---|---|---|
| Ninja Adventure | Pixel-boy & AAA | tiles, buildings, 70+ characters, monsters, bosses, weapons, UI frames, emotes, font, music, SFX | `assets/NINJA_ADVENTURE_CC0_LICENSE.txt` |
| 16x16 RPG Item Pack | Alex's Assets | armor (`a_*`) and accessory (`c_*`) icons | `assets/ALEX_RPG_ITEMS_CC0_LICENSE.txt` |
| Medieval Fantasy (Superpowers packs) | Pixel-boy | fountain, stone basin, knight statue, castle (`tiles/mf_*.png`) | `assets/PIXELBOY_MEDIEVAL_FANTASY_CC0_LICENSE.txt` |
| 16x16 RPG Items (DB32) | ARoachIFoundOnMyPillow | masterwork weapons and additional body armor, helmets and shields | `assets/DB32_RPG_ITEMS_CC0_LICENSE.txt` |

Where the full packs live on the original dev machine (not in the repo): `~/Projects/wayfarer-guild-review/na-full/`
(Ninja Adventure, cloned from github.com/gainax2k1/godot_adventure) and `~/Projects/wayfarer-guild-review/extra/`.
Re-fetch with `git clone --depth 1 --filter=blob:none --sparse <repo>` + `git sparse-checkout set "<folder>"`.

## 2. License rules (hard)

- Allowed: **CC0** (preferred), **CC-BY 3.0/4.0** (add the exact attribution string to `ASSET_ATTRIBUTION.md` and the System → Credits text in `ui.js`).
- Not allowed: CC-BY-SA, any NC ("non-commercial"), "free for personal use", "no redistribution", unknown/unclear licenses,
  anything from Kairosoft games (sprites, music, UI, text) — this is a public repository.
- Verify the license on the PRIMARY source (the author's itch.io/OpenGameArt page or a LICENSE file shipped inside the
  download). A mirror's README is not enough. Copy the license text into `assets/<PACK>_LICENSE.txt`.

## 3. Style check before importing

Make a side-by-side sheet at 4× with a Ninja Adventure reference (e.g. `assets/items/w_Sword.png`, `assets/monsters/Slime.png`):
`uv run --with pillow python3 v2/tools/crop_preview.py <sheet.png> /tmp/out.png "name:col,row,w,h" ...` (16 px grid units).
Accept only if: 16 px scale (characters ~16×16 per frame), top-down 3/4 view, dark 1 px outline, saturated palette,
chibi proportions. Reject: isometric, side-view, coloured outlines, muted palettes, baked backgrounds, 8-direction-only sheets.

## 4. File conventions (the validator enforces most of these)

| Kind | Path | Format |
|---|---|---|
| Character | `assets/chars/<Name>.png` + `<Name>.face.png` | 64×112: 4 columns (down, up, left, right) × 7 rows (0–3 walk, 4 attack, 5 jump, 6 misc); face 38×38 |
| Monster | `assets/monsters/<Spr>.png` + `<Spr>.face.png` | 64×64: 4 columns (dirs) × 4 rows (frames) |
| Farm animal | `assets/monsters/animal_<Name>.png` | 32×16: 2 frames facing left (flipped for right) |
| Boss | `assets/bosses/<Dir>/Idle.png` + `Faceset.png` | one row: `frames` × `fw`, height `fh` |
| Weapon icon | `assets/items/w_<Name>.png` | ≤16×16 |
| In-hand weapon | `assets/items/h_<Name>.png` | blade/head pointing DOWN, handle at the TOP (the top rows are the grip) |
| Bow (hand + icon) | `assets/items/w_<Bow>.png` | horizontal, facing RIGHT |
| Armor / accessory icon | `assets/items/a_<name>.png` / `c_<name>.png` | 16×16 |
| Tileset | `assets/tiles/<Name>.png` | 16 px grid; sprites referenced by pixel rect in `SPR` |
| Music / SFX | `assets/audio/music/<name>.mp3` / `audio/sfx/<Name>.mp3` | MP3 (Safari); music 96 kbps stereo, SFX 64 kbps mono |
| Menu/UI files | `assets/ui/...`, a few `assets/items/*.png` | referenced directly by `index.html` / `style.css` (not atlas) |

Recolour instead of adding art when you only need a stronger version: `tint` (hue degrees) on items, or `tinted(key, deg)` in code.

## 5. Pipeline

1. Copy the file(s) with the naming above.
2. Reference them in code (a `JOBS`/`MONSTERS`/`BOSSES`/`ITEMS` row, an `SPR` rect, or a new entry in `assetList()` in `js/assets.js`).
3. `uv run --with pillow python3 v2/tools/pack_atlas.py` → rebuilds `assets/atlas/`.
4. `node v2/tests/used-assets.mjs` → `missing: 0`. (With `--prune` it DELETES unreferenced files — only when cleaning up.)
5. Add a row to `ASSET_ATTRIBUTION.md` (repo root) and, for new packs, the Credits text in `ui.js` (`panel_system`).
6. `node v2/tests/check.mjs`.

## 6. The atlas

`tools/pack_atlas.py` shelf-packs every sprite from `assetList()` into `assets/atlas/atlas0.png`, `atlas1.png`… (max 1024×2048)
and writes `atlas.json` (`frames["assets/…png"] = [sheet, x, y, w, h]`). `loadAll()` slices each frame onto its own canvas.
Why: ~40 HTTP requests instead of ~400 (faster on iPad), and deploys only need 3 files for all sprites.
The validator fails when the atlas is missing a sprite or a sprite's size changed; it warns when a png is newer than the atlas.

## 7. Finding sprites inside a tileset

- `tools/find_sprites.py <tileset.png> <out.png> <out.json> [minsize]` — boxes every connected sprite and numbers it; the JSON
  gives `[x, y, w, h]` per number. Merged neighbours share one box; then use the 16 px grid instead.
- `tools/crop_preview.py` — render chosen rects side by side at 3× to confirm before adding them to `SPR`.
- `tools/hands_preview.py <Name> ...` (run inside `assets/chars/`) — marks the detected hand pixel on every frame; use it if a
  new character sheet holds weapons in odd places.
