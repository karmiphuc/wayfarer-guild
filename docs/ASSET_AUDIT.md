# Runtime asset audit

Updated: 2026-09-25

## Scope and evidence

This audit covers every image currently loaded by `index.html`, the runtime tile
lookups that select art from those images, and the public-repository license
record. It does not evaluate planned or candidate assets that are not shipped.

The game uses two 192 x 192 Kenney atlases with a 16 x 16 tile grid:

- `assets/art/kenney-tiny-town.png` for terrain, vegetation and buildings;
- `assets/art/kenney-tiny-dungeon.png` for fallback actors, props and items.

The v0.7.2 character pass additionally uses selected sheets from Shade's
`Puny Characters` pack:

- nine 768 x 256 job sheets built from 32 x 32 animation cells;
- one 480 x 32 slime animation sheet;
- CC0 provenance is recorded both beside the files and in
  `ASSET_ATTRIBUTION.md`.

All imported files are recorded in `ASSET_ATTRIBUTION.md` as CC0 assets. The
official Tiny Dungeon source pack was used to inspect the corresponding
individual tiles. It confirms that atlas tiles 84-88 and 96-100 are humanoids,
while tiles 89-92 are containers or cage props.

## 2026-09-25 rendered audit

The synchronized v0.7.1 GitHub Pages build was captured at desktop scale before
this import. The new code-drawn characters were recognizably humanoid and fixed
the moving-container failures, but remained tiny, static-looking, and visually
separate from the smoother facility art. More importantly, their oversized job
tools were baked into each silhouette while the actual equipped weapon and
offhand renderers were no longer called by the pawn renderer.

Correction in v0.7.2:

- Adventurer, Fighter, Archer, Mage, Cleric, Knight, Ninja, Wizard and Paladin
  prefer cohesive CC0 Puny Characters sheets in town and dungeons.
- Movement selects real atlas frames with nearest-neighbor scaling.
- Actual weapon, offhand and armor state is layered around the selected actor
  body again; KO actors suppress carried gear.
- Farmer, Blacksmith, Researcher and unsupported monster species keep the
  readability-first project sprites as explicit fallbacks until a compatible
  licensed sheet is selected.
- Slimes use the matching CC0 animated sheet.

## Findings

### P1 - non-humanoid job sprites

Observed fact:

- Blacksmith used tile 90, a chest/container.
- Farmer used tile 92, a cage/container with a red object inside.
- Both props were drawn through the pawn renderer, so walking bob and name/HP
  overlays made them look like moving chests.

Correction:

- Blacksmith now uses humanoid tile 86.
- Farmer now uses civilian humanoid tile 99.
- A smoke assertion requires every job mapping to stay within the known
  humanoid tile set.

### P1 - Archer role mismatch

Observed fact:

- Archer used tile 87, the horned/Viking-like humanoid.

Correction:

- Archer now uses humanoid tile 98, a lighter generic adventurer.
- The smoke suite explicitly prevents the Archer mapping from returning to 87.

### P2 - limited role identity

Observed fact:

- Tiny Dungeon provides ten humanoid tiles for twelve jobs.
- Several advanced and civilian jobs must therefore share a sprite or use a
  merely approximate visual identity.
- The current atlas has no clearly readable farmer-with-tool, blacksmith-with-
  hammer, or bow-wielding archer pawn.

Recommendation:

- Treat the corrected mappings as a safe stopgap, not a final character set.
- Next asset work should evaluate a coherent CC0 character source, preferably
  Kenney Tiny Farm for civilians plus one compatible fantasy character sheet.
- Import only after recording exact source URLs and licenses, and add a visual
  contact sheet so each job mapping can be reviewed before deployment.
- Do not mix in sprites extracted from Dungeon Village or another commercial
  game.

### P2 - static atlas indexes are fragile

Observed fact:

- Runtime art is selected by unexplained numeric constants.
- A valid tile number can render successfully while representing the wrong
  semantic object, so ordinary smoke tests did not catch the defect.

Recommendation:

- Keep semantic names in `DUN_ART` and `JOB_SPRITE`.
- Maintain a small checked-in contact sheet or manifest that maps semantic
  names to atlas coordinates.
- Preserve the new humanoid-range assertion and add screenshot comparison once
  the browser test harness supports stable canvas capture.

## Current release gate

- Automated gate: every supported combat job maps to a checked-in Puny sheet,
  every imported file and its CC0 notice exist, and all fallback jobs still map
  to known humanoid tiles.
- Manual gate: the local desktop build renders the new animated combat bodies
  at normal town scale, and a gifted axe is visible on its owning Fighter.
- Remaining limitation: Farmer, Blacksmith and Researcher are readable
  project-drawn fallbacks rather than cohesive animated pack sprites. Dungeon
  and iPad-scale screenshot checks remain follow-up gates.
