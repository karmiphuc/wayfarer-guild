# Vision

## North star

**Wayfarer Guild is a cozy autonomous fantasy management RPG where you build a town that attracts eccentric adventurers, shape their careers and equipment, and watch them independently live, shop, train, fight, explore and form expeditions into dangerous roguelite dungeons.**

The emotional target is: *“I want to keep watching these little idiots because something interesting is always about to happen.”*

## Inspirations

Primary gameplay references:
- Kairosoft **Dungeon Village / Dungeon Village 2**
- Kairosoft **Kingdom Adventurers**

We want close parity in the *kind* of fun:
- dense little town;
- autonomous adventurers;
- job growth and job changes;
- equipment hunting;
- residents spending money in facilities;
- quests and dungeons;
- popularity/rank unlocks;
- frontier exploration;
- monster companions;
- constant small feedback and progression.

We do **not** copy their expressive assets, text, maps, UI art, music, sounds or proprietary game data. Wayfarer must become visually and mechanically its own game.

## Design pillars

### 1. Pawns are the stars
Pawns are not cursor-controlled units. They have needs, personalities, preferences, confidence, memories, relationships and role awareness. They should surprise the player without behaving randomly for no reason.

The player manages the **system around them**:
- what facilities exist;
- what jobs are available;
- equipment policy;
- expedition incentives;
- research;
- town priorities;
- risk policies;
- economy.

### 2. Management, not babysitting
Every repetitive action must answer one question: **does this create a meaningful choice?**

If no, automate it.

Good:
- deciding whether a dungeon is worth the risk;
- choosing which job path to open;
- deciding what gear rules your guild uses;
- specializing the forge;
- balancing town economy vs adventuring.

Bad:
- re-equipping 25 heroes after every drop;
- tapping every building to collect coins;
- giving 40 identical gifts;
- waiting on real-world timers;
- manually commanding basic attacks.

### 3. Randomness creates stories
Randomness should affect:
- visitors;
- pawn traits;
- friendships/rivalries;
- item affixes;
- dungeon topology;
- events;
- bosses;
- temporary blessings/curses;
- monster eggs;
- rare discoveries.

Randomness should **not** permanently block basic progression. Important base items/jobs should eventually become craftable/researchable once discovered.

### 4. The town is a living machine
The town is not a static build screen. Residents should visibly:
- walk;
- eat;
- shop;
- train;
- rest;
- socialize;
- work;
- rescue allies;
- defend the town;
- prepare for expeditions.

Facilities create economics and character progression at the same time.

### 5. RPG buildcraft is deep but readable
Characters are persistent and become interesting because of their history:
- current job;
- mastered jobs;
- inherited mastery skills;
- permanent training growth;
- traits;
- gear;
- companion;
- memories/relationships.

Avoid the trap where the optimal solution is “master every job on every pawn.” Limit equipped mastery skills and create distinct role identities.

### 6. Dungeons are the risk/reward engine
Town is meta-progression; dungeons are repeated high-tension tests.

Dungeon runs should include:
- physical autonomous traversal;
- role-aware combat;
- camps;
- events;
- elites;
- treasure;
- bosses;
- temporary run builds;
- push deeper vs extract choices;
- biome-specific counters and rewards.

### 7. Cozy presentation, serious simulation
The surface should feel warm, colorful, funny and readable. Underneath, the simulation can be fairly rigorous.

Visual target:
- top-down/chibi pixel fantasy;
- high information density;
- small readable sprites;
- lively animation;
- satisfying hit/loot/level-up feedback;
- strong silhouettes;
- clean pixel UI.

### 8. Fair progression, no retention friction

Wayfarer deliberately keeps the autonomous settlement/adventure appeal of mobile management RPGs while rejecting monetization-shaped pacing.

Rules:
- no guild/account-level stamina or energy meter;
- no real-world refill timers;
- no premium-like currency required for normal progression;
- no daily-login-only advancement;
- no forced low-value farming merely to extend playtime;
- career experimentation should not be punished by arbitrary fees.

Ordinary progression should use resources earned naturally through play:
- Gold;
- provisions and materials when thematically meaningful;
- fame/rank as non-spendable progression;
- pawn readiness, danger and equipment as simulation constraints.

Individual pawn fatigue is simulation, not a player stamina system: tired pawns rest while other healthy residents can continue acting.

Run-specific dungeon supplies are acceptable only when they create tactical choices inside an expedition. They must never become a regenerating entry ticket.

Tracking: https://github.com/karmiphuc/karmiphuc.github.io/issues/32

### 9. Browser/iPad first
The canonical game lives on GitHub Pages. It should remain convenient to open on desktop or iPad with no install required.

Targets:
- quick load;
- touch-friendly;
- resilient local saves;
- export/import;
- eventually optional cross-device save;
- smooth with dozens of active pawns.

## Anti-goals

Wayfarer is not:
- a direct Kairosoft asset clone;
- a manual tactical RPG;
- a clicker/idle game;
- a gacha game;
- an ad/energy-timer mobile economy;
- a premium-currency or daily-login progression economy;
- a huge inventory micromanagement simulator;
- an endless stat-inflation treadmill.

## “Legitimately awesome” bar

Before calling the game 1.0, a new session should deliver:
- an immediately charming town to watch;
- enough pawn individuality that names become memorable;
- multiple viable job/build paths;
- exciting item discoveries;
- several visually/mechanically distinct dungeon biomes;
- good music and tactile SFX;
- bosses that visibly threaten the settlement;
- monster companions/mounts worth caring about;
- several hours of progression without artificial grind;
- a stable iPad experience.

The final test is not feature count. It is whether watching the simulation produces stories the player wants to tell.
