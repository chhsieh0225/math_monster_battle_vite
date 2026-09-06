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
- Runtime fits the union of all eight silhouettes once to the original padded profile envelope. It does not resize or recenter each pose. Existing HUD-safe placement, facing, impact anchors and physical-slot action ownership remain unchanged.
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
- `npm run lint`, `npm run typecheck`, all **822 tests**, and `npm run build:budget` pass.
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
