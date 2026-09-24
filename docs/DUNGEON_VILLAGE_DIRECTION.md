# Dungeon Village 2 direction: visible town-adventure loop

Updated: 2026-09-24

## Direction

Wayfarer Guild should lean toward Dungeon Village 2's town-management loop,
not Kingdom Adventurers-style worker deployment. The player builds an inviting
town, improves jobs/equipment/facilities, and watches adventurers visibly move
between town life and dangerous field operations.

This is a systems reference only. Do not copy Kairosoft sprites, maps, text,
names, UI layouts, audio or proprietary data.

## Research findings

Kairosoft's official store description centers the loop on facilities attracting
adventurers, equipment improving quest outcomes, monsters and dungeons providing
danger/rewards, and satisfied visitors moving in. It also emphasizes different
regions, friendly monsters and world-map progression:

- https://apps.apple.com/us/app/dungeon-village-2/id1543161449
- https://play.google.com/store/apps/details?id=net.kairosoft.android.bouken2
- https://www.youtube.com/watch?v=rCbvvlE2V1g

The in-game help transcription and community reference describe separate
dungeon explorations and outdoor monster battles, facility usage, residents,
work growth and monster companions:

- https://www.kairogameguides.com/dungeonvillage2/gamehelp
- https://kairosoft.wiki.gg/wiki/Dungeon_Village_2

Public gameplay screenshots consistently show compact, colorful towns with
adventurers circulating among facilities, clustered battles just outside town,
floating reactions/status feedback and frequent visible rewards. Wayfarer's
live screen currently has readable sprites and combat FX, but large empty grass
areas, broad dark fog, sparse activity feedback, and non-dungeon quests that
previously removed pawns into an abstract timer.

## Implemented first slice

Non-dungeon Mob and Boss quests now use a physical field-operation state machine:

1. A visible quest-bound monster pack appears in explored frontier space.
2. Volunteers remain on the map and walk to the threat.
3. They fight using the existing combat system and effects.
4. After clearing the pack, they physically gather at the site.
5. Each survivor carries visible cargo back to the Guild.
6. Resources and quest rewards are deposited only after the return.

Quest cards report the current phase and remaining monsters. Quest sites receive
an animated map marker; gathering nodes and carried cargo reuse licensed atlas
sprites already in the repository. A save made during the operation restores
party positions, objectives, phase and progress.

## Visible equipment slice

Pawns now visibly carry a weapon in both town and dungeon views. The silhouette
comes from the actual equipped base item: sword, bow, staff, axe or hammer.
Weapons follow the existing anticipation/lunge/recoil attack motion instead of
appearing only as detached combat effects. Before acquiring an item, a pawn
carries a job-readable training weapon so the role remains legible.

Auto-equip retains stat comparison but adds a bounded role affinity: Archers
and Ninjas prefer bows, magic jobs prefer staves, holy jobs accept staves or
hammers, and workers/frontliners prefer appropriate tools. This makes equipment
changes visible and mechanically coherent without hard-locking any build.

The guild stash now supports direct equipment gifts to the selected available
pawn. Gifts equip immediately, raise satisfaction based on rarity, and reserve
that slot from background auto-equip; re-enabling auto-equip releases reserved
slots. Wood shields, round shields and spellbooks appear as persistent offhand
equipment in both town and dungeon views. Gifted items and reservations survive
save/reload.

## Next slices

1. Verify carried weapon, offhand and restrained armor-cue scale, overlap and
   attack motion in the rendered town and dungeon without obscuring identity.
2. Convert ordinary frontier exploration gathering from instant global deposits
   to personal cargo and Storehouse/Guild hauling.
3. Add facility activity feedback using existing licensed sprites and the FX
   lifecycle: Forge work, Farm harvest, Library study, shopping and arrivals.
4. Add more visible town circulation: merchants/local visitors, event crowds,
   seasonal decorations and compact speech/reaction moments without pausing play.
5. Improve map composition around the expanded southern town, then tune paths
   expansion, then tune paths and decoration density around actual foot traffic.
6. Add quest variety through escort, rescue, delivery and rematch objectives;
   keep all outcomes grounded in visible movement rather than timers.

## Guardrails

- Player choices shape facilities, jobs, equipment and risk; pawns act autonomously.
- Rewards do not teleport. If material movement matters, show the carrier and deposit.
- Prefer non-blocking reactions over modal notification spam.
- Keep failures recoverable through KO, retreat and rescue.
- Preserve existing save identities and transactional failed-save protection.
- Treat real rendered browser behavior as a release gate for visual changes.
