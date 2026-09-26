# Kairosoft Jobs Reference — roster, weapons, identity rules

Study note, not a copy source. Do not copy Kairosoft sprites, names, text,
maps, UI or proprietary data. What this file records is the *information
design* of their job rosters: which weapon and headgear make each class
readable, and how Wayfarer's 12 jobs map onto those archetypes.

Sources: https://kairosoft.fandom.com/wiki/Jobs_(Dungeon_Village_2),
https://kairosoft.fandom.com/wiki/Adventurers_(Dungeon_Village_2),
https://kairosoft.fandom.com/wiki/Equipment_(Kingdom_Adventurers).

## Dungeon Village 2 — job roster (combat-relevant subset)

| Job | Starting weapon | Identity notes |
|---|---|---|
| Warrior | Iron Sword / Soldier Spear | Sword-line base; upgrades to Knight |
| Knight | Iron Sword (req. Warrior) | Heavy armor silhouette, sword line |
| Hunter | Wooden Bow | Bow IS the silhouette |
| Mage | Wooden Staff + Magic Cap | Staff + pointed cap |
| Monk | Wooden Staff + Monk Hat | Staff like Mage, hat differs |
| High Priest | Monk/ Holy Staff (req. Monk) | Advanced holy staff |
| Archmage | Wooden Staff (high Magic) | Stronger robe/staff read |
| Ninja | Dagger + Lacquer Hairpin | Light blade + hair ornament, Eastern |
| Mercenary | Iron Sword / Noble Axe | Heavy sellsword |
| Hero | Partisan / Royal Sword | Unique, cannot change jobs |
| Blacksmith | Dagger → Iron Sword | Forge worker who fights with sidearms |
| Farmer | Dagger → Bamboo Spear | Farm worker, spear fits the tool hand |
| Scholar | Magic Wand | Study-booster, wand (not staff) |
| Cook | Rapier + Kimono | Kitchen worker, light blade |
| Florist | Wooden Staff | Staff, non-combat vibe |
| Monster Tamer | Woodcutter's Axe / Iron Axe | Axe identity |
| Santa | Holy Staff + Santa Hat | Headgear carries the joke |
| Sumo Wrestler | Barehanded | Body mass IS the silhouette |

## Kingdom Adventurers — weapon compatibility concept

Every profession has a per-weapon-type compatibility row (compatible / weak /
unusable), e.g. Mage and Wizard are staff-locked, Ninja spans light blades,
Farmer favors bow-class sidearms, Paladin is holy-tank wide. Wayfarer's
`itemScore` role affinity (Archers/Ninjas→bows, magic→staves, holy→staves or
hammers, workers→tools) is our version of this matrix — keep extending it
rather than hard-locking builds.

## Extracted identity rules

1. **Starting weapon defines the silhouette.** Hunter reads bow before armor;
   Mage/Monk read staff; Ninja reads light blade. No Kairosoft class is
   identifiable by palette alone.
2. **Headgear is half the identity.** Magic Cap vs Monk Hat separates two
   staff classes; Santa Hat, hairpins, Kimono do the same work elsewhere.
   Our Cleric/Wizard problem is exactly a missing-headgear problem.
3. **Job families share weapon lines.** Warrior→Knight (sword/spear),
   Mage→Archmage/Summoner (staff/wand), Monk→High Priest (holy staff).
   Our req chains (Fighter→Knight, Archer→Ninja, Mage→Wizard,
   Cleric+Fighter→Paladin) already mirror this — sprites should too.
4. **Workers fight with sidearms, keeping their work look.** Blacksmith,
   Farmer and Cook enter combat with daggers/swords/spears while remaining
   visually workers. This validates the layered-tool model: profession body +
   wielded sidearm, never a baked-in weapon.

## Wayfarer 12 — mapping and gaps

| Wayfarer job | Kairosoft counterpart | Weapon line | Current sprite (v0.7.18, one Eldiran style) | Gap |
|---|---|---|---|---|
| Adventurer | DV2 Adventurer | Sword (generalist) | Eldiran r9 traveler | None — cape/light gear later |
| Fighter | DV2 Warrior | Sword | Eldiran r16 soldier | None |
| Archer | DV2 Hunter | Bow | Eldiran r3 red hood | None (walk frames verified bow-free) |
| Mage | DV2 Mage | Staff + cap | Eldiran r10 robe | None |
| Cleric | DV2 Monk | Holy staff + light headgear | Eldiran r6 white robe | None |
| Knight | DV2 Knight | Sword, req Fighter | Eldiran r4 blue steel | Grayscale trio check pending eyeball |
| Ninja | DV2 Ninja | Dagger + hair ornament | Eldiran r8 dark hood | Hairpin-class cue if sheets allow |
| Wizard | DV2 Archmage | Wand, advanced arcane | Eldiran r5 dark-hood caster | None |
| Paladin | KA Paladin | Sword + shield, holy | Eldiran r17 teal + cape, shield layer | None |
| Blacksmith | DV2 Blacksmith | Sidearm + forge wear | Eldiran r18 workwear | Hammer tool layer (Phase 4 tools) |
| Farmer | DV2 Farmer | Spear-sidearm + farm wear | Eldiran r2 plain laborer | Hoe/spear tool layer (Phase 4 tools) |
| Researcher | DV2 Scholar | Wand + book | Eldiran r12 scholar robe | Book/wand layers (Phase 4 tools) |

## Equipment ladders (DV2 model, adopted v0.7.19-20)

DV2 organizes weapons into type ladders with shared silhouettes and material
escalation: Dagger→Bandit Knife→Iron Sword→…→Royal Sword (14 swords),
Woodcutter's Axe→…→Conqueror's Axe (12), Wooden→…→Golden Skull staffs (12),
Soldier→…→Elemental spears (12), Lover's Foil→…→Estoc (10 sabers),
Wooden Bow→…→Ancient Bow (12). Armor runs Linen→Leather→Chainmail→Noble→Kimono
the same way. Slots are fixed at four: Weapon / Armor 1 / Armor 2 /
Accessories — the same four Wayfarer uses.

Adopted rules:

- New bases extend existing ladders (Iron Sword, Steel Blade; Oak Bow,
  Longbow; Battle Axe, Hatchet, Maul; Chain/Plate Mail; Tomes; Tower Shield)
  instead of inventing unrelated shapes.
- Within a type, escalation reads through material color + size, never a new
  silhouette (bronze→iron→steel→rune; wood→oak→birch).
- Every base renders distinctly on pawns AND as an icon in stash/loadout rows
  (DV2 shows item art in its own UI) — smoke enforces distinct visual
  signatures per slot.
- Signature starting gear per job stays a future slice (DV2 adventurers arrive
  with Daggers, Bows, Staves, Rapiers); no save/economy changes were made.

## Consequences for the Eldiran census
Judge Eldiran rows against the Cleric/Wizard/Researcher rows above, in this
order: (1) headgear distinct from Mage-Red/Cyan hats; (2) staff vs wand read;
(3) holy vs arcane vs scholarly palette accent; (4) weapon-neutral walk
frames. A row that fails (1) is rejected no matter how pretty it is.
