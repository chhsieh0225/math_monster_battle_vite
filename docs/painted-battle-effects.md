# Painted Battle Effects

The production battle now supports all 101 existing skill recipe IDs through one
PixiJS/WebGL canvas. This includes seven starter families, four boss families,
three knights, Blue Moon Butterfly and the ordinary/evolved enemy skill recipes.
The count includes catalog aliases, not 101 newly designed gameplay abilities.
Damage formulas, unlocks, saves, sounds and actor atlases are unchanged. The
remaining playable families now have authored release/contact/recovery timings.

## Visual Direction

- Authored silhouettes, mineral colors, ink edges, broken highlights and baked
  directional brush strokes. No generated raster images, stock glow, bloom or
  full-screen blur. Existing actor/background art stays at its original quality.
- The complete catalog uses dedicated presentations: 95 IDs use 25 material
  families and 29 choreographies; five IDs use the three signature families;
  water:2 uses its dedicated water renderer. These are not 101 unique abilities.
  The old nine-motion renderer remains only as a fallback for future recipes
  without a choreography, not for any current catalog entry.
- Individual recipe marks retain crosscuts, guardian symbols and skill identity.
  Mastery levels 1/3/5 add layers, secondary strikes and material fragments,
  rather than scaling actors or covering the whole battlefield.
- Tidal Impact retains its separate curling wave meshes and flowing water shader,
  sharing the same WebGL context with the other skills.
- General-skill ink/highlights adapt to sunlit, night and neutral scenes when the
  atlas is baked. The contact pose holds a readable peak before fading instead
  of immediately washing into the background. This adds no post-process pass.

## Integration And Safety

`BattleSkillEffect` is persistent for a mounted battle. The battle flow, not the
renderer, owns release, contact, damage and completion. An impact only starts on
`AttackEffectVm.impact`; misses never produce contact, blocks retain the SVG
shield feedback, and immediate support hits do not invent a travel phase.

Real measured source/target anchors retain co-op slot and reverse PvP ownership.
Effects follow diagonal positions and cap their footprint against the arena and
target. Canvas is inside `.battle-arena` at z-index 3, below actors (4/6) and HUDs
(10), including during camera shake. It clips before the answer panel. Actor
placement and scale are not changed by the effect renderer.

A cast chooses GPU or SVG at launch. Late warmup never replaces an in-flight SVG.
Low FX, reduced motion, unavailable WebGL and context loss use the existing SVG
renderer. Unknown future recipes continue to use the original presentation.
Pause freezes the clock. Hidden tabs stop RAF and catch up on return. Finished
and idle effects have no RAF loop. Unmount destroys GPU resources and listeners.

## Resource Budget

- One application, transparent canvas and disabled application ticker per battle.
- 48 reused sprites; pigment textures are capped at 24 MiB and four atlases.
  Current authored atlases are 2048x1024 RGBA (8 MiB each), so at most three fit.
  LRU eviction happens before upload and explicitly destroys textures. This
  excludes CPU canvas backing, mipmaps, framebuffers and browser overhead.
- Water adds one 1024x768 wave texture, one 64x64 drop texture, three meshes,
  42 sprites and three rings. It is allocated only when needed.
- Shader batch initialization and selected-player/telegraphed-enemy texture
  preparation happen before attacks where possible, during idle question time.
  Fallback keeps gameplay responsive if the renderer is not ready.
- Canvas follows device pixel ratio. No automatic art downsampling is introduced.
- `painted-skills`, `tidalRenderer` and `tidal-pixi` are dynamic chunks excluded
  from PWA shell precache. They runtime-cache on first use, not at title startup.
- The old Tidal comparison route (`?visual=tidal`) is development-only. It is not
  in the production menu or portable app. Local QA fixtures remain in ignored
  `release/`; automated test files are not imported by the production entry.

## Verification

TypeScript, lint, model/catalog tests and production build checks cover the
integration. Browser QA exercises all 101 recipe IDs in both directions, contact,
miss/block, pause/idle, low-FX fallback, context loss and unmount. Narrow layouts
and large enemies are inspected in the actual BattleScreen component.

Production PvP rounds also resolved Forest Storm and Flame Eruption correctly;
the fire cast used one GPU canvas with no duplicate SVG and no console errors.
Idle and paused one-second samples recorded zero WebGL draws.

These checks are not an equal-workload FPS benchmark or physical iPhone thermal
validation. A stronger visual style is also not a replacement for newly drawn
actor poses: existing eight-pose character animation remains unchanged.

## Signature Polish: Eruption, Wolf Cuts, Heavenfall

- `fire:2` (the current localized move is Explosive Flame / 爆炎轟) now uses
  five authored curling silhouettes, a two-layer hot core, ground propagation,
  separating smoke and ascending embers. Normal-alpha compensated keyframe
  blending prevents the mid-frame opacity dip and blends the last flame into
  the first without a loop seam.
- `wolf:0/1/2` share a five-drawing steel sweep atlas, but retain single,
  parallel and delayed crossing cuts. The blades sweep rather than merely
  expanding a fixed cross. Secondary cuts and fragments are visual, not
  additional damage events.
- `boss_sword_god:3` parts clouds, accelerates a decorated central sword downward,
  adds subordinate blades with mastery, and finishes with grounded dust and
  fragments. The target and health bars remain above the entire effect layer.
- Actor art files are NOT redrawn. Existing eight-pose atlases now use dedicated
  windup/release/follow-through curves. The wolf's single/co-op body joins the
  36-percent contact clock; the strike drawing is ready at 30 percent to cover
  CSS startup latency. Enemy casts retain 500ms contact, PvP retains its
  original 400/320ms strike, support begins on its immediate hit. Physical slot
  ownership is captured before delayed callbacks.
- These three families use one 2048x1024 atlas each (eight 512px cells). The
  shared LRU now evicts BEFORE upload and caps total pigment texture storage at
  24 MiB and four atlases. Wolf variants share an atlas. Water/CPU backing/framebuffer
  memory is additional. No new canvas, filters, full-screen blur or reduced
  image resolution was introduced. At most 32 placements per signature frame
  fit the existing 48-sprite pool.
- Signature recoveries finish within 500ms, before the enemy/support 540ms
  clear. Misses/blocks emit no hit art. Low FX/reduced motion/context loss keep
  the existing SVG fallback; idle and paused effects do not run a render loop.

Local browser sampling (Mac, 390x464 arena, 90 warm draws per skill) measured
about 1.2-2.2ms atlas preparation and 0.30ms p95 CPU render submission. These
numbers exclude GPU completion and are NOT a physical iPhone FPS/thermal test.
The local `release/signature-skills-qa.html` fixture does not load or save a game
and is not included in the production app.

## Complete Catalog Polish

`skillChoreography.ts` explicitly lists the remaining 95 IDs, their material,
action and density. A coverage test checks that each current recipe has exactly
one presentation, with no generic fallthrough, unknown or duplicate entries.
The new implementation stays in three cohesive modules, rather than one file
per move: catalog, baked art, and pure timeline choreography.

- Four contour drawings per material/action use compensated alpha blending;
  remaining cells hold material fragments, ground wash, impact and recipe mark.
- Bubble membranes, branching electrical orbs, burning rock cores, veined
  leaves, thorned roots, reflective frost mirrors, fractured ice, faceted stone
  pillars and opening lotus petals replace the old single moving emblem.
- Scythes retain a parallel pair; crosscuts intersect on delayed beats. Frost
  claws cut rather than throwing whole crystals. Slime eruption rises upright.
  The mechanical dragon cannon has compressed blue pulses, not water waves.
- Drain spells circle the target, then return only after confirmed contact.
  Chains retain transparent apertures, prison bars form around the target,
  and nine-head constriction uses coiling serpent contours.
- The three knights retain calculus curves, woven topology rings and vector /
  matrix structures. Rifts open with torn edges, not generic crescent projectiles.
- Fallen blades, feathers, ice and meteors use a main strike and smaller angled
  satellites. Mastery increases formation/layer detail within the same footprint.
- Summon, sweep and channel actor curves supplement the three signature curves.
  Enemy/PvP follow-through survives clearing the late lunge via derived display
  state. It does not add a battle timer or overwrite an active hurt/defeat clip.
  Early player clips recover once; no second follow-through is restarted later.
- All new recovery effects finish within 500ms, below the enemy/support 540ms
  clear. A sampled worst-case new frame uses 29 of the fixed 48 placements.
- Authored art/motion stays together in the lazy `painted-skills` chunk, avoiding
  a circular dependency that previously pulled GPU work into `battle-effects`.
  No additional raster downloads, filters, canvases, lower image resolution or
  new runtime dependency was introduced in this polish pass.

Verification: typecheck, lint, 1,164 tests and production build pass. Browser QA
rendered all 101 IDs in both directions, inspected catalog contact sheets and
flight/late samples, checked 320px/390px battle containers, actual early strike
poses, incoming actor recovery, co-op slot ownership, misses, blocks, low-FX and
WebGL-loss fallback. Idle and paused samples recorded zero GPU draws in one
second. Dedicated browser viewport checks also confirmed innerWidth 320/390
with heights 568/844. These are browser layout checks, not physical phone tests.

Eight warm-render samples on Mac (390x464 arena, DPR 2, 90 frames per skill) had
CPU draw-submit p95 of 0.30-0.50ms and atlas preparation of 1.1-4.7ms. Those exclude
GPU completion and physical iPhone thermal behavior. The final look is authored
vector/pigment-style effects over existing art, not newly hand-painted actor
frames, and automated coverage does not certify subjective AAA art quality.

## Electric Family Refinement

The little electric beast and both evolutions previously fired badge-like
orbs, flat upright bolt polygons and literal metal chain rings. Electric
presentations now use four baked branching filament contours, a small charged
orb, a caster-to-target discharge, staggered thunder strikes and interlacing
electrical restraints. The existing spectral-chain monster retains metal links.
All four player electric skills use the grounded channel body curve instead of
the summon hop or sweeping lunge; battle contact and damage clocks are unchanged.

- Orb scale follows the physical caster as well as the arena. Its travel no
  longer races behind the enemy early, leaving the flight unreadable.
- Filaments have fixed endpoints and split across shallow landscape arenas.
  Uneven after-strikes fade individually rather than standing as a bolt fence.
- Ivory cores, warm halos and local floor light are baked into the existing
  atlas. Electrical casts use CSS screen blending behind the actor layer; no
  full-screen flash, additional canvas, per-frame blur filter or new download.
  This remains 2D light compositing, not dynamic 3D surface lighting.
- The 2048x1024 atlas size, 24 MiB pigment cache and 48-sprite pool are unchanged.
  A four-millisecond-step sample of all four moves, both directions and five
  arena sizes peaked at 42 placements (including zero-alpha transition slots).

Verification: typecheck, zero-warning lint, 1,167 tests and production build.
Browser inspection covered all three actor forms, all four electric moves,
390px and 320px viewports, light/rock and dark/boss scenes. Misses and blocks
disabled painted contact, and idle/paused samples each recorded zero GPU draws
over one second. Warm draw submission p95 was 0.30ms for each electric move on
Mac; preparation measured 0.5-0.9ms. These CPU measurements exclude GPU completion
and compositor work, and are not physical iPhone performance measurements.
