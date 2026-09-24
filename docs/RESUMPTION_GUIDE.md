# Wayfarer Guild resumption guide

Updated: 2026-09-24

This is the operational restart point for future sessions. Read it with
`AGENTS.md`, `PROJECT_KNOWLEDGE_BASE.md`, `BACKLOG.md`, and the current diff.
Live source always wins if this document becomes stale.

## Verified baseline

- Branch: `master`; parent baseline before this slice: `a6c6212`.
- Public build: <https://karmiphuc.github.io/wayfarer-guild/>.
- Game source: `wayfarer-guild/index.html`.
- Save key/schema: `wayfarerGuildV2`, version 4.
- Deterministic command: `node wayfarer-guild/tests/wayfarer-guild-smoke.js`.
- The smoke harness covers needs/recovery, combat/rescue, jobs/facilities,
  failed-save preservation, physical field quests, late-phase save/resume,
  quest-boss rewards, dungeon KO propagation, and job-atlas mapping guards.
- This is simulation evidence. Local rendering, mobile interaction and the
  deployed Pages artifact remain separate release gates.

## Current gameplay slice

Mob and Boss quests are physical field operations rather than hidden timers:

1. Spawn a quest-owned monster pack at an explored frontier site.
2. Keep volunteers visible while they walk to the objective.
3. Fight using the existing combat/effects system.
4. Gather at the cleared site.
5. Carry visible cargo back to the Guild.
6. Deposit materials and complete the quest only after return.

The active save stores phase (`travel`, `fight`, `gather`, `return`), site,
resource, amount and monster IDs. Old abstract active quests retain their old
resolution path. Invalid new field state is rejected without replacing the
player's saved bytes.

Quest bosses receive boss-grade rewards and feedback, but do not clear an
unrelated roaming boss alert. Dungeon KO state now returns to town as a real KO
instead of silently reviving at one HP.

## Asset audit and current stopgap

See `docs/ASSET_AUDIT.md` for evidence and licensing details.

Observed defects and corrections:

| Job | Broken atlas tile | Symptom | Current tile |
|---|---:|---|---:|
| Archer | 87 | Viking-like fighter | 98 |
| Blacksmith | 90 | chest/container | 86 |
| Farmer | 92 | cage/container | 99 |

Facts:

- `kenney-tiny-dungeon.png` is a 12-column atlas of 16 x 16 cells.
- Tiles 84-88 and 96-100 are humanoids; 89-92 are props/containers.
- Runtime lookup is shared by town and dungeon pawn renderers.
- Every job is now constrained by a smoke assertion to a known humanoid tile.
- The two shipped atlases are Kenney CC0 and recorded in
  `ASSET_ATTRIBUTION.md`.

Limitation: the atlas has ten humanoids for twelve jobs and lacks unmistakable
farmer, blacksmith and bow-archer silhouettes. Current mappings are safe human
stand-ins, not final job art.

## Visible equipment baseline

- Town and dungeon pawns carry a persistent weapon selected from the actual
  equipped base item: sword, bow, staff, axe or hammer.
- Axe and hammer reuse audited Tiny Dungeon CC0 cells; sword, bow and staff use
  small pixel primitives because the shipped atlas has no readable equivalent.
- The weapon follows attack anticipation/lunge/recoil and is hidden for KO pawns.
- Job defaults provide a readable training silhouette when no item is equipped.
- Auto-equip has a bounded role affinity so an Archer prefers a comparable bow
  over an off-role axe; it remains possible to use unusual builds.
- Automated mapping/affinity checks pass. Actual overlap and scale in a browser
  remain unverified because local file/loopback navigation is blocked here.

## Prioritized next issues

### P0: rendered sprite and field-quest acceptance

Symptom: source/tests can be correct while the canvas still looks wrong.

Acceptance:

- Render Archer, Farmer and Blacksmith in town and dungeon views; each must be
  a person at normal scale, with aligned HP/name/cargo/KO overlays.
- Watch a Mob and Boss quest through spawn, travel, fight, gather and return.
- Verify no console errors, duplicate rewards, teleporting, or premature
  deposits on desktop and a narrow touch layout.
- Verify the pushed Pages build separately from the local build.

Smallest checks: existing smoke suite, `git diff --check`, desktop browser,
narrow viewport, one exported/reloaded return-phase save.

Out of scope: replacing the full art style during this gate.

### P1: ordinary exploration hauling

Symptom: ordinary `gather()` still deposits resources globally and instantly.

Acceptance:

- Pawn reaches a real node, gains personal cargo, returns through a reachable
  path and deposits at Guild/Storehouse.
- Recall, KO, full storage and blocked-return cases preserve or resolve cargo
  without duplication.
- Save/reload preserves carrier, cargo, destination and deposit status.

Dependency: reuse the field quest cargo/return contract instead of adding a
second hauling state machine.

Out of scope: trade caravans or production chains.

### P1: facility activity feedback

Symptom: valid Forge, Farm, Library, shop and recovery activity is difficult to
read, making the town feel static.

Acceptance:

- Pawns visibly occupy/use the facility; concise non-modal FX show work and
  output; production remains tied to actual pawn activity.
- Effects are throttled and do not obscure names or combat.

Dependency: use licensed assets and the existing FX lifecycle.

Out of scope: bespoke building interiors.

### P1: complete visible equipment language

Acceptance: verify carried weapons in town/dungeon at desktop and iPad scale;
add restrained shield/offhand and armor cues; let the player deliberately gift
or reserve equipment; keep pawn silhouette, cargo and status effects readable.

Dependency: preserve current item IDs/save shape and the audited CC0 pipeline.

Out of scope: copying Dungeon Village sprites or its exact UI.

### P1: finish building placement interaction

Implemented baseline: the map is now 38×33, old coordinates are preserved by
v4→v5 migration, the 23-row camera reaches the new southern district, and
placement shows a green/red footprint plus a rejection reason. Population now
scales to 30 and ambient frontier density scales with it.

Remaining acceptance: safe first-tap preview/second-tap confirmation on touch,
cancel controls, rendered desktop/iPad verification, and performance profiling
with 30 active pawns plus 20+ monsters.

### P2: cohesive character set

Evaluate Kenney Tiny Farm and a compatible CC0 fantasy character source. Build
a labelled contact sheet before changing mappings. Record exact source and
license before committing any file. Never use extracted Dungeon Village or
other commercial-game art.

### P2: town life and content

After movement and facility feedback are stable: local visitors, merchants,
event crowds, reactions, seasonal decoration, escort/rescue/delivery quests,
and more compact path-led town composition.

## Save and compatibility contract

- Preserve pawn/building/quest/item IDs and existing coordinates.
- Add defaults and migration before making a new field required.
- Mid-operation saves must restore phase, party, monsters, positions, HP,
  cargo and progress exactly once.
- Rewards/materials must be idempotent across reload.
- Malformed/unsupported saves must not overwrite original stored bytes.
- A visual-only mapping fix must never rewrite user saves.

## Release checklist

1. Run `git status --short`; preserve unrelated work.
2. Review exact intended diffs and every new document/asset.
3. Run `git diff --check` and the full smoke harness.
4. Run the browser gates relevant to rendering, input and saves.
5. Stage only exact paths; never use broad staging in this shared checkout.
6. Review `git diff --cached --name-status` and the staged diff.
7. Scan public changes for secrets, private paths and unlicensed assets.
8. Commit with a focused imperative message and push normally; never amend,
   rebase, reset, clean or force-push without explicit authority.
9. Confirm remote branch state and then verify the deployed Pages artifact.

## Safe resumption order

1. Read current status/diff and this guide.
2. Re-run deterministic checks.
3. Verify the local and deployed rendered gate still outstanding.
4. Continue ordinary exploration hauling using the field-operation pattern.
5. Add facility feedback before decorative density.
6. Finish touch confirmation and profile the expanded map at 30 pawns.
7. Finish each cohesive slice with scoped verification, commit and push.
