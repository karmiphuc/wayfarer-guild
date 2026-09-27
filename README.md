# Wayfarer Guild

## v2 (rebuild, `/v2/`)

A ground-up rebuild of the game as a Dungeon Village 2–style adventurer-village sim, on **one** coherent CC0 art pack (Ninja Adventure: tiles, buildings, 40+ characters, 60+ monsters, bosses, UI, font, music and SFX).

- Village in the middle of a wild field: monsters roam zones, adventurers hunt in view, come home to eat, shop, sleep and train
- Visitors → satisfaction → move in when a House is free; residents change jobs (Town Points), partner with tamed monsters (mount at bond 50)
- DV2-style **Town Traits + Titles** instead of adjacency combos; ★ village rank with explicit conditions
- Quests: monster outbreaks, bosses (King Slime → Demon Cyclops), multi-floor Old Cave dungeon
- Gear discovered from treasure chests or developed at the Blacksmith with monster materials; shops sell what you've unlocked
- Events paid in Town Points (festival, hunting contest, sale, recruitment, expand village)
- Vanilla ES modules, no build step; fixed-step sim with tick budget, seeded RNG, typed-array A*; integer pixel scaling; iPad/phone layouts
- Plan: [docs/V2_REBUILD_PLAN.md](./docs/V2_REBUILD_PLAN.md) · v1 review: [docs/V1_REVIEW.md](./docs/V1_REVIEW.md) · run locally: `python3 v2/tools/serve.py 8766 .` → http://localhost:8766/v2/?new
- **Working on v2 (humans and AI agents): start with [v2/AGENTS.md](./v2/AGENTS.md).** One-command check: `node v2/tests/check.mjs` (`--full` for balance).
- Docs: [architecture](./v2/docs/ARCHITECTURE.md) · [recipes](./v2/docs/RECIPES.md) · [assets](./v2/docs/ASSETS.md) · [testing](./v2/docs/TESTING.md) · [deploy](./v2/docs/DEPLOY.md) · [DV2 parity & roadmap](./v2/docs/DV2_PARITY.md) (tracking issue #44)

---

## v1 (legacy, repo root)

Personal autonomous management RPG / roguelite prototype inspired by the management loops of Dungeon Village and Kingdom Adventurers, with original code, naming and visuals.

Live: https://karmiphuc.github.io/wayfarer-guild/

Current: v0.7.18 · save schema v6 (localStorage `wayfarerGuildV2`, migrates older saves) · no stamina meters, no premium currency — progression runs on Gold, materials, fame and rank.

## How it plays

### Autonomous adventurers
- Utility-driven eating, resting, training, shopping, farming, wandering and field combat
- Ranged, magic, healing, guard and ambush combat behavior
- KO + rescue-to-inn behavior
- Residents and visitors with Satisfaction / Work / housing
- Autonomous equipment purchases from discovered shop stock

### Jobs and equipment
- Job levels and mastery
- Permanent stat growth based on jobs trained
- Mastery skills that persist after job changes
- 4 equipment slots
- Random equipment rarity / affixes
- Blue dungeon treasure can discover new equipment bases for town shops
- Auto-equip and salvage automation

### Quests and dungeons
- One active quest at a time
- Mob, boss and dungeon quests
- Dungeons now have a physical tile map
- Party members A* path through rooms autonomously
- Real dungeon combat, healing, camps, elites, treasure and bosses
- Switch between live town view and live dungeon view

### Kingdom / town
- Village popularity and 5-star rank progression (no Town Points — removed in v0.7.4)
- Buildable and upgradable facilities with quality, appeal, income and upkeep
- Research-gated facilities and jobs
- Fog-of-war frontier deployment and resource gathering
- Roaming boss invasions that advance toward town and drain popularity if they break through

### Monster companions
- Shining monsters can drop eggs after Monster Stable research
- Stable incubation
- Hatchable companions with stat bonuses and bond
- Assign companions to residents
- Rideable companions become mounts at high bond, increasing movement speed

### Save / deployment
- Local autosave
- JSON save export/import for device transfer
- Older saves migrate forward (current schema v6)
- Responsive iPad/mobile layout
- Hosted through GitHub Pages from this repo's `main` branch root (`index.html`)

### Presentation
- Twelve jobs, twelve distinct outfits (one CC0 family); layered weapons/gear remain the only wield source
- Procedural WebAudio: generative town/night/dungeon loops, ambient beds, UI + combat SFX, Music/SFX sliders


## Project memory & plan

The repository is now the durable source of truth for the game's direction:

- [Vision](./docs/VISION.md) — what the game should feel like and what it should never become
- [Roadmap](./docs/ROADMAP.md) — phased path from the current prototype to a polished personal 1.0
- [Backlog](./docs/BACKLOG.md) — pending work and ideas, linked to GitHub issues
- [Project knowledge base](./docs/PROJECT_KNOWLEDGE_BASE.md) — current architecture, evidence ledger, active bug slice and acceptance checks
- [Asset & audio plan](./docs/ASSETS_AND_AUDIO.md) — pixel-art/music/SFX direction and licensing rules
- [Asset attribution ledger](./ASSET_ATTRIBUTION.md) — provenance for every third-party file actually used
- [Agent working agreement](./AGENTS.md) — rules future coding sessions should follow

Current priorities are architecture/data-driven content ([#1](https://github.com/karmiphuc/wayfarer-guild/issues/1)), the first cohesive pixel-art pass ([#2](https://github.com/karmiphuc/wayfarer-guild/issues/2)), and music/SFX ([#3](https://github.com/karmiphuc/wayfarer-guild/issues/3)).
