# Testing

All tests are plain Node scripts (Node 18+). No test framework, no browser needed (except the manual play check).
Run from the repository root.

| Script | What it proves | Pass criteria |
|---|---|---|
| `node v2/tests/check.mjs` | everything below in one go (fast part) | last line `all checks passed` |
| `node v2/tests/check.mjs --full` | + 30-month bot soak + boss ladder | last line `all checks passed (full)` |
| `node v2/tests/validate.mjs` | data integrity: sprites exist and have the right sheet size, perk/item keys valid and consumed by the sim, job prerequisites sane, boss frame math, SPR rects inside images, atlas fresh | `0 error(s)` |
| `node v2/tests/used-assets.mjs` | every file the code loads exists (`missing: 0`); lists unused files | `missing: 0` |
| `node v2/tests/headless.mjs 6` | a scripted 6-month game; prints one economy line per month | no exception; residents > 0 by month 3 |
| `node v2/tests/bot.mjs 30 1` | greedy bot plays 30 months (seed 1): builds, develops gear, runs quests, changes jobs | reaches ≥ 4★ (usually 5★ around Y2–Y3); ≤ 400 µs/step |
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
5. `tools/bundle.py` into a temp dir + `node --check game.js`.

## Adding tests

- A new invariant on data (e.g. "every event has a cost > 0") → add a rule in `validate.mjs` (`err(...)` for must, `warn(...)` for should).
- A new mechanic → extend the smoke step in `check.mjs` or write a focused script like `dungeon.mjs`
  (import `newGame`, `Sim`; set up state directly; step; print/assert). Keep scripts deterministic by passing a seed to `newGame(seed)`.
- Balance expectations live in `check.mjs` (`expect` table for bosses, `>= 4` stars for the bot). Update them deliberately.

## Manual play check (1 minute, every feature)

```
python3 v2/tools/serve.py 8766 .
# open http://localhost:8766/v2/?new  → Start → watch 1 in-game week at 4× → open every bottom-menu panel
# open DevTools console: there must be no red errors
```

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
