# Wayfarer Guild Project Knowledge Base

Updated: 2026-09-24  
Source of truth: `wayfarer-guild/index.html` on `master`  
Observed deployment: https://karmiphuc.github.io/wayfarer-guild/  
Audited commit: `f61eec9` (`Track v0.5.2 combat feedback pass`)

## Product north star

Wayfarer Guild is an autonomous fantasy management RPG. The player arranges
the town, facilities, jobs, research and expedition incentives; residents make
believable choices and create stories without requiring constant direct orders.

The immediate quality bar is simple: a resident with a home should return to
that home to recover, a researched facility should be placeable and useful, and
frontier-capable jobs should sometimes explore without a manual click.

## Current architecture

- The deployed game is a single HTML file containing markup, styling, content,
  simulation, rendering and save migration.
- Simulation advances in a fixed 30 Hz loop, with a speed multiplier and daily
  rollover. Rendering is separate from the simulation tick but shares state.
- Pawns use utility-style task selection through `chooseTask()`, then move on a
  grid with A* and execute tasks in `updatePawn()`.
- Facilities are data-defined in `BDEFS`, selected by `BUILD_TASK`, and applied
  by `useBuilding()`.
- Save data is stored in `localStorage` as `wayfarerGuildV2`; current schema is
  version 4 with migration and state repair.
- GitHub Pages publishes `master/wayfarer-guild/index.html`.

## Baseline evidence ledger (before this patch)

| Area | Evidence | Impact |
|---|---|---|
| Research/build gate | `renderTown()` requires `d.unlock <= S.rank`; Farm and Forge have `unlock: 2`, while their research entries require rank 1 | Research can succeed without making the building visible/placeable |
| Housing | `init()` creates two Houses, but every pawn starts with `homeId: null`; only `tryMoveIn()` assigns housing | Starting residents have no home and house occupancy stays empty |
| Rest/health | `BUILD_TASK.Rest` is `Inn`; `chooseTask()` selects the nearest Inn; `useBuilding()` has no House case | Residents never use their home for sleep or recovery |
| Forge | Forge exists in `BDEFS`, but Forge is absent from `BUILD_TASK`, `chooseTask()` and `useBuilding()` | A built Forge has no autonomous consumer or gameplay effect |
| Farm | Farm has a task and production code, but is blocked by the same rank gate and only residents can work it | Farm can appear dead or impossible to place |
| Frontier autonomy | `mapClick()` is the only entry point that sets `task = 'Explore'`; `chooseTask()` only chooses Patrol/Wander/Fight | Exploration is manual-only and not job-directed |
| Frontier reliability | Explore pathing ignores fog and failure falls back to Wander; there is no shared target reservation or recovery policy | Manual or autonomous deployments can look intermittent and give little feedback |

## Active bugfix slice

This slice is intentionally narrow and maps to the existing GitHub planning
issues rather than creating a new competing architecture:

1. Facility availability: research unlocks the facility it names, with clear
   failure feedback when a map tile is invalid or funds are insufficient.
2. Housing lifecycle: repair existing saves, assign starting residents to open
   houses, keep occupancy consistent, and route resident rest to home.
3. Facility use: make House restore energy/HP and let Blacksmith residents use a
   Forge to craft gear from wood/ore while gaining job progress.
4. Frontier autonomy: let eligible residents (Adventurer, Archer, Knight,
   Ninja and Paladin) opportunistically choose a reachable fog target, while
   retaining manual Explore mode and safe fallback to town needs.
5. Regression coverage: exercise the above transitions through the exposed
   debug surface without requiring a live save or a full browser session. The
   current smoke harness is `tests/wayfarer-guild-smoke.js`.

Related existing planning issues: #22 pawn autonomy, #23 jobs/buildcraft,
#24 frontier/expeditions, and #25 town facilities/economy.

## Acceptance checks

- A rank-1 save that researches Farm or Forge shows the building in the Town
  build menu and permits placement on a valid empty town tile.
- A new save assigns all starting residents to available Houses, and each
  House's occupant list matches the pawn assignments.
- A housed resident with low energy routes to House, increases energy and HP,
  increments House Uses, then resumes another task.
- A Blacksmith with an available Forge routes there, consumes bounded resources,
  creates gear over time, and does not craft when materials are unavailable.
- At least one eligible resident can autonomously deploy to a reachable fog
  target, clear it, gather, and return to normal needs when interrupted.
- Existing saves without housing assignments remain loadable and are repaired
  without changing unrelated pawn identity or save keys.
- The live browser has no new console errors and the smoke harness passes.

The local smoke command is:

```text
node tests/wayfarer-guild-smoke.js
```

## Local verification (2026-09-24)

The deterministic Node simulation harness passes placement, starting housing,
home recovery, Forge crafting, actual Blacksmith travel/use, Farmer priority,
autonomous exploration selection, interrupted exploration return, repeatable
housing repair, and eating while injured. Activity changes clear stale frontier
intent, and explored travel corridors remain traversable on the return journey.

This is simulation evidence with stubbed drawing and fixed randomness, not a
rendered browser or deployed-save test. Local browser URLs were blocked by the
browser policy. The live-browser acceptance check remains open. Shared frontier
target reservations and a Scout job are not implemented by this patch.

## Follow-up queue

- Next after pawn-state fixes: [building placement and town space](./BUILDING_PLACEMENT_PLAN.md).
- Recovery regression coverage now includes simultaneous hunger/exhaustion/injury,
  combat/rescue disengagement, HP-aware Camp and explicit Recall-to-recovery.
- Knight becomes eligible after Fighter mastery; Paladin requires Temple research
  plus Fighter and Cleric mastery. Researcher residents prioritize Library work.
- Failed-load preservation and backup-import recovery have simulation coverage.
  This does not constitute exhaustive corrupt-save validation or a backup system.

- Split the single HTML file into simulation, content, rendering, UI and save
  modules under issue #19 after this bug slice is stable.
- Add explicit role/job data for Scout rather than growing hard-coded job lists.
- Expand the deterministic simulation harness before expanding facilities,
  dungeons or content density.
- Re-test at 30 and 60 pawns and verify background-tab/mobile behavior under
  issue #26.

## Deployment note

This audit was performed against the public Pages build and a shallow checkout
of the repository. Local changes are prepared in the checkout under `work/`;
committing records them locally only. Publication requires a separately
authorized push and a deployed-browser check.
