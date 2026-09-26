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

Follow-up in v0.7.3:

- Puny combat bodies render 30% larger without changing collision or pathing.
- Weapon, shield/book and armor placement derives from rendered body size;
  bows, staves and melee weapons use separate side and height anchors.
- All twelve monster keys map to distinct species tiles from Clint Bellanger's
  CC0 Tiny Creatures sheet. Bats alternate the supplied wing-up/wing-down
  frames; other monsters retain the game's movement bob and combat reactions.
- A desktop render check confirmed the larger bodies, fitted bow placement and
  readable frontier monster silhouettes with no browser errors.

Attachment correction in v0.7.5:

- The old body-scale offsets still positioned gear beside the pawn, so weapons
  could visibly float despite scaling correctly.
- Main-hand and offhand positions now use measured source-pixel anchors for all
  five idle/walk frames and mirror with the pawn's combat facing.
- Body and equipment consume the same animation-frame value on each draw.
- Axe and hammer atlas tiles rotate around their lower handle grip rather than
  around the center of the tile.
- Automated checks bound every grip to the body silhouette; live town checks
  covered an Archer's default bow and an equipped War Hammer with no console
  errors. Dungeon and touch-scale checks remain separate release gates.

Combat-pose extension in v0.7.6:

- The measured hand anchor remains the single transform origin throughout an
  attack; weapon motion rotates around the grip instead of translating the
  weapon away from the body.
- Sword, axe and hammer attacks now have separate wind-up, contact and recovery
  arcs. Hammer timing is deliberately slower and its overhead anticipation is
  deeper; the axe uses a broader cleave.
- Bows visibly pull their string and nocked arrow before release. Magic and holy
  weapons raise into a focus pose and pulse at the casting beat.
- Deterministic checks cover family timing, attack phases, swing separation and
  bow-string release. A live dungeon and touch-scale visual check remains a
  release gate.

Contact-timing correction in v0.7.7:

- Melee slash, cleave and smash effects wait for the weapon's contact frame.
- Bows and staves finish their anticipation before spawning a projectile; hit
  flash, recoil, damage text and critical feedback wait for projectile travel.
- Attack audio follows release/contact instead of firing at the start of the
  wind-up.
- Pending effects stay hidden without consuming their visible lifetime.
- Automated checks cover release/contact ordering, delayed-effect activation
  and pre-contact recoil suppression.

Directional carrying correction in v0.7.8:

- Attack vectors now influence weapon angle vertically as well as choosing a
  left/right body facing. Near-vertical attacks retain the previous horizontal
  facing so the pawn does not flicker unpredictably.
- Bow aim receives the full directional treatment; melee and staff poses use a
  restrained vertical tilt so their authored swing silhouettes remain clear.
- Weapons, shields and books pass behind the pawn when attacking north and
  render in front for southward or idle poses, adding readable depth without
  moving either hand anchor.
- Automated checks cover north/south angle separation, stable near-vertical
  facing, diagonal aim and foreground/background selection.

Equipment-identity correction in v0.7.9:

- Bronze Sword, Hunter Bow, Oak Staff, Iron Axe and War Hammer retain distinct
  carried styles and authored size profiles instead of collapsing into one
  generic weapon per attack family.
- Bronze blades, hunter-bow wraps, oak-staff crystals and heavy-weapon bindings
  provide readable material cues at normal gameplay scale.
- Uncommon through unique rarity colors now accent the carried weapon itself in
  addition to the existing equipment glint.
- A small outlined hand cap is drawn over the measured pivot when equipment is
  in front of the pawn, making the grip connection explicit; north-facing depth
  ordering naturally lets the body cover it when the weapon passes behind.
- Automated mapping checks bind every current weapon base to its intended style,
  scale, family and atlas source.

Two-handed carrying correction in v0.7.10:

- During bow attacks, the support forearm and hand now follow the animated
  string notch through draw and release instead of leaving the pull suspended.
- Axe and hammer attacks brace the lower handle with a second hand. Staff users
  add a support grip during focus and casting phases.
- Support-hand targets pass through the same rotation, mirroring, vertical aim
  and front/behind depth transforms as the weapon, so they cannot drift away
  when the pawn changes direction.
- One-handed swords remain one-handed, and an equipped shield or spellbook
  suppresses the support arm rather than producing an impossible third hand.
- Automated checks cover bow-notch following, heavy-handle placement, offhand
  conflicts, one-handed exclusions and mirrored coordinate transforms.

Weapon-bound action emphasis in v0.7.11:

- Dungeon Village 2 combat references consistently emphasize the attacking
  adventurer with bright sword/spell energy, not only a reaction on the target.
- Sword and axe swings now emit compact grip-centered arcs; hammer attacks use
  a broader, heavier double arc; bows show paired release streaks; magic and
  holy staves form an expanding ring around the focus crystal.
- Trails inherit weapon mirroring, vertical aim, front/behind depth and rarity
  accent color because they render inside the carried-weapon transform.
- Trail intensity is phase-bound: zero in anticipation, highest at the center of
  contact/release and zero again during recovery.
- Automated checks cover exact family windows and peak/zero boundaries.

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
  project-drawn fallbacks rather than cohesive animated pack sprites. The Tiny
  Creatures pack is species-rich but mostly static, so richer monster attack/
  hurt frames remain a later animation pass. Dungeon and iPad-scale screenshot
  checks remain follow-up gates.
