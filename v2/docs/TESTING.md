# Testing

All tests are plain Node scripts (Node 18+). No test framework, no browser needed (except the manual play check).
Run from the repository root.

| Script | What it proves | Pass criteria |
|---|---|---|
| `node v2/tests/check.mjs` | everything below in one go (fast part) | last line `all checks passed` |
| `node v2/tests/check.mjs --full` | + 30-month bot soak + boss ladder | last line `all checks passed (full)` |
| `node v2/tests/quests.mjs` | instant departure, random capable defaults, extra fees/party cap, six concurrent parties including duplicate kinds, independent cave progress, ownership and endings, KO recovery, legacy saves, Depart ordering, accessible selected-party state and current-job mastery badge | final line ends in `passed` |
| `node v2/tests/frontier.mjs` | dormant sites, prerequisites, one-time land/bonus/relic rewards, failure cleanup, unique ownership, old-map migration and distant paths | final line ends in `passed` |
| `node v2/tests/palisades.mjs` | eight perimeter openings, blocked movement, gap routing, removal, placement guards, expansion and save/reload | final line ends in `passed` |
| `node v2/tests/camps.mjs` | 16 deterministic dormant camps, rank gates, generated human classes, parallel attempts, loot, persisted 8–20 week cooldowns, one-time legacy cooldown extension and bounded retries | final line ends in `passed` |
| `node v2/tests/raids.mjs` | rank/veteran-scaled strength, ready-camp sourcing, travel allowance, arrival-gated theft, owned-land defense paths, seeded classes, range, magic, healing, rewards and cleanup | final line ends in `passed` |
| `node v2/tests/rescue.mjs` | stationary KO, exclusive claims, carrying, carrier failure, unreachable-bed fallback, save/load and quest ownership | final line ends in `passed` |
| `node --expose-gc v2/tests/frontier.mjs --soak` | repeated failed challenges plus a three-hour simulation soak; bounded ledgers, actors, logs, save size and forced-GC heap samples | final line ends in `passed (soak)` |
| `node v2/tests/validate.mjs` | data integrity: sprites exist and have the right sheet size, perk/item keys valid and consumed by the sim, job prerequisites sane, boss frame math, SPR rects inside images, atlas fresh | `0 error(s)` |
| `node v2/tests/used-assets.mjs` | every file the code loads exists (`missing: 0`); lists unused files | `missing: 0` |
| `node v2/tests/headless.mjs 6` | a scripted 6-month game; prints one economy line per month | no exception; residents > 0 by month 3 |
| `node v2/tests/bot.mjs 30 1 [charter]` | greedy bot plays 30 months (seed 1): signs the first offered charter (or the one given), builds, develops gear, buys a merchant licence when rich, runs quests, changes jobs; weekly happenings run as in the real game | reaches ≥ 4★ (usually 5★ around Y2–Y3); ≤ 400 µs/step |
| `node v2/tests/happenings.mjs` | forces every happening once (stars 3) and signs every charter once; checks each ends and cleans up; replays 12 weeks twice from one seed | every line `ok`, last line `deterministic replay … true` |
| `node v2/tests/bossprobe.mjs` | lowest 4-person party level (mixed classes, best gear) that beats each boss 2 of 3 times | main ladder ≈ 3,5,7,9,11,13,17,17,19,21,21 (±4) |
| `node v2/tests/dungeon.mjs` | a Lv10 party clears the 4-floor Old Cave and unlocks a treasure | `quest over: true cleared 1` |
| `node v2/tests/free-sprites.mjs` | sprites on disk not used yet (character sheets with sizes, monsters, in-hand weapons, armor/accessory icons) | informational |
| `node v2/tests/asset-list.mjs` | prints the loader's asset paths (input for `pack_atlas.py`) | JSON array |

## How the fast check works (`check.mjs`)

1. `node --check` on every `js/*.js` (syntax).
2. `validate.mjs` (data integrity).
3. `used-assets.mjs` (no missing files).
4. In-process smoke: new game (seed 4242), builds 5 facilities, simulates 3 in-game months, asserts no NaN/Infinity in gold,
   popularity, adventurer and monster numbers, a non-empty quest board; then JSON round-trip → `migrate()` → new `Sim` →
   200 more steps; save must stay < 1.5 MB.
5. `tests/happenings.mjs` (every happening and charter runs and ends; same seed + choices = same state).
6. `tests/quests.mjs` (parallel parties, fees, lifecycle and save migration).
7. `tests/frontier.mjs` and `tests/palisades.mjs` (expanded-world conquest, barriers and routing).
8. `tests/camps.mjs`, `tests/raids.mjs` and `tests/rescue.mjs` (late-game fights and KO recovery).
9. `tools/bundle.py` into a temp dir + `node --check game.js`.

## Adding tests

- A new invariant on data (e.g. "every event has a cost > 0") → add a rule in `validate.mjs` (`err(...)` for must, `warn(...)` for should).
- A new mechanic → extend the smoke step in `check.mjs` or write a focused script like `dungeon.mjs`
  (import `newGame`, `Sim`; set up state directly; step; print/assert). Keep scripts deterministic by passing a seed to `newGame(seed)`.
- Balance expectations live in `check.mjs` (`expect` table for bosses, `>= 4` stars for the bot). Update them deliberately —
  never loosen them just to make a change pass.
- A new player action (a new `Sim` method the UI calls) → make `tests/bot.mjs` call it each month (one line), otherwise
  the `--full` soak never exercises it and the balance gate says nothing about your feature.
- A save-shape change → also load an old save (export one from the live game first) through `migrate()` and step it
  (an old-save fixture in `tests/fixtures/` is planned in issue #17).

## Manual play check (1 minute, every feature)

Gear economy regressions run in `tests/economy.mjs`; `tests/relic-ui.mjs` checks vault visibility and shop stock.
For gear changes, open Frontiers after a conquest, assign its vault relic to a resident, verify the separate blessing and accessory,
and inspect both Armor and Item Shops for ordinary accessory stock. Check an under-equipped resident buys cheap basics
before upgrades, preserves savings during routine needs, and still meets urgent hunger/rest/healing needs.
`equipment.mjs` covers independent body/helm-shield stats, all six legacy armor migrations, shopping priorities,
and every new class's mastery prerequisites. Visually inspect four equipment labels, both Develop armor tabs,
and the new weapon sprites in carried/attack poses. Every tier-3 class must have a tier-4 successor.
`blessings.mjs` covers all eight legacy relic migrations, unique transfers, independent accessory stats and save/load.
`night-rest.mjs` covers dusk decisions, routine hunt interruption, home recovery, urgent exceptions and protected savings.
`patrols.mjs` covers seeded guard waves, camp eligibility, staggering, population/lifetime bounds, capture recall and migration.
`rendering.mjs` checks palisade connectivity and monster direction/frame axes; visually check all corner orientations,
boundary joins and Panda/TRex walking in each direction as well.

```
python3 v2/tools/serve.py 8766 .
# open http://localhost:8766/v2/?new  → Start → watch 1 in-game week at 4× → open every bottom-menu panel
# open DevTools console: there must be no red errors
```

For expanded-map changes, also pan to a captured territory and rapidly drag a long road and palisade: every crossed tile
should be painted, and no browser image-drag preview should appear. Open Frontiers and Bandit Camps from the Quest Board,
use Show on map, and tap the full visible landmark at normal and touch zoom. For rescue changes, force one pawn to 0 HP,
confirm one rescuer claims and carries the opaque fallen body, then repeat with the rescuer disabled and with no reachable bed.

Debug helpers in the console: `__game.s` (state), `__game.sim` (e.g. `__game.sim.build('inn', 30, 20)`),
`for (let i = 0; i < 3000; i++) __game.sim.step()` to fast-forward, `__game.s.gold += 10000`.

## Docs dogfood test (does a weaker model manage?)

Re-run whenever AGENTS.md or RECIPES.md change a lot:
1. Copy the repo to a scratch folder (`git archive HEAD | tar -x -C /tmp/dogfood` + copy `v2/assets/atlas`).
2. Give a small model (e.g. Claude Haiku) ONLY this instruction: read `v2/AGENTS.md` then `v2/docs/RECIPES.md`, and
   (1) add a tinted weapon, (2) add a zone-3 monster reusing an existing sprite, (3) add a tier-2 class with a new perk;
   run `node v2/tests/check.mjs` after each; report every unclear doc line.
3. Pass = all three done with `all checks passed`, and no invented mechanics in `desc` texts.

Last run (2026-09-27, Haiku): 3/3 done in 4 check runs; the one failure (a 64×32 townsfolk sheet used for a job) was
caught by the validator. Its perk text claimed an effect that doesn't exist, copied from a bad RECIPES example — fixed
(the example and a "desc must match the keys" rule).
