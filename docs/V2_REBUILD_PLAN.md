# Wayfarer Guild v2 — Rebuild Plan

## Why rebuild instead of refactor
v0.7.22 review found: 7 art packs + 3 procedural styles mixed (top-down tiles under pseudo-iso buildings),
fractional scaling, a sprite-cache race that leaves most buildings procedural, a 1000-grid-alloc-per-decision
pathfinding hot loop, and a text-inspector UI. Missing DV2 pillars: world map, facility combos/adjacency,
item shops, real raids. Worth mining for data/AI ideas, not for code.

## Art direction — one pack, integer scale
- **Ninja Adventure (pixel-boy, CC0)** for everything: tiles, buildings, 60+ characters (4-dir walk/attack),
  60+ monsters, 16 bosses, item icons, emotes, UI 9-slice, pixel font, 27 music tracks, SFX.
- 16px tiles, rendered at integer zoom (2–5×), `imageSmoothingEnabled=false`.
- Every file used is copied into `v2/assets/` and listed in `ASSET_ATTRIBUTION.md`.
- Kairosoft art, music, text, UI and data are never copied. We clone the loop, not the content.

## Tech
- Vanilla ES modules, Canvas 2D, zero build step (GitHub Pages serves `v2/` as is).
- Fixed-step sim (10 ticks/s × speed multiplier, run as N steps, never bigger dt).
- Cached occupancy/walk grid, invalidated on build events only; binary-heap A*; path cache.
- Sim state is plain JSON (save = `JSON.stringify(state)`), render/UI read-only.
- Modules: `data.js` · `assets.js` · `state.js` · `path.js` · `sim.js` (agents/economy/calendar) ·
  `combat.js` · `world.js` (regions/expeditions/raids) · `render.js` · `ui.js` · `audio.js` · `main.js`.

## Game design (DV2 loop)
1. **Calendar**: Year / Month / Week (4 weeks). ~30 s per week at 1×. Monthly settlement (income, upkeep, report).
2. **Build**: place facilities on a 40×30 grid (footprints 2×2–4×3), roads (speed bonus), decor. Move/sell.
   Facilities level up (cost gold + materials) → capacity, price, appeal.
3. **Appeal & combos**: decor within radius raises a facility's appeal (visit chance + price).
   Named combos: specific facility sets within N tiles → persistent bonus + popup + sparkle.
4. **Adventurers**: visitors arrive via the gate (rate ∝ popularity). Needs: hunger, energy, fun, gear.
   Utility AI picks: shop / eat / sleep / train / hunt outside / go home. Spend gold → village income.
   Satisfaction ≥ threshold → "wants to live here" → player invites (needs a free House slot).
   Residents: level, stats, job, equipment, partner monster. Job change at Guild Hall.
5. **Shops & development**: Weapon/Armor/Item shops sell developed items. Develop new items at the
   Blacksmith using materials. Adventurers auto-buy upgrades they can afford.
6. **World map**: 7×7 region grid around the village; biomes, monster sets, levels, fog.
   Send parties to explore regions (materials, unlock next ring) and to take quests (hunts, bosses).
   Expeditions play out in a watchable field view (auto-battle with FX) and resolve deterministically.
7. **Raids**: periodic monster waves walk in from the map edge; residents and Watchtowers defend.
8. **Monsters**: defeated monsters may ask to join (needs Stable). They wander town, can partner a resident.
9. **Rank**: village points from popularity + facilities + quests → rank 1–10, unlocks facilities/regions.
10. **UI**: Kairosoft grammar — top info bar, bottom icon menu, 9-slice wood windows, scrolling event ticker,
    facesets in lists, emote bubbles over pawns, coin pops.
11. **Save**: localStorage autosave + JSON export/import, `schema` version field.

## Salvaged from v0.7.22
Personality-biased utility AI idea, job/item/affix tables (re-balanced), save-migration pattern,
vm-stub smoke test pattern.

## Deploy
Branch `feature/opus-rebuild`, served at `/wayfarer-guild/v2/`; v1 stays at root until v2 is promoted.
