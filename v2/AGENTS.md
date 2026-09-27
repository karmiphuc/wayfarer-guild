# Wayfarer Guild v2 — Agent Guide (READ THIS FIRST)

You are working on a browser game: a Dungeon Village 2–style adventurer-village sim.
Plain JavaScript ES modules + Canvas 2D. **No framework, no npm dependencies, no build step for development.**
Everything you need is in this folder. Follow this file literally; when in doubt, choose the option this file names.

- Live game: https://karmiphuc.github.io/wayfarer-guild/v2/
- Deeper docs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/RECIPES.md](docs/RECIPES.md) · [docs/ASSETS.md](docs/ASSETS.md) ·
  [docs/TESTING.md](docs/TESTING.md) · [docs/DEPLOY.md](docs/DEPLOY.md) · [docs/DV2_PARITY.md](docs/DV2_PARITY.md) (roadmap)

## 0. Where the source code is

Everything is in this repo since 2026-09-27: `v2/js/` (source), `v2/tests/`, `v2/tools/`, `v2/assets/` (all sprite sources +
the packed atlas), `v2/docs/`. GitHub Pages serves the ES modules directly: `v2/index.html` loads `js/main.js` — no build step.
- Edit `v2/js/*.js`, run `node v2/tests/check.mjs`, reload the page. That's the whole loop.
- `v2/game.js` is a LEGACY single-file bundle from the paste-only period; `index.html` no longer loads it. Ignore it (or delete
  it). `tools/bundle.py` can rebuild one into `dist/v2/` if you ever need a single-file copy.
- The original dev clone (`~/Projects/wayfarer-guild-review/src`, branch `feature/opus-rebuild`) has the full git history;
  the GitHub copy was web-uploaded, so its history starts at the upload commits.

---

## 1. The five commands you will use

Run them from the **repository root** (the folder that contains `v2/`).

| Goal | Command | Expected result |
|---|---|---|
| Check everything (run before EVERY commit) | `node v2/tests/check.mjs` | ends with `all checks passed` (≈3 s) |
| Check balance too (after touching numbers) | `node v2/tests/check.mjs --full` | ends with `all checks passed (full)` (≈3 min) |
| Play locally | `python3 v2/tools/serve.py 8766 .` then open `http://localhost:8766/v2/?new` | game loads; `?new` = fresh village |
| Rebuild sprite atlas (after adding/changing ANY png) | `uv run --with pillow python3 v2/tools/pack_atlas.py` | prints `N sprites -> 2 sheets` |
| Build the single-file deploy bundle | `python3 v2/tools/bundle.py` | writes `dist/v2/` (game.js + assets) |

No `uv`? Use `pip install pillow` then `python3 v2/tools/pack_atlas.py`.

## 2. Where things live

```
v2/
  index.html          page shell (top bar, bottom menu, panels). Dev entry loads js/main.js as an ES module.
  css/style.css       all styling; 9-slice wood UI via border-image
  js/                 SOURCE OF TRUTH — edit these
    jobs.js           29 classes (JOBS), 29 mastery perks (PERKS), job-change costs (TIER_TP), visitor pools
    items.js          70 items: weapons / armor / accessories / consumables (ITEMS), which shop sells what (SHOP_SLOTS)
    happenings.js     weekly random HAPPENINGS, new-game village CHARTERS, per-world roster sizes (ROSTER_SIZE)
    data.js           everything else static: map size, sprites (SPR), facilities (FAC), decor (DECOR), traits/titles,
                      events, monsters, zone spawn lists (ZONE_MONS), bosses, ranks. Re-exports jobs.js, items.js, happenings.js.
    state.js          new game + world generation, stat formula, save/load/migrate (plain JSON state)
    sim.js            the simulation: calendar, adventurer AI, economy, combat, monsters, quests, dungeons, perks
    path.js           A* pathfinding (typed arrays)
    rng.js            seeded random (the ONLY randomness allowed in the sim)
    assets.js         image loading, sprite atlas, hand detection, hue tints
    render.js         canvas drawing (read-only view of state)
    ui.js             DOM panels, inspector, build mode, fanfares
    audio.js          music + sound effects
    main.js           boot, game loop, mouse/touch input
  assets/             sprites/audio (CC0). assets/atlas/ = packed sprites actually shipped. Licenses: assets/*_LICENSE.txt
  tools/              build/dev scripts (python)
  tests/              node scripts; tests/check.mjs runs everything
  docs/               the docs linked above
```

## 3. Golden rules (breaking these has broken the game before)

1. **Content is data.** New classes, items, monsters, bosses, buildings, decor, titles, events = add a row to the
   tables in `jobs.js` / `items.js` / `data.js`. Only touch `sim.js` when you add a NEW MECHANIC.
   Follow the exact recipe in [docs/RECIPES.md](docs/RECIPES.md).
2. **Never use `Math.random()` in `state.js` or `sim.js`.** Use the seeded RNG: `this.R.chance(p)`, `this.R.int(a, b)`,
   `this.R.pick(arr)`, `this.R.range(a, b)`. (Render/audio may use Math.random for cosmetics only.)
3. **State is plain JSON.** Everything in `s` (the game state) must survive `JSON.stringify` → `JSON.parse`.
   No functions, classes, Maps, Sets, DOM nodes or circular refs in state. IDs come from `s.nextId++`.
4. **Changing the shape of saved data needs a migration.** Add the fix-up to `migrate()` in `state.js`
   (give old saves a default for every new field, rename old ids). Never break existing saves.
   `migrate()` runs on EVERY load (brand-new saves too), so each transform must be a no-op on a current save:
   guard on the OLD field being present (`if (a.base.hp !== undefined) {…}`), never on `s.schema`.
5. **The renderer never changes state.** `render.js` and `ui.js` read `s`; all changes go through `Sim` methods
   (`build`, `upgrade`, `startQuest`, `changeJob`, `develop`, `runEvent`, `gift`, ...).
6. **Pixel art at integer scale only.** Never set `imageSmoothingEnabled = true`; never draw sprites at fractional scale.
7. **One art style.** New art must be CC0 (preferred) or CC-BY with attribution, 16 px top-down, dark 1 px outline,
   matching Ninja Adventure. Read [docs/ASSETS.md](docs/ASSETS.md) before adding any file. NEVER use Kairosoft assets.
8. **After adding/changing sprites run `tools/pack_atlas.py`.** Deploys ship only the atlas; a stale atlas = invisible sprites.
9. **No `alert()` / `confirm()` / `prompt()`.** Use `ui.ask(text, okLabel, onOk)` for confirmations and `ui.toast(text)` for messages.
10. **`node v2/tests/check.mjs` must pass before you commit.** If you changed balance numbers, run `--full` too.

## 4. Definition of done (copy into your final message and tick it)

- [ ] `node v2/tests/check.mjs` → `all checks passed` (and `--full` if balance changed)
- [ ] Played it locally for 1 minute at `?new`: no errors in the browser console, the change is visible/working
- [ ] New assets: license verified, row added to `../ASSET_ATTRIBUTION.md`, atlas re-packed
- [ ] New saved fields: default added in `migrate()`
- [ ] Docs updated if you added a mechanic (ARCHITECTURE/RECIPES) or finished a roadmap item (DV2_PARITY + close the GitHub issue)
- [ ] Commit message is conventional: `feat(v2): ...`, `fix(v2): ...`, `chore(v2): ...`, `docs(v2): ...`

## 5. Things that look right but are wrong (known traps)

| Trap | What to do instead |
|---|---|
| Editing `dist/v2/game.js` or the `game.js` on GitHub | It is GENERATED. Edit `v2/js/*.js`, then run `tools/bundle.py`. |
| Adding a new `js/*.js` module and deploying the bundle | Add the module name to `ORDER` in `tools/bundle.py` (dependencies first). |
| `export const A = 1, B = 2;` in a module | Works in the bundler now, but prefer one export per line. |
| Browser shows old code after editing | Use `tools/serve.py` (sends no-cache headers), not `python -m http.server`. |
| "New game" / wiping the save, then the old save comes back | `game.noSave = true` before reload (already done in `ui.js`), or open `?new`. |
| `tests/used-assets.mjs --prune` | DELETES every asset file not referenced by code. Only run it when you mean it. |
| New perk key (e.g. `critPct`) silently does nothing | Add it to `KNOWN_PERK_KEYS` in `tests/validate.mjs` AND read it in `sim.js` via `perkSum(a, 'critPct')`. The validator fails otherwise. |
| Canvas `filter` / `ctx.filter` for recolours | Not supported on older Safari. Use `tinted(key, deg)` from `assets.js` (pixel hue-rotation). |
| Weapon sprite floats away from the hand | In-hand sprites must point blade-DOWN with the handle at the TOP of the png; bows are horizontal facing RIGHT. Hands are detected automatically from each frame — don't hard-code offsets. |
| Uploading via the GitHub web UI | The file picker can't keep folder paths: upload **one folder per commit** (`/upload/main/v2/<folder>`), assets first, code last. See docs/DEPLOY.md. |
| Monster image keys | `m_<Spr>` = monster sheet, `mf_<Spr>` = monster portrait, `deco_*` = decor images. These are image KEYS in `assetList()`, not file names (decor files are `assets/tiles/mf_*.png`). Don't reuse key prefixes. |
| Showing or reusing the seed | `s.seed` is the RNG's running state and changes every step. The world code is `s.world.code` (`seedCode()` in state.js). |
| `s.traits.Food += 5` | Lost on the next build: `recomputeTraits()` rebuilds `s.traits` from buildings + monsters. Persistent trait sources need their own field (issue #32). |
| New player setting or one-shot flag | Put it in `s.flags.<key>` with a default in `newGame()` AND `migrate()`. |
| New happening that spawns things | Keep their ids in `h.data` and remove them in `endHappening()`; `tests/happenings.mjs` fails if it never ends. |

## 6. If you are asked to add a feature

1. Read the matching GitHub issue (label `dv2-parity`) and [docs/DV2_PARITY.md](docs/DV2_PARITY.md).
2. Find the closest existing mechanic in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and copy its pattern.
3. Data first (tables), then sim logic (`sim.js`), then UI (`ui.js` panel/inspector), then render (only if it must be seen).
4. Add a test or a validator rule if the feature has an invariant (see [docs/TESTING.md](docs/TESTING.md)).
5. Run the Definition of Done.

## 7. Project facts you should not re-derive

- Map 76×56 tiles of 16 px. The village is a rectangle in the middle (`s.town`), monsters roam 4 zones around it
  (zone = distance from the ORIGINAL town rect; south is gentle). The Old Cave entrance is random per world (`cavePos(s)`;
  (36,7) in saves from before world codes).
- Every village is founded from a world code (the seed): it fixes the monster species per zone (`ROSTER_SIZE`), the cave spot
  and the 3 charters offered. Weekly happenings (`HAPPEN_CHANCE` 0.37 ≈ one every 2.7 weeks) use the same seeded RNG, so code +
  choices replay identically.
- Visitors (non-residents) are capped per rank by `VISITOR_CAP` = 5/5/10/15/20/30 for ★0–★5 (owner's play-test call).
- 72 monster types: 66 creatures + 6 outlaws (`human: true` — human pawns drawn from character sheets with a weapon; they roam
  zones 3–4 and form the Bandit Raid gang). 6% of wild spawns are Elites (`ELITE_CHANCE`: recoloured, crown, ×2.5 EXP/gold).
- 1 in-game week = 30 s at 1× speed (`WEEK_SECONDS`), 4 weeks/month, sim step `DT = 0.1 s`, max 40 steps per frame.
- Job mastery at job level 10 (`MASTERY`), level caps 99 (`LV_CAP`, `JOB_CAP`). Perks stack and are kept forever.
- Village stars 0–5 via `RANKS` conditions; ★5 requires beating `cyclop`. Post-game bosses need `star: 5`.
- Balance gates (checked by `--full`): the bot reaches ≥ 4★ within 30 months; bosses need party Lv ≈ 3,5,7,9,11,13,17,17,19,21,21.
- Art: Ninja Adventure (CC0) for almost everything; armor/accessory icons from Alex's 16x16 RPG Item Pack (CC0);
  fountain/basin/knight statue/castle from Pixel-boy's Medieval Fantasy (CC0). Details: ../ASSET_ATTRIBUTION.md.
