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

## Now — v0.4 foundations

### Active bugfix slice — facilities, housing and frontier autonomy

- Pawn recovery follow-up: combined hunger/exhaustion/injury, combat/rescue disengagement, HP-aware Camp, Knight/Paladin eligibility, Researcher Study, explicit Recall recovery and failed-save preservation have deterministic regression coverage. Rendered browser verification remains open.
- ✅ **30-pawn town expansion baseline** — map expanded from 38×23 to 38×33 without moving existing coordinates; a fixed-scale 23-row camera pans to the southern district, v4 saves migrate to v5, construction has a green/red footprint and rejection reason, population cap is 30, and frontier monster density scales with population. Touch confirmation and rendered browser verification remain open. See [building placement plan](./BUILDING_PLACEMENT_PLAN.md). Tracks #25 and #26.
- 🚧 **Dungeon Village-style visible quest loop** — field quests now spawn visible monster packs; volunteers walk out, fight, gather, carry and return before rewards deposit. Mid-operation save/resume is covered. Direction and research: [Dungeon Village direction](./DUNGEON_VILLAGE_DIRECTION.md). Next: ordinary exploration hauling and facility activity feedback. Maps to #22, #24 and #25.
- ✅ **Persistent carried equipment** — equipped swords, bows, staves, axes and hammers are visible beside pawns in town and dungeons and follow attack motion. Wood/round shields, spellbooks and restrained coat/mail/robe/cloak cues complete the readable equipment silhouette. Unarmed jobs show a training weapon until they acquire equipment.
- ✅ **Equipment gifting and role fit** — stash gear can be gifted directly to the selected available pawn; gifted slots remain reserved from role-aware auto-equip, improve satisfaction, survive saves, and can be released by re-enabling auto-equip. Next: rendered scale/overlap verification and stronger Forge/shop presentation.

- 🚧 **P0 Restore facility and pawn-state contracts** — research-gated Farm/Forge placement, starting-home assignment, home-based recovery, Forge work, and job-led frontier exploration. Evidence and acceptance checks: [project knowledge base](./PROJECT_KNOWLEDGE_BASE.md). Maps to #22, #23, #24 and #25.

- ⏳ **P0 Modular architecture/data-driven content** — [#19](https://github.com/karmiphuc/karmiphuc.github.io/issues/19)
- ⏳ **P0 Cohesive licensed pixel-art pipeline** — [#20](https://github.com/karmiphuc/karmiphuc.github.io/issues/20)
- ⏳ **P0 Music/ambience/SFX foundation** — [#21](https://github.com/karmiphuc/karmiphuc.github.io/issues/21)

### Small pending tasks inside v0.4
- [ ] choose final logical pixel grid (default proposal: 16px)
- [ ] define Wayfarer palette
- [ ] choose first terrain/building pack(s)
- [ ] replace emoji building labels with sprite/icon rendering
- [ ] animate pawn walk cycles
- [ ] add hit/heal/loot/KO VFX
- [ ] add audio manager and volume settings
- [ ] select first town/dungeon music loops
- [ ] create deterministic smoke-test harness
- [ ] split content definitions out of simulation code

## Next — pawn/town life

- ⏳ **P1 Pawn personality/social/autonomy depth** — [#22](https://github.com/karmiphuc/karmiphuc.github.io/issues/22)
- ⏳ **P1 Town economy/facilities/events/content density** — [#25](https://github.com/karmiphuc/karmiphuc.github.io/issues/25)

Pending ideas:
- [ ] risk tolerance
- [ ] facility likes/dislikes
- [ ] friendships/rivalries
- [ ] “rescued by” memories
- [ ] favorite enemy/dungeon
- [ ] autonomous retreat/extraction
- [ ] party affinity
- [ ] day/night routine bias
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
