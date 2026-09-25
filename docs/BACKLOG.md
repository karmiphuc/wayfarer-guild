# Backlog

This is the human-readable tracker. GitHub issues hold implementation details.

Legend:
- **P0** = do before expanding content heavily
- **P1** = core game depth
- **P2** = polish/content after foundations
- ✅ done
- 🚧 active
- ⏳ queued
- 💡 idea

## Now — live prototype priorities

### Active bugfix slice — facilities, housing and frontier autonomy

- Pawn recovery follow-up: combined hunger/exhaustion/injury, combat/rescue disengagement, HP-aware Camp, Knight/Paladin eligibility, Researcher Study, explicit Recall recovery and failed-save preservation have deterministic regression coverage. Rendered browser verification remains open.
- ✅ **30-pawn town expansion baseline** — map expanded from 38×23 to 38×33 without moving existing coordinates; a fixed-scale 23-row camera pans to the southern district, v4 saves migrate to v5, construction has a green/red footprint and rejection reason, population cap is 30, and frontier monster density scales with population. Touch confirmation and rendered browser verification remain open. See [building placement plan](./BUILDING_PLACEMENT_PLAN.md). Tracks #25 and #26.
- 🚧 **Dungeon Village-style visible quest loop** — field quests now spawn visible monster packs; volunteers walk out, fight, gather, carry and return before rewards deposit. Mid-operation save/resume is covered. Direction and research: [Dungeon Village direction](./DUNGEON_VILLAGE_DIRECTION.md). Next: ordinary exploration hauling and facility activity feedback. Maps to #22, #24 and #25.
- ✅ **Persistent directional equipment** — equipped swords, bows, staves, axes and hammers are visible beside pawns in town and dungeons, face their travel/attack direction and follow attack motion. Wood/round shields and spellbooks occupy the opposite hand; restrained coat/mail/robe/cloak cues complete the readable silhouette. Unarmed jobs show a training weapon until they acquire equipment.
- ✅ **Equipment gifting and role fit** — stash gear can be gifted directly to the selected available pawn; gifted slots remain reserved from role-aware auto-equip, improve satisfaction, survive saves, and can be released by re-enabling auto-equip. Next: rendered scale/overlap verification and stronger Forge/shop presentation.
- ✅ **Gift/shop equipment contract** — adventurers still buy upgrades autonomously while physically using the Weapon Shop, but shop AI cannot charge for or replace player-reserved gifts; an accepted purchase immediately changes the carried equipment.
- ✅ **Reversible loadouts** — the Gear pane shows the selected adventurer's four equipment slots, marks gifted reservations, and can return individual items to the stash without losing item identity or disturbing other slots.
- ✅ **Readable equipment payoff** — uncommon/rare/epic/unique carried weapons and offhands show compact rarity glints; gifting produces a rarity-colored EQUIPPED pop and a pawn celebration on the town map.

- 🚧 **P0 Restore facility and pawn-state contracts** — research-gated Farm/Forge placement, starting-home assignment, home-based recovery, Forge work, and job-led frontier exploration. Evidence and acceptance checks: [project knowledge base](./PROJECT_KNOWLEDGE_BASE.md). Maps to #22, #23, #24 and #25.

- ⏳ **P0 Modular architecture/data-driven content** — [#19](https://github.com/karmiphuc/karmiphuc.github.io/issues/19)
- 🚧 **P0 Cohesive pixel-art pipeline** — [#20](https://github.com/karmiphuc/karmiphuc.github.io/issues/20)
  - Character/monster mapping is now materially better.
  - **Facility art is NOT complete:** v0.6.9 is only an interim procedural isometric renderer and misses the authored concept-sheet quality bar.
  - Next serious building-art pass should use authored isometric pixel sprites/atlas with strong silhouettes, roof volume, texture, landscaping and facility-specific composition rather than canvas geometry.
- ⏳ **P0 Music/ambience/SFX foundation** — [#21](https://github.com/karmiphuc/karmiphuc.github.io/issues/21)

### Small pending tasks inside v0.4
- [x] 16px source-pixel art grid with integer/nearest-neighbor scaling
- [ ] define Wayfarer palette
- [ ] choose first terrain/building pack(s)
- [x] building identity no longer relies on emoji labels; authored building atlas still pending
- [x] procedural gait/facing/dust pass; authored multi-frame walk cycles remain future art polish
- [x] hit/heal/loot/KO/crit/victory combat feedback
- [ ] add audio manager and volume settings
- [ ] select first town/dungeon music loops
- [ ] create deterministic smoke-test harness
- [ ] split content definitions out of simulation code

## Next — pawn/town life

- 🚧 **P1 Pawn personality/social/autonomy depth** — [#22](https://github.com/karmiphuc/karmiphuc.github.io/issues/22) — active in v0.7.0
- ⏳ **P1 Town economy/facilities/events/content density** — [#25](https://github.com/karmiphuc/karmiphuc.github.io/issues/25)

Pending ideas:
- [x] persistent personality dimensions + readable trait labels
- [x] risk tolerance and autonomous retreat
- [x] personality-weighted facility/activity preferences
- [ ] friendships/rivalries
- [x] “rescued by” memories
- [ ] favorite enemy/dungeon
- [ ] autonomous retreat/extraction
- [ ] party affinity
- [x] day/night routine bias
- [ ] traveling merchant
- [ ] seasonal/festival events
- [ ] retirement into town specialist roles
- [x] first save-compatible southern town expansion

## Next — RPG depth

- ⏳ **P1 Jobs/mastery/equipment/buildcraft** — [#23](https://github.com/karmiphuc/karmiphuc.github.io/issues/23)

Pending:
- [ ] full job graph
- [ ] limited inherited mastery skill slots
- [ ] weapon family preferences
- [ ] job-specific AI behavior
- [ ] item tiers by biome
- [ ] affix pools
- [ ] unique items with mechanical hooks
- [ ] forge crafting and rerolls
- [ ] loot filters/keep rules
- [ ] low-micro consumables/gifts

## Next — dungeons/frontier

- ⏳ **P1 Physical dungeon + roguelite depth** — [#24](https://github.com/karmiphuc/karmiphuc.github.io/issues/24)

Pending:
- [ ] multiple room graphs
- [ ] crypt biome
- [ ] forest ruin biome
- [ ] cave biome
- [ ] mountain/dragon biome
- [ ] shrine/event/merchant rooms
- [ ] run-only blessings
- [ ] run-only curses
- [ ] supplies/fatigue
- [ ] push deeper / extract decision
- [ ] threat modifiers
- [ ] biome-specific loot tables
- [ ] boss mechanics
- [ ] more egg/companion species

## Platform / robustness

- ⏳ **P1 iPad/mobile/performance/save hardening** — [#26](https://github.com/karmiphuc/karmiphuc.github.io/issues/26)

Pending:
- [ ] profile 30 active pawns
- [ ] profile 60 active pawns
- [ ] path cache/replan rules
- [ ] background tab pause/resume
- [ ] save backup slot
- [ ] corrupted-save fallback
- [ ] better import/export UX
- [ ] PWA/home-screen evaluation
- [ ] optional cross-device sync design

## Content ideas — not scheduled yet

- 💡 named hero backgrounds with small gameplay hooks
- 💡 rare wandering masters who teach unusual jobs
- 💡 guild policies (“keep 3 defenders”, “avoid threat > 3”)
- 💡 rival adventuring guild
- 💡 town defense waves
- 💡 caravan routes
- 💡 crafting commissions
- 💡 hero retirement statues/legacy bonuses
- 💡 procedural scars/titles from memorable runs
- 💡 codex research for monsters/materials
- 💡 weather influencing activities/biomes
- 💡 inns/taverns generating rumors that reveal dungeons
- 💡 dungeon-specific camp dialogue
- 💡 pet personalities
- 💡 breeding/evolution only if it adds choices rather than grind

## Completed baseline

- ✅ autonomous utility decisions
- ✅ A* town pathing
- ✅ residents/visitors/housing
- ✅ resident spending
- ✅ job leveling/mastery
- ✅ permanent growth
- ✅ equipment/affixes
- ✅ equipment discovery → shop stock
- ✅ field combat
- ✅ KO/rescue
- ✅ quests
- ✅ physical autonomous dungeon traversal
- ✅ role-aware range/healing basics
- ✅ frontier fog exploration
- ✅ roaming bosses
- ✅ monster eggs/companions/mounts
- ✅ responsive iPad layout
- ✅ local saves
- ✅ export/import
- ✅ GitHub Pages continuous publication
- ✅ v0.5.1 basic pawn-state hardening: hunger/eating deadlock fixed, zero-provision fallback meals, no-Tavern foraging, no-Inn camping, KO self-recovery, stale target repair, unreachable rescue/building fallbacks, v3→v4 save repair
- ✅ state regression harness covering Eat, Rest, Train, Pray, Study, Farm, Patrol/Fight, Rescue, KO, stale targets and old-save reloads
- ✅ v0.5.2 combat feedback: compact pixel resource icons, melee lunges/slashes, arrows, magic/holy projectiles, hit bursts, healing effects and floating combat numbers in town and dungeons
- ✅ v0.5.3 combat juice: anticipation→lunge→recoil motion, enemy attack motion, target knockback, crit bursts, weapon-specific slash/axe/hammer/ranged/magic effects, AoE rings, KO falls, defeat bursts, victory hops and procedural combat SFX

When an item becomes real work, give it an issue. When an issue is finished, update this file.

- ✅ v0.6.4 town-life polish: real-time walking cadence/dust, facility enter/exit puffs and in-door occupancy, facility activity bubbles, XP/coin/loot pops, Kairosoft-style level-up banners, denser deterministic pixel decoration

- ✅ v0.6.5 activity rotation: rotating frontier-duty cohort, quest volunteer fairness/history, all combat jobs eligible for exploration, resident sleep schedule, night lighting, stronger night monster pressure, duty/quest history visible in pawn inspector

- ✅ v0.6.6 job identity: every job can fight/explore/quest; worker jobs rotate onto frontier duty while retaining specialty work, exact job effects shown in inspector/job chooser, Farmer/Blacksmith/Researcher bonuses made mechanical, and all Lv.10 mastery skills now have real effects

- ✅ v0.6.7 sprite alignment: original 12-job sprite set and species-specific monster set; explicit mappings for Slime/Batling/Goblin/Bonewalker/Dire Boar and roaming bosses; corrected Fighter/worker-role visuals; cached compact sprite decoder for runtime performance

- ✅ v0.6.8 facility art: distinct visual identities for all 13 facility types, unique pixel emblems/exterior props, animated Forge smoke/occupied-building sparkles, automatic door-to-road paths, compact level markers, and full day/night render coverage

- ✅ v0.6.9 isometric facilities: replaced flat tile-box buildings with cached low-resolution 3/4 isometric pixel sprites, nearest-neighbor scaled in-game; all 13 facilities have distinct silhouettes/props, depth-sorted drawing, Forge smoke/activity sparkles, and unchanged logical footprints/pathfinding

- ⚠️ **v0.6.9 quality-bar correction:** the procedural isometric facility renderer is useful as an interim readability pass but does **not** meet the approved building concept art. Do not treat building visuals as complete. Keep the concept sheet as the target for a later authored atlas pass.

- ✅ v0.7.0 personality/autonomy first slice: deterministic persistent Courage/Curiosity/Sociability/Discipline/Compassion, two readable trait labels, explicit Likes/Avoids, personality-weighted utility AI, courage-based fight seeking and HP retreat thresholds, 45s post-retreat cooldown, visible thoughts, retreat memories and rescued-by memories. Same-job/same-level regression: Bold/Curious Fighter patrols while Cautious/Homebody Fighter trains; at 40% HP the cautious pawn retreats while the bold pawn continues.

- ✅ v0.7.1 character readability: rebuilt all 12 job silhouettes around oversized class anchors (helmet/shield, hood/bow, hat/staff, hammer, straw hat/hoe, book, etc.); simplified palettes; increased pawn sprite size; rebuilt 12 monster silhouettes around species-first body shapes; verified boar/bat/wasp/skeleton/ogre/cyclops/warlock/wyrm mappings and kept RLE sprites only as fallback.
- 🚧 v0.7.2 licensed sprite migration: nine combat jobs and slimes now prefer Shade's CC0 Puny Characters animation sheets, with actual equipped armor/offhands/weapons layered around the body in town and dungeons. Farmer, Blacksmith, Researcher and unsupported monsters deliberately retain the v0.7.1 readable fallback pending a compatible free sheet and rendered review.
- ✅ v0.7.2 retreat safety: an existing retreat cooldown suppresses duplicate memories/log spam but no longer traps critically hungry or exhausted pawns in combat.
- ✅ v0.7.2 recovery target repair: restored the missing random town destination used by outdoor rest, night camp, KO self-recovery and no-Inn rescue fallbacks.
- 🎯 **Character art acceptance bar:** at normal gameplay zoom, class/species must be identifiable primarily from silhouette + dominant color + oversized tool/weapon. Do not trade this away for micro-detail or generic RPG-pack prettiness.
