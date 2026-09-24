# Wayfarer Guild

Personal autonomous management RPG / roguelite prototype inspired by the management loops of Dungeon Village and Kingdom Adventurers, with original code, naming and visuals.

Live: https://karmiphuc.github.io/wayfarer-guild/

## v0.3

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
- Village popularity, Town Points and 5-star rank progression
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
- v0.2 saves migrate to v0.3
- Responsive iPad/mobile layout
- Hosted through GitHub Pages from `master/wayfarer-guild/index.html`


## Project memory & plan

The repository is now the durable source of truth for the game's direction:

- [Vision](./docs/VISION.md) — what the game should feel like and what it should never become
- [Roadmap](./docs/ROADMAP.md) — phased path from the current prototype to a polished personal 1.0
- [Backlog](./docs/BACKLOG.md) — pending work and ideas, linked to GitHub issues
- [Project knowledge base](./docs/PROJECT_KNOWLEDGE_BASE.md) — current architecture, evidence ledger, active bug slice and acceptance checks
- [Asset & audio plan](./docs/ASSETS_AND_AUDIO.md) — pixel-art/music/SFX direction and licensing rules
- [Asset attribution ledger](./ASSET_ATTRIBUTION.md) — provenance for every third-party file actually used
- [Agent working agreement](./AGENTS.md) — rules future coding sessions should follow

Current priorities are architecture/data-driven content ([#19](https://github.com/karmiphuc/karmiphuc.github.io/issues/19)), the first cohesive pixel-art pass ([#20](https://github.com/karmiphuc/karmiphuc.github.io/issues/20)), and music/SFX ([#21](https://github.com/karmiphuc/karmiphuc.github.io/issues/21)).
