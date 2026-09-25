# Roadmap

Status: **v0.6.9 systems/art prototype live**

Live build: https://karmiphuc.github.io/wayfarer-guild/

This roadmap is ordered by leverage rather than novelty. The live prototype has moved beyond the original phase numbering, so version numbers now reflect shipped slices rather than these historical phase labels.

Current priority: deepen pawn autonomy/personality before adding more content breadth. The v0.6.9 isometric facility renderer is explicitly an interim programmer-art solution; the authored building-art target remains open and should match the stronger isometric concept-sheet quality bar rather than merely use angled procedural geometry.

## Phase 0 — Current baseline: v0.3 ✅

Already present:
- autonomous town pawns;
- residents/visitors/housing;
- facilities and resident spending;
- jobs, mastery and permanent growth;
- gear, rarity, discoveries and auto-equip;
- field monsters, KO and rescue;
- physical autonomous dungeon traversal;
- quests, bosses and town popularity;
- fog exploration/gathering;
- monster eggs, companions and mounts;
- GitHub Pages deployment;
- iPad-responsive UI;
- local save plus export/import.

## Phase 1 — v0.4: Make it look and sound like a real game

### P0: modularize the prototype
Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/19

Goals:
- separate simulation/render/UI/content/save/audio modules;
- move game content to data definitions;
- preserve save migration;
- add repeatable validation before deploy.

### P0: first cohesive pixel-art pass
Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/20

Goals:
- remove placeholder geometry/emoji as primary game art;
- establish logical pixel grid and integer scaling;
- one complete town tileset;
- adventurer archetypes;
- core facilities;
- field monsters;
- one complete dungeon biome;
- VFX and pixel UI.

### P0: audio foundation
Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/21

Goals:
- audio manager;
- music / ambience / SFX channels;
- town and dungeon loops;
- tactile UI/combat/loot sounds;
- persisted volume settings.

**v0.4 exit test:** one town and one dungeon should feel intentionally art-directed rather than prototyped.

## Phase 2 — Make the pawns lovable — 🚧 current focus

Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/22
and https://github.com/karmiphuc/karmiphuc.github.io/issues/25

Goals:
- personality-weighted utility AI;
- preferences/aversions;
- friendships/rivalries;
- memories;
- self-selected party affinity;
- risk tolerance and autonomous retreat;
- richer thought/speech feedback;
- more facilities and resident economy;
- events, visitors, merchants and invasions;
- day/night;
- retirement into useful town roles.

**v0.5 exit test:** two same-job/same-level characters should still feel meaningfully different to observe.

## Phase 3 — v0.6: RPG/buildcraft depth

Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/23

Goals:
- full base → advanced → hybrid job tree;
- limited inherited mastery slots;
- equipment family preferences;
- larger item catalog;
- biome/tier affix pools;
- mechanically interesting uniques;
- forge/crafting/research loops;
- loot keep/salvage/equip policies;
- low-micro consumables and gifts.

**v0.6 exit test:** multiple distinct builds should be viable for tank, melee DPS, ranged DPS, caster, healer/support and utility/scout.

## Phase 4 — v0.7: Dungeon and frontier depth

Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/24

Goals:
- multiple physical dungeon layouts;
- semi-procedural room graphs;
- several biomes;
- events, merchants, shrines and camps;
- temporary run blessings/curses;
- fatigue/supplies;
- push deeper vs extract;
- biome counters;
- unique bosses and drops;
- threat modifiers after first clear;
- more frontier structures/resources/encounters.

**v0.7 exit test:** repeating a dungeon can produce genuinely different stories and builds.

## Phase 5 — v0.8/v0.9: Content density, balance and mobile hardening

Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/26

Goals:
- tune economy and pacing;
- 30–60 pawn performance target;
- simulation profiling;
- robust background/resume behavior;
- polished touch controls;
- save corruption recovery;
- optional cross-device sync investigation;
- progression/tutorial clarity;
- content/balance passes.

## v1.0 definition

Aim for a polished personal game, not a forever-prototype.

Minimum 1.0 target:
- 20+ meaningful jobs;
- 6+ job archetype paths/hybrids;
- 50+ meaningful equipment bases plus affixes/uniques;
- 20+ facilities/upgrades/specializations;
- 5+ dungeon/frontier biomes;
- 30+ monster/elite/boss variants;
- 10+ companion species;
- 50+ events/encounters;
- cohesive pixel visuals;
- complete music/SFX pass;
- a balanced multi-hour progression arc;
- smooth iPad/browser play;
- no required repetitive grind.

## Working order

Unless a bug is blocking the live build:

1. autonomy/personality and town-life depth (#22, #25)
2. P0 architecture cleanup (#19)
3. authored pixel-art pipeline / building atlas (#20)
4. audio foundation beyond procedural combat SFX (#21)
5. jobs/items depth (#23)
6. dungeons/frontier (#24)
7. mobile/performance/save (#26)

Update this file when priorities change.
