# Wolf Animation Rollout: Batch 2

## Delivered

New battle atlases for Little Steel Wolf (`player_wolf0`) and Steel Blade Wolf (`player_wolf1`), completing the three-stage wolf family alongside the existing wolf king. The active registry now covers **4 of 51** forms, including the one-winged dragon. The other **47** forms retain original art.

Assets:
- `public/sprites/visual-pilot/steel-wolf-cub-v1.webp`: 170,342 bytes
- `public/sprites/visual-pilot/steel-wolf-blade-v1.webp`: 179,298 bytes
- `public/sprites/visual-pilot/registration-wolf-v1.json`: source identifiers/hashes, common scale, crop coordinates, foot anchors, per-pose bounds and output hashes

Each atlas is RGBA WebP, 2048x768, with eight 512x384 cells. Together the two new assets transfer 349,640 bytes (about 341 KiB). Each decoded atlas occupies 6 MiB RGBA before browser overhead. All four registered atlases total 977,622 transfer bytes; they are not preloaded together. This batch does not change the battle renderer, add JS animation loops, replace menu/encyclopedia portraits, or alter progression, damage or save data.

## Preparation

Generated with the **built-in image tool**, not the API/CLI fallback, using original wolf-stage PNGs for identity and the existing wolf-king atlas for style. The cub retains its short muzzle, large eyes and small red bandana; the blade wolf has a more mature muzzle, longer limbs and fuller neck ruff. Neither borrows the king's royal cape or body runes.

The two generated 1774x887 RGB sheets contained painted checkerboards. Per prior user approval, offline Python/Pillow/NumPy processing removes only border-connected neutral pixels (minimum channel >=220, channel spread <=20). Enclosed white fur is retained regardless of region size. A one-pixel edge defringe removes checkerboard contamination. Crops are individually reviewed; they are not assumed to match an exact generated grid.

The cub's first recoil drawing faced backward. A targeted built-in image edit corrected the head/neck to face the opponent without mirroring the body. That 1536x1024 RGBA edit included an exterior glow: alpha <=240 is discarded and 240..250 is ramped to full opacity, retaining the solid sprite. Its drawing is normalized to a 292px height before the common atlas packing scale. This is an isolated resolution normalization, not runtime per-pose resizing.

Support-foot X anchors were reviewed per pose. Every pose uses one common packing scale per atlas (cub 1.0, blade 0.84), a stable foot-X anchor (356 and 306), the common y=368 lowest-pixel floor and >=12px gutters. Some paws lift during actions; this is not full skeletal registration. Fixed union bounds feed the existing profile-fit and safe-placement code, so changing a pose cannot change actor scale or layout.

The original source files remain under the task's generated-images directory. Rebuild from that directory with:

```sh
python3 scripts/prepare-wolf-atlases.py --source-dir /path/to/generated_images
```

The script is offline asset tooling, not production application code or a runtime dependency. It requires Pillow and NumPy in the chosen Python environment. Source filenames and SHA-256 values are in the registration JSON. Runtime remains TypeScript/TSX, tests remain JavaScript.

## Limitations

Eight key poses plus existing continuous body motion are not full frame-by-frame or skeletal animation. Generated drawings retain some anatomical and expression variation. This is a staged art upgrade, not a claim of perfectly continuous limbs or completion of the other 47 forms. Original selection, encyclopedia and evolution-screen portraits remain unchanged.

## Verification

- 766 automated tests pass, including all four atlases' alpha flags, dimensions, transfer budgets, hashes, eight pose records, gutters, fixed-scale foot registration and union-bound fitting.
- TypeScript, ESLint and production bundle budgets pass. Total JavaScript is 932.5 KiB against the 976.6 KiB limit. Only registry metadata is added to production code; the renderer is unchanged.
- Browser checks mounted the real `BattleScreen` with temporary no-save fixtures. The two new stages loaded independently; co-op main cub and sub blade used their own hurt/attack channels. Pause and low-performance behavior remained intact. No browser console errors occurred.
- At actual CSS viewports 320x568, 390x844, 844x390 and 1280x720, all eight pose inspections kept the same four actor anchors and produced no horizontal overflow. Visual review checked forward-facing recoil and silhouettes against HUD placement. These browser checks are not physical-phone GPU/FPS measurements.
- Temporary QA files and the test tab were removed. The user's existing game/result tab and saved progress were not changed.

## Generation Prompts

### Cub Sheet

Use case: stylized-concept.
Asset type: production 2D game animation sprite atlas for the FIRST evolution stage only, the little steel wolf cub.
Input Image 1: exact character identity reference, player_wolf0.png. Input Image 2: STYLE AND EIGHT-POSE REFERENCE ONLY, the evolved wolf king atlas; do NOT copy its adult anatomy, royal cape, jewelry, spikes or glowing body runes.
Generate one landscape 2048x1024 image with exactly FOUR equal columns and TWO equal rows, eight separate equal 512x512 cells. Each cell contains ONE complete rendition of the SAME young gray/silver wolf cub facing LEFT in three-quarter side view. Cute alert large cyan-blue eyes, short muzzle, large triangular ears with white insides, gray back, pale silver forehead markings, white muzzle/chest and paws, compact four-legged puppy anatomy, fluffy upcurved tail, simple small red triangular bandana tied at the neck. Preserve this juvenile identity across all eight cells; no adult wolf, no crown, no cape, no armor, no magical body markings.
Style: polished hand-painted fantasy game sprite, crisp fine edges, soft sculpted fur shading and restrained cyan eye highlights, matching Image 2 rendering quality. Opaque white fur, no transparent holes in the character.
Scene/backdrop: genuinely TRANSPARENT RGBA outside the wolves. No simulated checkerboard, no gray or white background, no ground, no cast shadows, no text or labels or grid lines.
Composition: same camera, same body and head scale, same planted back supporting paw location in each cell, generous clear margin at every cell edge. Pose changes alter joints, expression, scarf ends and tail, not camera angle or zoom. Every muzzle and gaze point LEFT, INCLUDING RECOIL. Full ears, paws and tail inside each cell, poses must not overlap. Hind support paw near x=335, floor near y=450 in each cell, main drawing height approximately300 pixels.
Exact row-major sequence, cells 0..7: 0 calm alert idle on four paws; 1 subtle inhale lifting chest and head, tail curling slightly; 2 anticipating pounce, crouched forelegs, torso low, ears slightly back; 3 swift strike LEFT, one forepaw extending LEFT and muzzle open slightly, hind paw stays planted; 4 follow-through forepaw sweeping down, body still facing LEFT, tail flexing; 5 recovering smoothly to four paws; 6 recoil from an impact arriving from LEFT, head pulling back toward RIGHT but muzzle and gaze STILL LEFT, one front paw lifted defensively; 7 low braced recovery stance facing LEFT, forepaws grounded. Friendly action game, no injuries or blood. Exactly eight real drawings, uniform proportions, no external projectiles.

### Blade Sheet

Use case: stylized-concept.
Asset type: production eight-pose 2D game SPRITE ATLAS for STEEL BLADE WOLF, the SECOND evolution stage.
Input Image 1: exact character identity, player_wolf1.png. Input Image 2: polished evolved wolf king STYLE reference only. Do not copy the king's royal cape, jewelry or cyan body runes.
Create one landscape 2048x1024 transparent RGBA sheet with exactly 4 columns x2 rows of equal 512x512 cells, ONE full-body wolf per cell, eight actual distinct joint poses. Same mature lean adolescent wolf in all cells: longer legs and narrower mature muzzle than a puppy, gray steel fur, silver-white cheek ruff/chest/paws, pointed tall ears, turquoise blue eyes, confident alert expression, large fluffy upcurved tail, simple RED triangular neck scarf tied behind the neck with two short red ends. No armor, no cloak, no gold, no magic body markings. Rich polished hand-painted fantasy-game shading, clean crisp silhouette, white fur stays fully opaque. Consistent anatomy, same head-to-body ratio and same body length in every cell.
All eight wolves face LEFT with the same three-quarter side camera. In particular the bottom row THIRD CELL (recoil, index6) must KEEP THE NOSE AND GAZE POINTING LEFT. It can lean backward to RIGHT but must NOT turn its head to look RIGHT at its tail. No head turning backwards in any cell.
Pose order left-to-right row-major: 0 planted alert idle; 1 subtle inhale, chest lifted and tail flex; 2 crouched pounce anticipation, forelegs bent, ears back; 3 attack thrust LEFT with one front claw sweeping forward and mouth open, hind support paw planted; 4 follow-through front claw lowers and scarf flicks back; 5 recovering to four paws; 6 hit reaction, body shifts backward toward RIGHT, nose STILL POINTS LEFT toward opponent, eyes squint, front paw lifts protectively; 7 low braced recovery on grounded forepaws.
Uniform camera, scale, and stable hind support paw near x=340 and floor y=450 within each cell. Drawing height~300px, leave generous transparent margin around ears, paws and tail, no pose clipping or overlap, no gridlines, no text, no ground, no shadows, no projectiles, no wounds. Genuinely empty alpha=0 background, NOT painted white/gray checkerboard. Exactly eight steel blade wolves, not a poster.

### Cub Recoil Correction

Use case: precise-object-edit.
Asset type: ONE corrected recoil sprite of the little gray steel wolf cub, on genuinely TRANSPARENT RGBA background.
Image 1 is the EDIT TARGET. Image 2 is the exact identity and LEFT-FACING reference.
Change ONLY Image1's head and neck direction: the cub recoils backward toward screen RIGHT from an impact coming from screen LEFT, while KEEPING its muzzle, black nose and gaze directed LEFT toward its opponent as in Image2. Do NOT mirror the whole body. Keep Image1's recoiling body, lifted defensive forepaw, planted hind paws, tail, gray/silver fur, blue eyes, red small bandana and juvenile proportions. Small strained squint, no injuries or blood. Same drawing scale and camera; no adult anatomy, no cape or armor. Preserve opaque white fur with no holes.
Output ONE full-body wolf, complete ears/paws/tail with generous clear margin on all sides, no extra poses. Remove the painted checkerboard entirely; all exterior background must be genuine alpha=0, NOT a white/gray checkerboard picture, no ground or shadows or text.
