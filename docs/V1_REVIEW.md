# v1 (v0.7.22) Review — why v2 is a rebuild

Reviewed 2026-09-26 against the live build and source (`index.html`, 479 minified-dense lines, 186 KB).

## Verdict
Mine it for systems and data; don't refactor it in place. The sim logic passes its own smoke test (20 groups, 285 asserts), but the visuals, architecture and missing DV2 pillars make a rebuild cheaper than a salvage.

## What went wrong
| Area | Finding |
|---|---|
| Art | 7 raster packs + 3 procedural styles mixed. Top-down Kenney grass under pseudo-isometric city-sim buildings; Eldiran bodies at ~1.47×, Tiny Creatures at 1.35× — fractional scales everywhere. Violates the repo's own "coherent pixel-art language" rule. |
| Sprite race | `makeIsoFacility` caches the procedural fallback before the PNGs load and never invalidates, so level-1 buildings stay procedural while the footer claims "real buildings". |
| Asset sourcing | Ninja Adventure (CC0) was listed as the primary candidate but never imported; only fragments of other packs were used. |
| Performance | `grid()` allocates a 38×33 array per call; `nearestBuilding`'s sort comparator calls it twice per comparison → ~1,000 allocations per decision; open-list A* re-sorts every pop; sidebar rebuilt via `innerHTML` every 350 ms (drops clicks). |
| Scope balance | Weapon-pose/trail juice (28.5 KB) ≈ the whole renderer and larger than economy + quests combined. |
| DV2 gaps | No world/field around town, no Town Traits/Titles, one hard-coded dungeon corridor, one quest at a time from 3 templates, only the weapon shop sells, monsters never become residents. |
| UI | Inspector-style wall of text (raw personality numbers, retreat thresholds, debug lines); no visual build menu. |

## Salvaged into v2
Utility-AI-with-personality idea, job/item/affix table shapes, save-slot/migration pattern, the headless (vm-stub → Node ESM) test approach.

## Research correction applied
DV2 has no adjacency combos; it uses town-wide **Traits** with threshold **Titles**, a town sitting in a monster-roamed field, ★ rank conditions, and Town Points from kills. v2 follows that.
