# Wayfarer Guild — Agent Working Agreement

This file is the durable instruction set for future coding/agent sessions on Wayfarer Guild.

Before making a meaningful game change, read:

1. `README.md`
2. `docs/VISION.md`
3. `docs/ROADMAP.md`
4. `docs/BACKLOG.md`
5. `docs/ASSETS_AND_AUDIO.md`
6. `ASSET_ATTRIBUTION.md`

## Product rules

- **Autonomy first.** Pawns should make believable choices themselves. The player shapes incentives, policies, facilities, jobs, equipment and expedition conditions rather than manually driving every pawn.
- **Randomness should create stories, not chores.** Random traits, loot, visitors, encounters and dungeon routes are good. Repeating low-value clicks, mandatory rerolls, energy timers and grind-for-grind's-sake are not.
- **Town and RPG are one loop.** Town facilities, resident spending, job mastery, equipment discovery, dungeon loot and frontier exploration must feed each other.
- **Watching should be fun.** A player should be able to leave the simulation running and see interesting, readable behavior without constant intervention.
- **Failure should sting, not erase attachment.** Default play uses KO, injuries, fatigue, lost unbanked loot or setbacks rather than routine permanent character deletion.
- **Performance is a feature.** Avoid pathfinding or radial scans every render frame. Prefer fixed-step simulation, scheduled decisions, cached paths and event-driven recalculation.
- **iPad/browser is a first-class target.** Touch targets, responsive panels, save safety and long-session performance matter.
- **Original expression only.** We may closely study the gameplay loop, pacing and management feel of Dungeon Village / Dungeon Village 2 / Kingdom Adventurers, but never copy/rip their sprites, music, sounds, maps, UI art, text or proprietary data.

## Visual/audio rules

- Prefer CC0/public-domain assets when possible.
- Kenney is the default first-stop source.
- CC-BY / OGA-BY is allowed only when attribution is recorded in `ASSET_ATTRIBUTION.md`.
- An asset being free to download does **not** mean it is safe to use.
- Do not add CC-BY-NC assets; preserve future freedom even though this is currently a personal project.
- Do not commit assets whose license forbids redistribution into this public repository.
- Keep a coherent pixel-art language instead of mixing random free packs unchanged. Recolor, crop, redraw or adapt compatible permissive assets when useful, while respecting their licenses.

## Engineering rules

- New jobs/items/buildings/monsters/biomes should be data-driven wherever practical.
- Save schema changes require a migration path.
- Do not break existing saves casually.
- Keep simulation logic separated from rendering/UI as the project is modularized.
- Validate syntax/content references before publishing.
- Work on a branch for risky changes; publish to `master` only after validation.
- The public URL must remain: https://karmiphuc.github.io/wayfarer-guild/

## Project hygiene

When completing meaningful work:
- update the corresponding GitHub issue;
- update `docs/BACKLOG.md` if status or priority changed;
- update `docs/ROADMAP.md` when a phase moves;
- add every new third-party asset to `ASSET_ATTRIBUTION.md`;
- document any design decision that materially changes the vision.

The target is not “clone every screen.” The target is a genuinely excellent, personal, autonomous fantasy management RPG that captures the addictive observation/buildcraft/exploration loop while removing mobile grind.
