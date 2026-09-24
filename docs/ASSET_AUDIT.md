# Runtime asset audit

Updated: 2026-09-24

## Scope and evidence

This audit covers every image currently loaded by `index.html`, the runtime tile
lookups that select art from those images, and the public-repository license
record. It does not evaluate planned or candidate assets that are not shipped.

The deployed game uses two 192 x 192 Kenney atlases with a 16 x 16 tile grid:

- `assets/art/kenney-tiny-town.png` for terrain, vegetation and buildings;
- `assets/art/kenney-tiny-dungeon.png` for pawns, monsters, props and items.

Both files are recorded in `ASSET_ATTRIBUTION.md` as Kenney CC0 assets. The
official Tiny Dungeon source pack was used to inspect the corresponding
individual tiles. It confirms that atlas tiles 84-88 and 96-100 are humanoids,
while tiles 89-92 are containers or cage props.

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

- Automated gate: every job maps to a known humanoid tile; the three reported
  regressions have explicit assertions.
- Manual gate: render at least one Archer, Farmer and Blacksmith in the town and
  confirm each is a person at normal game scale.
- Remaining limitation: the replacements are role-appropriate approximations,
  not bespoke job art.
