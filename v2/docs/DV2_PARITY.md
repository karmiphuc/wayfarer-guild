# Dungeon Village 2 parity map & roadmap

Goal: play like Kairosoft's *Dungeon Village 2* (mechanics and feel) with our own code and CC0 art — never Kairosoft assets.
Sources (primary): Kairosoft fandom wiki pages for DV2 — Jobs, Structures, Cauldron, Events, Titles, Tips, Manual —
and the Japanese strategy wiki (wikiwiki.jp/kairoparknew/bouken2). Items marked *unverified* need a playthrough check.

Legend: ✅ done · 🟡 partial / different · ❌ missing. Issue numbers link to GitHub (`karmiphuc/wayfarer-guild`, label `dv2-parity`).

**DV2 numbers are reference only.** Prices, thresholds and formulas quoted below and in the issues (Inn 900/100/80, Work
135/167/200, station prices, Cauldron recipes, score formula, Rearrange 200G…) come from fan wikis and were not verified in a
playthrough. Never hard-code them as targets: our numbers come from the bot soak and boss probe (`check.mjs --full`).

## 1. Parity matrix

| DV2 system | DV2 behaviour (short) | v2 today | Status | Issue |
|---|---|---|---|---|
| Town in a monster field | adventurers hunt around the town, come back to spend | same | ✅ | — |
| Calendar | year / month / 4 weeks; taxes Apr W1; medals Dec W4; evaluation Mar W4 | calendar + April taxes | 🟡 | #28 |
| Build / Road / Removal / Rearrange | place, remove (50G), rearrange (200G, unlock) | place/remove, contiguous drag-painted roads and palisades; no move | 🟡 | #29 |
| Stream, Bridge, Iconic Statue | terrain decor; statue = meeting point | — | ❌ | #29 |
| Facility stats | each store has Price, Quality, Appeal; items/upgrades raise them; duplicates add capacity | one appeal + level 1–5 | 🟡 | #19 |
| Facility catalogue | ~35 stores, ~21 food outlets, 5 castles, unlocked by Facility Store level / stars / events | 16 facilities, 17 decor | 🟡 | #38 |
| Houses | Vacant House built when someone wants to move in; 11 house styles with House trait | House / Hut / Snow Lodge | 🟡 | #21 |
| Visitors → residents | satisfaction → ask to settle → move-in gift | satisfaction ≥ 60 + free home | 🟡 | #21, #22 |
| Adventurer stats | HP/ATK/DEF/MAG from base Health/Strength/Dexterity/Toughness/Spirit/Luck | HP/ATK/DEF/MAG only | 🟡 | #20 |
| Satisfaction & Work (0–999) | gifts raise both; Work multiplies stats, auras at high Work | both exist; gold gifts only | 🟡 | #22 |
| Gifts | gift items/equipment; job-preferred items; bundles of 3; diminishing Work gains | Gift 50G button | 🟡 | #22, #18 |
| Jobs | ~50 jobs, mastered at Lv10 (cap 99), cost TP, prerequisites, medals; race jobs can't change | 29 combat jobs, tiers, prerequisites | 🟡 | #36 |
| Job passive ("Bonus") | active while in the job: Merchant +store sales, Ninja faster dungeons, Cook +food sales… | — (we only have mastery perks) | ❌ | #23 |
| Mastery bonus | permanent +20/30 base stat or a learned spell | permanent stacking perks | 🟡 | #30, #20 |
| Magic & status | Fire/Ice/Lightning/Dark/Heal spells; Burn, Freeze, Paralysis, Poison, Confusion, Sleep, Blind | fireball splash, burn perk | 🟡 | #30 |
| Equipment | 4 slots: Weapon, Armor 1 (head/shield), Armor 2 (body), Accessory; shops stock unlocked gear | 3 slots (weapon/armor/acc), 70 ordinary items + 8 single-copy frontier relics | 🟡 | #31 |
| Treasure & gear unlocks | gold chests unlock gear; Luck affects contents | chests unlock gear | ✅ | #20 |
| Collectible items | food, merch, ores, gems, spellbooks as drops/purchases; used for gifts, facility boosts, Cauldron | — | ❌ | #18 |
| Cauldron | throw items → Fire/Ice/Lightning/Dark essences + knowledge; recipes: weapons, spellbooks, houses, castles; enlarge events | Blacksmith develop (materials) | ❌ | #40 |
| Town Traits & Titles | trait points from buildings/items/events/jobs/monsters/quests; titles at thresholds; event points decay; negative traits (Danger) | 9 traits, 9 titles from buildings/decor/monsters | 🟡 | #32 |
| Town Points & events | TP monthly from kills; ~45 events: satisfaction, stat training, popularity, Monsterology, Expand Town 1/2, Cauldron, Harbor; limit per season; Butler/Maid/Rescue Squad discounts | 5 events, no season limit | 🟡 | #34 |
| Local residents | trait thresholds unlock local customers; Cart/Balloon/Blimp stations bring 2/6/8 | ambient townsfolk from trait totals | 🟡 | #33 |
| Farmland | produce vegetables/fruit; Farmer speeds it | — | ❌ | #35 |
| Quests | Dungeon / Mob group (Outbreak) / Boss / Counterattack; start fee + recruitment fee for non-volunteers; sales dip while away | no concurrent quest cap; Instant Depart or 4 random capable defaults, up to 8 with paid extras; Depart above party picker | 🟡 | #25 |
| Dungeons | multi-floor, treasure; Ninja/Mercenary speed up | one cave, floors, treasure | 🟡 | #39 |
| KO & rescue | KO'd adventurer rescued by another or revived by item, taken to the Inn | one pawn claims and carries the fallen pawn to a reachable bed; field recovery fallback; no revive item | 🟡 | #24 |
| Monsters & taming | Monster Tamer in party on Outbreak quests; partners; Monster Farm; mount at 50 friendship; flying mounts ignore roads | random taming with a Stable; partners; mounts at bond 50 | 🟡 | #37 |
| Rank | ★1–★5 per map with conditions (popularity, monthly income, events held, build X) | ★1–★5 conditions | ✅ | — |
| Maps | Plains → Forest → Tropics → Arctic → Magic → Eastern → Underworld; beat boss → move with ≤ 5 adventurers; money/TP/rank reset; cauldron shared | one 152x112 continuous map, 4 home zones + 8 capturable frontier territories with distinct landmarks; no map reset/transfer | ❌ | #41, #42 |
| Popularity milestones | every 100 popularity: visitor wave / returning adventurer / medal | — | ❌ | #28 |
| Endgame score | Popularity×5 + Quests×300 + Titles×1000 + total Lv×5 + total Work×10 | — | ❌ | #28 |
| Premium currency (Diamonds) | exists in DV2 | intentionally excluded (no premium/stamina, repo rule) | — | — |

### Replayability extras (not in DV2 — our own)

| System | What it does | Status | Issue |
|---|---|---|---|
| World codes | each village is founded from a seed (shown as a 6-letter code): monster species per zone, cave spot, charter offers | ✅ | #45 |
| Village charters | pick 1 of 3 at founding; each has an upside, a downside and a starting gift (9 charters) | ✅ | #45 |
| Weekly happenings | 11 seeded random events: merchant, Golden Slime, rain, clear skies, bard, harvest, stampede, bandits, meteors, fog, legendary wanderer | ✅ | #45 |
| Raids defend the town | rank-scaled stampedes and class-based bandit companies attack; ranged, magic and healing raiders; free healthy non-rescuers rally | 🟡 | #45, #25 |
| Bandit camps | 16 seeded dormant sites; tier/rank gates, repeatable party fights, material stores and a four-week cooldown | ✅ | #45, #25 |
| Outlaws | 6 roaming human enemy types plus job-class raiders with visible weapons and class labels | ✅ | #45 |
| Elite monsters | 6% of wild spawns: recoloured with a crown, tougher, ×2.5 EXP/gold, ×2 drops | ✅ | #45 |

## 2. Roadmap (GitHub issues)

Tracking issue: **#44** (order + dependency map). Every issue has **slices** — one slice = one small PR, done in order —
plus implementation notes, "Done when", and verification commands. Labels: `dv2-parity`, `P1`/`P2`/`P3`, area (`systems`, `design`, `enhancement`, `art`, `platform`).

| # | Issue | Phase | Depends on |
|---|---|---|---|
| 16 | CI: run v2 checks on every push and PR | 0 | — |
| 17 | Baseline bug bash of v2 | 0 | — |
| 18 | Village item inventory (collectibles) | 1 | — |
| 19 | Facility Price / Quality / Appeal + boost items | 1 | 18 |
| 20 | Base stats: Health / Strength / Dexterity / Toughness / Spirit / Luck | 1 | — |
| 21 | Houses: Vacant House on request, move-in gifts, house styles | 1 | 18 |
| 22 | Gifts 2.0: item gifts, job preferences, Work growth, auras | 1 | 18, 20 |
| 23 | Job passives while employed | 1 | — |
| 24 | KO rescue and revive items | 1 | 18 |
| 25 | Quests 2.0: volunteers, recruitment fees, Counterattack | 1 | — |
| 26 | Shop & gear-stocking loop you can watch | 1 | — |
| 27 | Monthly report and rank-up screens | 1 | — |
| 28 | Calendar ceremonies: medals, milestones, return waves, evaluation & score | 1 | 27 |
| 29 | Build tools: Rearrange, Removal cost, Stream, Bridge, Iconic Statue | 1 | — |
| 30 | Spells on mastery + status effects | 2 | 20 |
| 31 | Fourth equipment slot (head / shield) | 2 | — |
| 32 | Town traits & titles at DV2 scale | 2 | — |
| 33 | Local residents + Cart / Balloon / Blimp stations | 2 | 32 |
| 34 | Event engine: seasonal limits, discounts, catalogue | 2 | 20, 23 |
| 35 | Farmland & ingredients | 2 | 18, 19 |
| 36 | Town & specialist jobs + race classes | 2 | 23, 28 |
| 37 | Monster Farm & taming parity | 2 | 25 |
| 38 | Facility catalogue expansion + Facility Store levels | 2 | 19, 32, 34 |
| 39 | Dungeons 2.0 | 2 | 23, 20 |
| 40 | Cauldron: essences, knowledge, recipes, weapon upgrades | 3 | 18, 34, 46 |
| 46 | Multi-map transition contract (doc only) | 3 | — |
| 41 | Multi-map framework (architecture gate) | 3 | 40, 46 |
| 42 | Map 2: Forest | 3 | 41 |
| 43 | Real-device iPad/phone QA | 2 (any time) | — |
| 45 | Happenings, charters & world codes (replayability) | done | — |

When an issue is finished: tick it in #44, flip its row in the parity matrix above (🟡/❌ → ✅), and close the issue.
