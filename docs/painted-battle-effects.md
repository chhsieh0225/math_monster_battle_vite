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

## Sequential Fire Meteors

`fire:3` and `monster:fire_rain` now have independent falling, contact and ember
phases. The first impact follows the real battle hit; subsequent visual impacts
arrive 92ms apart. Mastery tiers show three, four or five meteors. Each impact
has its own fade, so the final meteor is not dimmed by the first impact's age.
All recovery ends by 500ms without changing damage, actor motion or battle timers.
Other fire moves, stone meteors, lightning, water and grass remain unchanged.

Four flame contours surround a stable charred rock with molten seams. Warm
halos, ivory cracks, small impact flames and local floor light are baked into
the existing eight-cell atlas. Normal blending preserves the dark rock; no
full-canvas screen blend, runtime blur, extra texture download or new canvas.
The leading edge is anchored to each landing point, with bounded lateral spread
and top clearance. Actors and HUDs retain their higher drawing layers.

Verification: typecheck, zero-warning lint, 1,170 tests and production build.
Dense timeline checks stay at or below 20 placements within the existing pool
of 48. Browser inspection covered 320px/390px CSS viewports, outgoing/incoming
casts, light/rock and dark/boss scenes, miss/block and low-FX fallback. Idle and
paused samples each recorded zero GPU draws over one second. Two Mac warm-render
samples (90 frames, 390x464 arena) measured CPU submit p95 of 0.40-0.50ms and
atlas preparation of 2.0-5.9ms. These exclude GPU completion/compositing and do
not establish physical iPhone FPS or thermal performance.

## Steel And Blade Material Audit

Eleven steel-family moves and three physical sword-god presentations now have
explicit metal finishes, independent of the shared pigment or damage type:

| Family | Recipe IDs | Refinement |
| --- | --- | --- |
| Steel wolf, all forms | `wolf:0/1/2/3` | Reflective single, parallel and crossing cuts; bright sword-field edges |
| Steel slime and evolved form | `monster:slime_shard`, `monster:slime_forge` | Metal splinters and forged facets instead of ordinary rock surfaces |
| Iron dragon and evolved form | `monster:dragon`, `monster:dragon_cannon` | Titanium claw rims, mechanical pressure rings and a flowing bright core |
| Topology knight | `topology_knight:0/1/2` | Twisted metal slash, open linked bands and three interlocking orbital rings |
| Sword god | `boss_sword_god:0/1/3` | Silver blade faces, warm gilded edge light and metal contact sparks |

Dark steel planes, moving reflection bands, brushed grain and narrow ivory edge
light are baked into the existing atlases. Contact sparks replace solid star
bursts. Normal-alpha compositing retains the dark metal; no screen-wide white
wash, runtime blur/filter, new texture download or extra canvas. Actor art and
background files are unchanged. Candy crystal, ice, dream threads, ordinary
stone and the sword god's light rift deliberately keep their own materials.

Titanium claws extend slightly toward the attacking side so they remain visible
outside a large target silhouette. Cloud Sword Orbit uses four to six swords
around the target rather than immediately shrinking behind its centre. Infinite
Orbit uses three open metal rings instead of eight small repeated knot clusters.
Physical target slots, damage, hit clocks and the 500ms recovery limit are unchanged.

Verification: typecheck, zero-warning lint, 1,172 tests and production build.
Four-millisecond timeline sampling across all 14 moves, four arenas, both
directions and three mastery tiers peaked at 30 placements in the existing
48-sprite pool. The 2048x1024 atlas size and 24 MiB pigment cache remain unchanged.
All 14 presentations were inspected in the actual BattleScreen QA fixture,
including 320px/390px CSS viewports, steel/rock/heaven and dark-boss backgrounds.
Warm CPU draw-submit p95 measured 0.20-0.50ms over 90 frames per move on Mac;
uncached atlas preparation measured 1.1-5.3ms (wolf slashes reuse their atlas).
These measurements exclude GPU completion/compositing and physical phone thermal
behavior. This is authored 2D material compositing, not dynamic 3D metal lighting.

## Clear Ice Material Refinement

The ice tiger's three standard moves now use a dedicated clear-ice atlas painter:

- `tiger:0`: a thick faceted ice projectile, small mastery satellites, trapped
  fractures and bright edge reflections. The solid projectile breaks on the real hit.
- `tiger:1`: two or three beveled ice mirrors that travel from the caster, fan out,
  turn edge-on and shatter. No eight-badge orbit or opaque central face.
- `tiger:2`: three broad, chipped ice claws with 29ms staggered contacts, moving
  edge glints, fine fracture lines and tumbling translucent debris.
- `tiger:3`: the advanced icefall reuses the same clear-ice material on long prisms.

The broad face has low-alpha blue/cyan facets, while bevels carry stronger tint,
thin shadow/refraction lines, frost at chipped corners and cold-white highlights.
Four stable contour frames move the reflection rather than morphing the ice's
outline. This is authored 2D translucency, not a screen-reading refraction shader.
The background shows through; there is no full-screen white or blue veil. Atlas
glow is baked once, with normal-alpha compositing and no runtime blur/filter.
Existing actor clips, physical source/target anchors, hit timing, damage, layer
order, full DPR and the 500ms recovery limit are unchanged.

Verification: typecheck, zero-warning lint, 1,174 tests and production build passed.
Dense 4ms sampling across four arenas, both directions and all three mastery tiers
peaked at 23 placements in the existing 48-sprite pool. The eight-tile atlas and
24 MiB texture cache are unchanged. Mac warm CPU draw-submit p95 was 0.30-0.70ms
over 90 frames per move; uncached atlas preparation was 1.0-3.8ms. These are not
GPU completion times or physical iPhone frame-rate/thermal measurements.

## Lion Solar Material Refinement

The four lion moves now have a scoped `solar` pigment rather than borrowing
ordinary claws, moon crescents and fireballs. A single family module contains the
eight-tile atlas art and its matching choreography; other light/dark families
retain their own materials.

- `lion:0`: three staggered pearl-white pounce cuts with champagne edges and
  translucent trailing pigment. Mastery increases their breadth, not screen flash.
- `lion:1`: expanding open pressure fronts leave the physical caster's mouth.
  Their planes follow the attack direction, including reverse and diagonal casts.
- `lion:2`: a lion-profile solar-flame hunt with ivory core, translucent streaming
  mane and a brief crowned-lion impression on contact; no orange fireball.
- `lion:3`: a dark-edged eclipse corona and radiant mane, with a clear centre and
  viewport-safe bounds. The move retains its dark/light gameplay identity.

Uneven light bands, sparse rays, cool pearl accents, fine brush lines and baked
local glow distinguish this material from electric arcs and ice facets. Damage,
actor animation clocks and render-layer order are unchanged. Misses and blocks
do not emit contact rays. All effects expire within the existing 500ms recovery.
No new image downloads, canvas, runtime bloom or lower-resolution rendering.

Verification: typecheck, zero-warning lint, 1,177 tests and production build passed.
Dense 4ms timeline sampling of all four moves, four arenas, both directions and
all mastery tiers peaked at 21 placements out of the existing 48-sprite pool.
The eight-tile atlas and 24 MiB texture cache are unchanged. Mac CPU draw-submit
p95 was 0.30ms over 90 warm frames per move; preparation took 0.6-1.9ms. These
measurements exclude GPU completion and are not physical iPhone FPS measurements.
Visual checks include all four moves, small/final lion forms, dark and bright
heaven scenes, narrow 320px and normal layouts, outgoing and incoming attacks.
