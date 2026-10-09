# Combat Tactics: First Playable Slice

Scope: fire, water, electric, grass and ice tiger starters (all evolution stages) and Dark Dragon King in single,
co-op and double battles. PvP rules and other characters' individual move
mechanics remain unchanged. No new persistent progression or art assets.

## Fire Moves

| Move | Landed selected-hit behavior |
| --- | --- |
| Spark Shot | Adds 2 burn stacks, capped at 5. |
| Flame Rush | Adds 1 burn stack, breaks 2 ward layers, exposes the next selected party attack for +20% base damage. |
| Flame Blast | Consumes existing burn stacks for 6 bonus power per stack. |
| Darkfire Meteor | Consumes existing burn stacks for 9 bonus power per stack; retains the existing charge/risk rules. |

Bonus power is added after the shared opening multiplier and before boss-tactic,
ward, personality and global boss damage modifiers. It is not guaranteed HP
damage. Zero-stack bursts remain usable. Burn damage uses the remaining stacks,
so a detonation does not also tick the consumed stacks. Existing wrong-answer
burn behavior is retained, but wrong answers and misses never consume an
opening or detonator resources.

Openings are shared by manually selected party attacks, including the physical
sub slot. An automatic support attack does not consume these resources.

## Water and Electric Rollout

Water adds an encounter-local `tideStack` (0-3). It is shared by chosen water
attacks in co-op, stays intact when another element acts and resets with the enemy.

| Water slot | Landed selected-hit behavior |
| --- | --- |
| 0: Bubble | Adds 1 tide. |
| 1: Wave | Adds 2 tide, at 85% direct damage. |
| 2: Tsunami | Spends all tide for 8 bonus power each; full tide breaks 2 ward layers. |
| 3: Vortex | Spends all tide for 5 bonus power each; full tide guarantees the existing one-turn freeze. |

The original water freeze chance remains on other water hits and below full tide.
Guaranteed control is not an extra turn on top of a random freeze, and does not
grant the ice tiger's shatter bonus. A defeated target does not receive freeze.

Electric reuses the existing 0-3 `staticStack`, without another state counter.

| Electric slot | Landed selected-hit behavior |
| --- | --- |
| 0: Orb | Adds 1 charge; reaching 3 triggers the existing 12-power automatic discharge and resets to 0. |
| 1: Bolt | Spends up to 1 charge for 10 bonus power; does not build or auto-discharge. |
| 2: Storm | Adds 2 charge; reaching 3 triggers one automatic discharge and resets to 0. |
| 3: Chain | Spends all charge for 12 bonus power each; spending at least 2 breaks 2 ward layers. |

Over-cap generated charge is not carried over. Spenders remain selectable with
zero resources, but grant no resource bonus. Wrong answers and misses do not
change either counter. Automatic support cannot generate, spend or trigger these
resources. Burst bonus power is subject to the normal direct-hit modifiers;
automatic discharge retains its existing separate boss-reduced damage path.

The menu derives its forecasts from the same pure `planElementTactic` used at
contact. Full-tide control, accelerated charge and extra ward breaking are shown
on the relevant moves. No new particle, atlas or effect rendering path is added.

## Grass and Ice Tiger Rollout

No new counter: grass reuses the party opening, and tiger reuses the existing
enemy `shattered` flag as a frost mark. A mark is not itself a skipped turn.
The menu and landed-hit resolution share `planNatureTactic`.

Grass healing below is multiplied by the move's current mastery level.

| Grass slot | Landed selected-hit behavior |
| --- | --- |
| 0: Leaf Slash | Heals up to 4 HP per level, at 85% direct damage. |
| 1: Vine Whip | Heals up to 2 HP per level and creates a shared +20% next-hit opening. |
| 2: Forest Tempest | Heals up to 2 HP per level, or 6 when consuming an existing opening. |
| 3: Umbral Briarfall | Heals up to 8 HP per level; keeps charge and wrong-answer risk. |

Healing goes to the physical acting slot, never the inactive partner. Popups
show actual recovery after the HP cap, and full HP does not emit a heal popup.
Same-hit boss retaliation uses the healed HP even when React batches updates.
Opening healing forecasts already include the multiplier when ready.

| Tiger slot | Landed selected-hit behavior |
| --- | --- |
| 0: Crystal Shot | Sets/preserves frost without shattering or rolling freeze. |
| 1: Frost Mirror | Spends frost for one guaranteed frozen turn, with no shatter damage. No frost means a normal hit. |
| 2: Glacial Claw | Spends frost for 1.5x normal shatter damage/cap and breaks 2 ward layers. Does not freeze. |
| 3: Permafrost Judgment | Spends frost for normal shatter plus guaranteed freeze. Without frost, retains the existing risky freeze chance. |

Mirror, Claw and Judgment never reapply frost, including on random freeze.
Thus repeated Mirror cannot indefinitely lock an enemy; another setup hit is
needed. A defeated enemy receives neither a new mark nor control. Other selected
party attacks can consume frost for the legacy shatter bonus. Automatic support
neither builds nor consumes frost/openings. Misses and wrong answers grant no
healing/control and retain these states. PvP continues through its original rules.

## Dark Dragon Ward

- Replaces random full blocks with visible, deterministic layers.
- Begins with 2 layers. From phase two (60% HP), reforms with 3 layers.
- Any correctly answered landed move breaks 1 layer; Flame Rush, full-tide
  Tsunami, Chain spending at least 2 charge and frost-consuming Glacial Claw break 2.
- Shielded selected hits still deal 60% of their otherwise applicable damage.
- The breaking hit remains shielded. The next selected hit gets a 1.35 multiplier
  instead of 0.6, then reforms the ward using the post-hit HP phase.
- Automatic support respects the shield but neither breaks layers nor consumes
  or receives the selected-hit ward opening bonus.
- The basic/lowest-difficulty move is excluded from both initial and repeat seals.
- Existing boss-wide reduction, charge interruption and retaliation still apply.

## Implementation Boundaries

`combatTactics.ts` owns pure rules shared by combat and menu descriptions;
numeric tuning remains in `balanceConfig.ts`. The reducer owns the transient
opening and layer counter. New encounters, enemy promotion and run reset clear
openings. Between-battle saves do not persist these transient fields.

The existing `shadowShieldCD` field is retained to avoid unnecessary state/API
churn, but now means remaining layers; zero means an available opening.

Fire body motion uses 800/900/1100/1400 ms timelines; water uses
850/950/1150/1400 ms and electric uses 760/800/1050/1350 ms. The existing atlas strike
pose at 36% is aligned with projectile arrival and actual damage. Grass uses
800/900/1100/1400 ms and tiger uses 800/950/1000/1400 ms on the same clock.
Timing travels with the attack effect; wolf, lion and PvP retain the existing path.
No added animation loop, particle population, dependency or sprite download.

Authored balance data is validated at module load in development and Node/CI.
The production build tree-shakes the validator, rather than paying for a complete
schema walk on every startup. The normal test suite still imports and validates
the entire config, including the new resource thresholds.

Battle UI strings use the eager default dictionary instead of duplicate inline
translations. Tests verify all literal keys exist in both locales; no locale,
effect quality or bundle ceiling is removed to make room for the new rules.

## Validation

- Unit coverage: build/consume/opening rules, both actor slots, ward cycles,
  phase-crossing refill, automatic support, misses, wrong answers, exit during
  travel, encounter resets, seal safety, locale copy and UI rule consistency;
  water's actual 85% direct damage, guaranteed control without ice shatter,
  electric discharge/spender exclusivity, and transient-state save exclusion.
- Isolated browser fixture using the production battle renderer/player flow:
  desktop, 390x844, 320x568 and 568x320; build -> break -> detonate; wrong-answer
  resource retention; phase-two layers; physical sub-slot attack; English copy.
- Second rollout: water 0 -> 1 -> 3 reaches full tide then consumes it for exactly
  one frozen turn. Electric sub-slot 1 spends one charge, 2 auto-discharges and
  resets, and charged 3 breaks two ward layers; small-screen English card text
  stays within its buttons. Enemy turns and audio are still fixture stubs.
- Third rollout: tiger 0 -> 1 -> 1 yields two enemy turns and exactly one frozen
  turn using the real freeze controller. Grass sub-slot 1 -> 2 heals 60 -> 66 -> 84
  at mastery 3, leaves the main at 100 and consumes the opening. DOM inspection
  confirms the physical sub is attacking while the main remains idle. English
  cards fit at 320x568; 390x844, 568x320 and 1280x720 keep actors clear of menus.
- No horizontal page overflow in those viewports. On short screens the operation
  panel scrolls independently, leaving actors and HP bars visible.
- The fixture is temporary and does not write game saves. It stubs enemy turns
  and audio; browser checks are not a full campaign or real-phone FPS benchmark.
- Run the normal CI commands: typecheck, zero-warning lint, all tests, build:budget.
  Keep the existing bundle ceilings unchanged.

Next evaluation should compare repeated moves versus mixed rotations over full
encounters at several mastery levels and answer accuracies. These first-pass
balance numbers are not a claim that all party compositions are equally strong.
