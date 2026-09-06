# Fire Animation Rollout: Batch 3

## Delivered

Eight-pose battle atlases for the full fire starter family: Little Fire Beast (`player_fire0`), Flame Beast (`player_fire1`) and Flame Dragon King (`player_fire2`). Together with the wolf family and one-winged dragon, the active registry covers **7 of 51** forms; **44** retain original art.

Assets:
- `public/sprites/visual-pilot/fire-hatchling-v1.webp`: 225,834 bytes
- `public/sprites/visual-pilot/fire-beast-v1.webp`: 330,524 bytes
- `public/sprites/visual-pilot/fire-dragon-king-v1.webp`: 390,780 bytes
- `public/sprites/visual-pilot/registration-fire-v1.json`: source identifiers/hashes, reviewed crop and matte coordinates, uniform scales, foot anchors, per-frame bounds and output hashes

Each RGBA WebP atlas is 2048x768, containing eight 512x384 cells. This batch adds 947,138 transfer bytes (about 925 KiB); all seven registered atlases total 1,924,760 bytes. One decoded atlas is 6 MiB RGBA before browser overhead. Atlases are requested on appearance, not preloaded for the entire roster, and remain excluded from the PWA image precache. These sizes are not measurements of phone GPU usage or FPS.

The three stages retain distinct identities: the round wingless hatchling with small horns and cream belly; the more angular wingless beast with black horns, gold belly plates and larger tail flame; the final king with two flame-edged wings and charcoal chest armor. They are not recolors or scaled copies.

Only the shared TypeScript asset registry changes in production. The existing battle renderer, animation clips, slot ownership, safe layout and decode-failure fallback remain unchanged. Damage, turn timing, progression, saved data and portrait art are unchanged. The `?visual=pilot` route still previews the original wolf king and one-winged dragon pair.

## Preparation

Generated with the **built-in image tool**, using each original `player_fireN.png` as identity reference. The existing wolf-cub sheet supplied the first style reference, then the new younger fire-stage sheets supplied style references for the next stage. Full prompts appear below.

All three outputs were 1774x887 RGB images with painted checkerboards, not true alpha. Under the user's prior authorization, `scripts/prepare-fire-atlases.py` performs offline processing with Python, Pillow and NumPy:
- Reviewed per-pose crops rather than assuming an exact generated grid.
- Four-connected neutral-background flood fill from the crop border (minimum RGB channel >=220, channel spread <=20).
- Explicitly reviewed extra seed points for enclosed gaps between wings, tail, horns and arms. Bright eyes, teeth, belly and fire cores are not globally color-keyed out.
- One-pixel alpha defringe, common per-atlas scaling, stable support-foot X and a lowest-pixel baseline at y=368.
- At least 12px edge clearance and a fixed union of all eight silhouettes, including attack claws, wings and recoil. Runtime pose changes never refit the drawing or change the actor anchor.

Common packing scales are 0.95 / 0.90 / 0.94; foot X anchors are 296 / 280 / 278 respectively. The king's recoil is registered to its planted claw, not the nearby tail underside or its lifted foot. This is support-foot registration, not a skeletal rig.

WebP quality is 92 for the first two stages and 88 for the king, with method=6 and real alpha. The king initially exceeded the unchanged 400,000-byte per-atlas budget at quality92 and90. Encoding directly from the prepared source at quality88 brought it below budget without reducing resolution or pose count; the result was visually checked in battle. Each run reprocesses the originals, never recompresses a previously lossy WebP.

Rebuild from the task's preserved generated-images directory:

```sh
python3 scripts/prepare-fire-atlases.py --source-dir /path/to/generated_images
```

The script is source-specific offline asset tooling, not a new application module or runtime dependency. Production remains TypeScript/TSX; tests remain JavaScript. Original PNG assets are not overwritten.

## Verification

- All 770 automated tests, TypeScript and ESLint pass. The production build and bundle budget pass: total JavaScript 932.8 KiB / 976.6 KiB; BattleScreen 76.2 KiB / 83.0 KiB. The build reports an existing non-blocking outdated Browserslist data warning; dependencies were not changed for this art batch.
- Offline verification decoded all three shipped WebPs and matched every frame's actual alpha bounds to the registration manifest (24/24), in addition to checking SHA-256 hashes.
- Focused asset and battle-core tests cover distinct fire-stage files, main/sub identity independent of selected co-op role, all selectable PvP stages, alpha flags, dimensions, unchanged transfer budget, hashes, foot registration, gutters and fitting every pose inside the original visual envelope.
- Browser QA mounted the real `BattleScreen` with a temporary fixture that did not run gameplay or save hooks. All three single-mode stages loaded; co-op used different fire stages in main/sub slots; PvP used each stage on both sides.
- At actual CSS viewports 320x568, 390x844, 844x390 and 1280x720, all three co-op stage combinations were inspected across all eight poses (96 combinations). Each set kept identical four actor anchors, selected eight distinct atlas cells, and had no horizontal overflow.
- Visual review checked opaque surfaces, transparent gaps, facing, extended wings and recoil against HUD placement. Narrow/short layouts retain the existing conservative downscaling instead of covering actors with the HUD.
- The sub-slot attack used the beast's attack clip while the main hatchling used its hurt clip. All three PvP stages used enemy attack and player hurt on the correct physical sides.
- Pause froze all atlas animations; low-performance mode removed ambient body breathing while retaining attack/hurt clips. Browser console error log was empty.
- Temporary fixture files/tab were removed and the viewport override reset. No game progress or game save data was changed.

## Limitations

These are eight discrete drawings combined with the existing continuous body motion, not complete frame-by-frame or skeletal animation. Joint proportions, flame shapes and decorations still have some generated variation; slow motion can reveal pose steps. Small baked flame flecks are part of the atlas, not additional live particles. The rollout does not establish physical-phone frame rates or finish the remaining 44 forms. Selection, encyclopedia and evolution portraits remain original.

## Generation Prompts

### Hatchling Sheet

Use case: stylized-concept.
Asset type: production 2D fantasy game animation sprite sheet, eight key poses of the FIRST FIRE STARTER stage only.
Input Image 1: exact character identity reference player_fire0.png. Input Image 2: rendering-quality/style reference ONLY, the wolf cub sheet. Do NOT copy wolves, scarves, fur, weapons or clothing.
Create one landscape 2048x1024 image, exactly FOUR equal columns and TWO equal rows, ONE complete character in each equal 512x512 cell, eight separate drawings of the SAME small fire hatchling. Match Image1: cute compact bipedal orange-red baby dragon/lizard, big golden eyes, short broad friendly snout, two small swept-back golden-orange horns, small flame-like golden head crest and dorsal spines, cream segmented belly, stubby clawed arms and two short sturdy hind legs, curved orange tail ending in an attached small yellow-orange flame. NO wings at this baby stage, no neck ruff, no accessories, no extra limbs. Two arms and two legs in every pose.
Style: polished hand-painted fantasy battle sprite with clean crisp dark contour, rich sculpted shading and warm orange/golden flame color; more refined and smooth than the pixelated source while keeping its identity. Consistent head, eye, belly and body proportions across all eight drawings.
All poses face LEFT in the same three-quarter side camera. Even recoil KEEPS THE NOSE AND GAZE LEFT, leaning back to the RIGHT without turning to look at its tail.
Exact row-major pose sequence: 0 relaxed planted idle, both clawed hands raised lightly; 1 subtle inhale, lifted chest, flickering attached tail flame; 2 crouched anticipation, knees and elbows bent, tail drawn back; 3 forward LEFT claw strike with one arm extended and mouth slightly open, rear support foot still planted; 4 claw follow-through downwards, body leaning forward, tail counterbalances; 5 recovering toward idle, arms retracting; 6 recoil from impact from LEFT, body tilted back RIGHT, eyes squint but snout still LEFT, hands protecting chest; 7 braced recovery, knees bent with both feet planted and gaze LEFT.
Stable support foot near x=270, floor y=450 within each cell. Same zoom/camera/body scale in all eight; drawing height approximately330px. Full horn tips, flame and paws inside each cell with generous margin, no overlap. Flame changes shape but remains attached to tail. NO detached embers/projectiles, NO shadows/ground/text/grid.
Background: genuine transparent RGBA, alpha=0 outside silhouettes, NOT painted checkerboard or solid white/gray/black. Opaque cream belly and golden highlights, no holes. Exactly eight real articulated poses, not repeated resized copies.

### Beast Sheet

Use case: stylized-concept.
Asset type: production 2D fantasy game sprite sheet, eight articulated key poses of the SECOND FIRE STARTER evolution, Flame Beast.
Input Image1: exact character identity player_fire1.png. Input Image2: drawing/style/pose-layout reference only, the younger fire hatchling sheet. Do NOT copy the baby's round head, stubby body or small horns.
Produce one landscape 2048x1024 transparent RGBA sheet, FOUR equal columns by TWO equal rows, ONE full-body character in each cell, exactly eight distinct poses.
Subject: SAME adolescent flame dragon in all eight drawings. Preserve Image1: mature narrow angular orange dragon snout, stern golden eye, prominent two long swept-back BLACK horns, a golden-orange flame crest between horns, long segmented tan/gold armored chest and abdomen, bipedal athletic orange-red scaled body, muscular hind thighs, two clawed arms with black claws and attached orange flame accents on forearms/shoulders, small dorsal flame spikes, long curved orange tail with LARGE attached yellow-orange flame plume. NO wings yet; no baby round proportions. Exactly two arms/two legs, no accessories or weapons. Consistent horns, head scale, armor plates, muscle mass.
Rendering: refined hand-painted fantasy creature sprite with clean crisp dark contour, detailed warm sculpted shading, luminous yellow flame cores but NO exterior glow halo. Match the fire hatchling sheet's visual family while clearly a taller, more angular, stronger evolution.
Same three-quarter side camera facing LEFT in ALL eight cells. Recoil leans backward RIGHT but muzzle and eyes continue LEFT, never turn head toward tail.
Row-major poses0..7: 0 planted idle with claws at sides; 1 slow inhale, chest/head rise subtly and attached tail flame flexes; 2 knees lowered, elbows drawn back, anticipating strike; 3 strike LEFT with one claw arm extended and mouth open, rear supporting foot remains planted; 4 follow-through claw sweeps down/forward with torso leaning LEFT; 5 recovering towards upright idle with claws retracting; 6 recoil from impact coming LEFT, head pulls back but snout still LEFT, eyes squint and forearms raised protectively; 7 low braced recovery, bent knees, feet grounded, gaze LEFT.
Same zoom and body size, stable rear supporting foot location near x=285 and lowest foot y=450 per512x512cell. Drawing height approximately340px. Generous clear margins for horns/tail flame/claws, no cropping or adjacent cell overlaps. Fire is attached, no loose sparks, no projectiles, no floor/shadows/gridlines/labels/text.
Background genuinely empty alpha=0, NOT a painted white/gray checkerboard, no colored backdrop. Keep belly and fire cores opaque. Eight drawings of the second stage only, not repeated scaled images.

### Dragon King Sheet

Use case: stylized-concept.
Asset type: production 2D fantasy battle sprite atlas, eight key poses of the FINAL FIRE STARTER evolution, Flame Dragon King.
Input Image1: exact character identity reference player_fire2.png. Input Image2: rendering-style and eight-pose rhythm reference ONLY, the younger wingless flame beast. Final dragon must preserve Image1's large wings and dark charcoal torso, NOT copy younger stage's tan belly.
One landscape 2048x1024 image with exactly FOUR equal columns and TWO equal rows. One full-body dragon per equal cell, exactly EIGHT distinct action drawings of the SAME dragon king.
Identity: proud muscular orange-red bipedal dragon, long angular snout pointing LEFT, swept-back dark horns with orange-gold flame crest, long dark CHARCOAL-GRAY segmented armored neck/chest/belly extending to tail underside. Orange armored shoulders, scaled arms with black claws, strong hind legs. Exactly TWO large batlike wings growing from BACK, each with dark-red ribs and amber-orange membrane, attached yellow-orange flames along outer edges. Orange curved tail on RIGHT with large curling attached flame plume. Exactly two arms, two legs and two wings; no missing/extra wings or arms, no crown/clothing/weapons. Preserve same horns/body/head proportions throughout.
Style: refined hand-painted fantasy game sprite, crisp detailed contour, sculpted warm highlights on orange scales, dark central armor. Rich golden flame accents, opaque surfaces, NO external glow halo. Match the existing game's polished sprite family, not photorealistic or 3D.
Same three-quarter side camera and SAME SCALE in EVERY cell. The dragon faces LEFT in ALL eight poses, including recoil. Recoil leans RIGHT but muzzle/gaze remain LEFT. Full wings/tail/horns/claws always entirely inside own cell. Maximum wing spread approximately400px, total drawing height~340px in512x512cell, wide clear margins. Do NOT resize torso when wings change pose.
Exact row-major poses: 0 regal grounded idle, wings held in broad relaxed half-open arch; 1 inhale chest rises subtly, wings lift slightly at shoulder, flame edges curl; 2 attack anticipation knees bend, torso lowers, wings fold slightly backwards; 3 powerful LEFT claw thrust, mouth open roaring, shoulder and wing joints extend while hind foot remains grounded; 4 follow-through claw sweeps down LEFT, wing membranes flex backward and tail counterbalances; 5 recovery to upright idle, wings return to relaxed arch; 6 recoils from LEFT impact, torso leans back RIGHT, claws protect chest, wings flex back, eyes squint but nose still LEFT toward opponent; 7 braced recovery with knees bent, wings partly tucked yet both visible.
Stable support foot location near cellx=255, floor y=450. Only articulated pose changes, no camera/scale/orientation changes. Genuine transparent RGBA alpha=0 exterior, NOT a painted checkerboard or white/gray/black background. No shadow/ground/labels/grid/text/projectiles/detached sparks, fire remains attached. Keep wings separated from arms and tail legible.
