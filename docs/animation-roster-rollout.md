# Complete Battle Animation Roster

## Coverage

All **51 visual forms** now have independent eight-pose battle atlases: 21 starter stages, 25 ordinary enemy forms/variants and five Boss forms. This batch adds the 44 forms missing after the fire/wolf batches. Existing seven atlases and original PNGs remain unchanged.

| Family | Forms | Status |
| --- | ---: | --- |
| Fire, water, grass, electric, lion, wolf, tiger starters | 7 x 3 = 21 | Complete |
| Base slimes: green, fire, water, electric, dark, steel | 6 | Complete |
| Evolved slimes: green, fire, water, electric, dark, steel | 6 | Complete |
| Fire beast, mechanical dragon, ghost: base/evolved | 3 x 2 = 6 | Complete |
| Ghost lantern, mushroom, stone golem, mud golem, candy knight, candy monster, colorful butterfly | 7 | Complete |
| Dark Dragon King, its second visual form, Hydra, Crazy Dragon, Sword God | 5 | Complete |

Coverage refers to battle artwork, not animated menu portraits, encyclopedia illustrations or Boss introduction portraits. Those retain their original art. No save migration, unlock or progression changes are required.

## Boss Phase Artwork

Dark Dragon King (`boss`, 暗黑龍王) uses `boss-v1.webp` in its first form and a separately drawn `boss-2nd-phase-v1.webp` for `bossDarkPhase2SVG`. Both contain eight poses. They are different source sheets, not a shared image recolored by CSS.

The existing PvE phase resolver remains authoritative: phase two starts at 60% HP, phase three at 30%, and phases two/three use the existing second visual identity. Main and secondary enemy slots resolve independently. PvP keeps the selected Boss identity instead of applying the PvE HP-based override.

Hydra, Crazy Dragon and Sword God have combat phases but currently no separate second visual identity in the game data. Their upgraded poses remain available throughout those phases. This update does not invent new Boss forms or change phase mechanics.

## Runtime And Footprint

- All atlases use RGBA WebP, 2048x768, four columns by two rows; each cell is 512x384.
- Pose order: idle, inhale, anticipation, strike, follow-through, recovery, recoil, braced recovery.
- A shared scale per atlas and reviewed contact/support X anchors register the drawings against a y=368 silhouette baseline. Lifted recoil poses may have feet above that baseline; this is not a skeletal foot-lock system.
- Runtime fits the union of all eight silhouettes once to a padded battle envelope. Most forms retain the original profile envelope; Sword God's battle-only envelope is wider to accommodate its new sword poses without shrinking the body into the old portrait. It does not resize or recenter each pose. Original menu portraits remain unchanged.
- The existing CSS step player handles all 51 forms. No new animation library, per-frame React updates, gameplay timer or character-specific rendering component was added.
- Only actors actually mounted in battle request their atlases. Decode failure or invalid dimensions retains the original image. Pause, impact freeze, reduced-motion and low-performance behavior stay in the shared player.
- The new 44 atlases total **11,567,358 bytes**. All 51 active atlases total **13,492,118 bytes (12.87 MiB)** on disk, not an initial-page download. Individual active files range from 71,686 to 398,456 bytes, below the 400,000-byte budget.
- The new batch uses WebP quality 90-92. A decoded 2048x768 RGBA atlas is 6 MiB before browser/GPU overhead; two distinct mounted atlases are approximately 12 MiB, four approximately 24 MiB. These are storage calculations, not measured peak memory or FPS claims.
- Vite's existing PWA configuration excludes raster images from shell precaching. Versioned filenames use the existing on-demand visual cache.

## Preparation And Provenance

Mode: **built-in image generation**, using each original `public/sprites/<key>.png` as its identity reference. Each form was generated separately. The user explicitly authorized offline background removal, cropping, registration and compression.

Full prompts, accepted source filenames, rejected-sheet references, reviewed crops and anchors are in [`scripts/roster-art-sources.json`](../scripts/roster-art-sources.json). Original source PNGs remain in the image tool's local generated-images directory; they are not bundled into the game. Copy/retain those original files when reproducing this batch on another machine.

The new sheets use an intentionally opaque saturated magenta matte. [`scripts/prepare-roster-atlases.py`](../scripts/prepare-roster-atlases.py) removes that source-specific key with a one-pixel defringe, retaining white fur, silver armor and colored interior details. Reviewed separators avoid clipping wide poses; the evolved mechanical dragon has a stepped isolation boundary between its anticipation tail and the adjacent attack hand. The tool never generates missing poses or stretches individual frames to fill the cell.

Hydra was regenerated to reduce inconsistent head-fan silhouettes. Sword God was regenerated with an extractable matte and full blade margins. Candy Knight was regenerated to retain one shield and one lance in all eight poses. Contact-sheet review corrected tail/cloak anchors on affected forms before packing.

```sh
python3 scripts/prepare-roster-atlases.py --source-dir /path/to/generated_images --analyze --preview-dir /tmp/roster-review
python3 scripts/prepare-roster-atlases.py --source-dir /path/to/generated_images --preview-dir /tmp/roster-review
python3 scripts/prepare-roster-atlases.py --verify
```

The offline tool requires Pillow and NumPy; no Python/image-processing dependency is added to the TypeScript game. Final atlases and `registration-roster-v1.json` are under `public/sprites/visual-pilot/`. The registration records source/file SHA-256, file size, encoding quality, uniform scale, eight source crops, offsets, decoded alpha bounds and decoded pose hashes.

## Validation

- All 51 atlases / 408 cells were decoded and checked against their registered bounds, transparent gutters and hashes. New sheets were visually reviewed on dark contact sheets, including wide weapons/wings, white fur and colored details.
- `npm run lint`, `npm run typecheck`, all **832 tests**, and `npm run build:budget` pass (including the Boss presence and skill mastery follow-up below).
- TypeScript requires complete `Record<SpriteKey, SpriteAnimationAsset>` coverage. Tests cover every factory/profile, all configured enemy/evolved forms in both enemy slots, all selectable PvP stages, Co-op identity independence, separate Boss phase-two files, unchanged PvP identity, and per-pose containment.
- After the Mac was unlocked, a temporary local fixture mounted the production `BattleScreen` and `BattleSprite` without game-save actions. All **51 forms / 408 poses** passed browser image decoding, computed pose-position and stable frame-size checks, with no browser console errors. The fixture and viewport overrides were removed after the pass.
- Focused visual checks covered 320x568, 390x844, 768x1024 and 1280x720 portrait/desktop layouts, plus 568x320 and 844x390 landscape layouts. Solo, four-actor Co-op and PvP rendering were sampled, including the Dragon King's independent enemy-slot phase changes, wide wings/weapons, Crazy Dragon, Sword God, Hydra and both active Co-op slots. The sampled layouts had no horizontal page overflow or observed HUD occlusion; this is not an exhaustive playthrough of every encounter combination.
- Physical main/sub attack ownership, paused attack retention and low-performance attack playback were checked in the browser. An eight-pose solo cycle retained identical actor-frame dimensions and positions throughout the cycle.

### Corrections From Browser QA

- Inactive Co-op partners were too small and dark on phones. A modest reserve-frame readability request now goes through the existing collision/HUD-safe placement solver; it is not a hard minimum that can override clearance. Inactive opacity, brightness and saturation were raised while preserving the active-slot highlight.
- Wide HUDs left too little space on short landscape screens. Landscape HUDs are now narrower and vertically compact, with single-line truncated names and untruncated HP values. The placement solver can use the full-height space between the two HUDs. Very short landscape layouts still use smaller actors to preserve clearance and control-panel space.
- Four regression tests cover the reserve sizing ratio, safety when that request cannot fit, the landscape corridor and four-actor clearance at 568x320. These changes do not alter atlas resolution, pose count, damage, turn timing or save data.
- Browser viewport emulation does not establish physical iPhone/Android FPS, GPU memory or thermal behavior. Those measurements remain outstanding.

## Quality Boundary

This completes the agreed **eight-key-pose** roster, not 3D, skeletal animation, or dozens of hand-corrected in-between frames. Existing continuous body motion connects the discrete drawings, but some anatomical, accessory and pose-to-pose variation remains visible in slow motion. Static idle uses the existing breathing layer; eight drawings do not imply eight continuously cycling idle frames. No claim of perfectly fluid frame-by-frame motion is made.

## Boss Presence And Skill Mastery Follow-up

- Boss main/sub frame requests now use more available space instead of stopping at the old horizontal lane budget. The existing two-dimensional solver still reduces them where HUD or actor clearance requires it; these are not unconditional scale overrides.
- Normal player/PvP strikes and direct enemy hits use a shared, arena-clipped SVG effect with eight elemental trail/crest shapes. Physical source/target slots select the coordinates, including Co-op secondary actors. Older effect templates remain available for callers without spatial geometry.
- Move levels 1-2, 3-4 and 5-6 select three visual tiers: a single trail, chained trails, then a finisher sigil. The move menu displays these milestones; level-up toasts announce levels 3 and 5. This is presentation of existing practice progression, not a new leveling or damage system. PvP retains its existing level-one effect policy.
- Direct enemy hits scale their presentation from enemy level and Boss phase. Boss release moves receive stronger finishing effects, Sword God uses steel motifs, and Hydra uses three trails. Enemy hit effects begin with actual damage, not before hit resolution, and delayed clears cannot erase a newer effect. Status damage and legacy automatic ally-support particles are not redesigned by this change.
- A compact low-performance effect omits stream rendering, shards and sigils; reduced-motion styles omit travel and expansion. No new image assets, per-frame React updates or combat timing changes are introduced.
- Fresh browser checks sampled the four Boss identities and Dark Dragon King's second form on 390x844, then four-actor Sword God layouts on 1280x720 and 844x390. Mastery tiers and low-performance secondary-source/target routing were inspected without page overflow or console errors. This does not replace physical-device FPS testing or an exhaustive encounter playthrough.
- The temporary `qa-skills` entry points were removed after validation so they are not left in the repository or exposed by the development server.
- Final verification: lint, TypeScript, all 832 tests and production bundle budgets pass. Total JavaScript is 945.3 KiB against the 976.6 KiB budget; the battle-effects chunk is 84.8 KiB against 107.4 KiB. These are build-size checks, not measured rendering-performance claims.

## Move-Specific Choreography

The follow-up replaces elemental-only presentation with 44 named recipes: four moves for each of seven player families and four for each of four playable PvP bosses. One recipe table and the existing SVG renderer share drawing primitives, not one component per skill. Identity is captured from the acting character ID and catalog move slot; translated names, evolution artwork and later main/sub selection changes do not determine the effect.

| Family | Move 1 | Move 2 | Move 3 | Move 4 |
| --- | --- | --- | --- | --- |
| Fire | Spark projectile | Flame rush | Flame eruption | Dark-fire meteor |
| Water | Bubble cluster | Rolling wave | Tsunami crest | Inward whirlpool |
| Grass | Leaf cut | Thorn whip | Leaf cyclone | Rising dark roots |
| Electric | Charged orb | Falling bolt | Multi-bolt field | Lightning cage |
| Lion | Hunting claws | Roar wavefronts | Flame pounce | Eclipse roar |
| Wolf | Judgement cut | Parallel blades | Cross cut | Rising sword domain |
| Tiger | Crystal projectile | Rotating frost mirror | Ice claws | Falling ice judgement |
| Dark Dragon King | Thunder claws | Abyss storm | Royal breath | Falling thunder judgement |
| Hydra | Venom fangs | Poison tide | Serpent coils | Rising swamp heads |
| Crazy Dragon | Burning bite | Wing rush | Black-flame breath | Falling wing judgement |
| Sword God | Flash cut | Orbiting blades | Cross-shaped beam | Falling divine sword |

- Ordinary enemies use eleven species recipes. Slime variants share the slime splash shape with their elemental palette; evolved forms retain species identity. Wild starters resolve the matching player recipe. Boss normal attacks and charged releases use different recipes in every phase; phase scaling remains presentation-only.
- Automatic partner support now uses the partner's second move, elemental sound and captured physical sub slot, instead of a water effect for every partner. Its existing damage, probability and handoff timing are unchanged. Delayed effect cleanup cannot erase a newer strike.
- Practice tiers retain the main silhouette, then add faint echoes and finishing accents. PvP remains at visual level one. Low-performance mode keeps a single distinctive mark without travel, echoes, shards or filters; reduced-motion styling retains the static mark. No bitmap assets, extra damage events, per-frame React updates or new dependencies were added.
- Contact radius is bounded by the target's stable layout dimensions, preventing a boss strike from overwhelming a small partner. An SVG clip excludes the existing enemy and player HUD regions, including during arena hit reactions. This does not change actor placement or atlas scale.
- Automated coverage checks all 44 unique silhouettes, every monster/evolved catalog entry, wild starters, boss phases, physical ownership, stale cleanup, malformed-ID fallback, HUD clipping and reduced detail. Browser checks exercised all 44 named effects, phone and landscape/desktop layouts, secondary targets, live projectiles, pause, low-detail rendering and cleanup. A clean rerun after correcting the temporary QA harness produced no console errors. Temporary entry points and viewport overrides were removed afterward.
- This is move-specific procedural 2D choreography, not new hand-drawn attack frames or 3D animation. Poison/burn ticks, dodge/parry/counter abilities and the eight-pose body atlases are not redesigned here. Physical-device FPS, thermals and an exhaustive playthrough remain unmeasured.
- Final local verification: TypeScript, strict lint, all 841 tests and unchanged bundle budgets pass. Total JavaScript is 954.0 KiB / 976.6 KiB; battle-effects is 92.9 KiB / 107.4 KiB. These results do not represent a new remote CI run.

## Choreography Revision: Beyond Route Lines

The first named-recipe pass still used a thin common route and a small moving contact glyph. This revision replaces that named-move branch with `SkillChoreography.tsx`; the elemental route remains only as an unknown-ID/legacy fallback. The recipe table now explicitly selects both motion and a material/mechanism motif for all 44 playable slots and eleven ordinary enemy species.

- Fireballs have filled flame bodies and wakes; bubbles have translucent bodies and burst rings; ice uses faceted projectiles. Wave moves carry rolling walls, while roars use pressure fronts and Eclipse Roar forms a dark disk with a corona.
- Slashes occur around the target instead of firing a sword icon down a route. Wolf parallel cuts use two offset passes; cross cuts use intersecting axes. Claws, leaves and fangs retain their own cut shapes.
- Lightning descends from above; meteors, ice and divine swords fall into a ground impact. Sword God's final move includes cloud cover and falling swords. Grass whips bind with thorns, electric chains tighten into a cage, and full-detail Hydra constriction uses nine serpent heads (three in low detail).
- Orbit moves use rotating leaves, mirrors, swords or a collapsing vortex. Field moves erupt from below as roots, fire, stone or swords. Breath attacks use a broad filled cone and a core; Sword God's rift adds a perpendicular rupture.
- Practice tiers add bounded geometry, such as additional waves, projectile echoes and falling swords. Low detail keeps a simplified moving mechanism rather than replacing it with a static icon. Reduced-motion CSS retains static contact cues. Damage resolution, effect hit/cleanup times, actor placements, pause handling and physical main/sub routing are unchanged.
- The named renderer uses gradients and CSS transforms, without SVG blur filters, bitmap downloads, animation-frame React updates or additional packages. Regression tests cap one unclipped effect at 64 SVG elements in normal detail and 36 in low detail, including definitions; the HUD clipping definition adds three elements. These caps are not physical-device frame-rate measurements.
- Local tests cover launch/contact separation, all recipe identities at multiple tiers and detail levels, mechanism-specific counts, incoming direction, miss/block handling and HUD exclusion. After unlocking the Mac, a temporary fixture mounted the production battle screen and exercised all 44 named effects, Co-op main/sub routing, the Dark Dragon King's second-phase atlas, and selected normal/low-detail effects on phone, landscape and desktop viewports. No SVG/browser errors or horizontal page overflow were observed in the sampled cases.
- Live transform samples verified projectile movement, a stationary animation clock while paused, resumption, and cleanup. A low-detail test initially overlapped a viewport resize; repeating at a fixed viewport passed. Hydra's three simplified serpent heads were corrected to distribute around the target instead of all occupying one side.
- Final local checks pass: TypeScript, strict lint, all 858 tests, `git diff --check`, and unchanged production bundle budgets. Total JavaScript is 963.7 KiB / 976.6 KiB; battle-effects is 102.5 KiB / 107.4 KiB. Temporary QA entry points were removed and browser viewport overrides reset before the final checks. These local figures do not replace remote CI or physical-device profiling.

### Music And Intro Recovery

The accompanying fixes preserve scene/boss music identity in low-performance mode, use native media looping rather than allocating a new player for every loop, recover paused music on foreground/user gestures, and handle stalled loads with the existing synthesized fallback. Failed AudioContext resumes are retryable rather than treated as successful unlocks. Low-performance and reduced-motion boss introductions retain the boss/name instead of hiding the entire overlay; pausing preserves the remaining intro time and each encounter remounts its intro. Boss victory overlays now use the same pause-safe countdown and prevent skip events from also advancing the underlying screen.

Regression tests cover all twelve file tracks, repeated loops, stale playback callbacks, mute/volume changes, stalled playback, foreground recovery and single/Co-op progression through the four bosses. They do not establish real-device audio quality or reproduce every reported level-stall scenario.

- Browser media checks loaded all twelve actual MP3 files. Each passed three seek-assisted native loop-boundary transitions without allocating another player, a same-track pause/focus recovery without resetting position, and final mute/stop cleanup. This checks decoding and transport, not an uninterrupted multi-hour listening test.
- Browser QA found full-detail boss intros extending beyond short landscape screens and overlapping their names. Intro sprite widths now fit a dedicated viewport-bounded stage, independent of the smaller in-battle reserve actor size. Names wrap within the overlay, with compact landscape typography. All four bosses in single and dual intros passed final sprite/name boundary checks at 320x568 and 568x320; 390x844, 844x390 and 1280x720 were also sampled during QA.
- Both intro and victory overlays were paused for longer than their entire nominal duration, then resumed and allowed to complete. They remained visible while paused and advanced normally afterward. These checks use the production overlays; reduced-motion CSS was reviewed but not separately emulated in the browser.
- A separate production-build preview passed a real solo smoke test: character selection, two correctly answered attacks, enemy counterattack, victory and transition from the grassland butterfly encounter to the volcano red-slime encounter. The built app produced no browser console errors during that run.
