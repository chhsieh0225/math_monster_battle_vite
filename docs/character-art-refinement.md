# Character Art Refinement

## Shipped Scope

- Fire hatchling (`player_fire0`): smooth painted contours, sculpted horns/scales, warmer highlights, clearer expressions and articulated eight-pose actions.
- Ghost (`ghost`): cleaner cloth folds, ruby eye highlights, expressive recoil, and consistent eight-pose hood/hand drawings.
- Both use the built-in `image_gen` tool with the existing atlas as an identity reference. These are new drawings, not a CSS recolor. Their original v1 atlases remain unchanged.
- All 51 active forms receive body motion chosen by weight/material: grounded, soft, hover, wing or heavy. Only the two reviewed new atlases use the alternate idle expression drawing.
- This is still eight-key-pose 2D animation, not 3D, skeletal articulation or generated in-between frames. The other 49 forms have not been redrawn in this revision. Menu portraits and boss-introduction portraits are unchanged.

## Assets And Reproduction

| Identity | Production asset | Bytes |
| --- | --- | ---: |
| Fire hatchling | `public/sprites/visual-pilot/fire-hatchling-v2.webp` | 297606 |
| Ghost | `public/sprites/visual-pilot/ghost-v2.webp` | 326046 |

The full final prompt set, input identities, generated source filenames and reviewed anchors are in `scripts/refined-art-sources.json`. Source PNGs were generated in the local Codex generated-images directory; the game uses only the repository WebPs.

The offline Pillow/NumPy pipeline preserves native alpha rather than eroding the whole sprite. It removes near-transparent noise below alpha 16, packs the cells at one uniform scale, aligns the support/hover baseline and records hashes, alpha bounds and offsets. Existing magenta-matte sources retain their previous extraction path.

```sh
python3 scripts/prepare-roster-atlases.py \
  --source-dir /path/to/generated_images \
  --manifest scripts/refined-art-sources.json \
  --registration registration-refined-v2.json \
  --preview-dir /tmp/refined-art-review
python3 scripts/prepare-roster-atlases.py --verify
```

`public/sprites/visual-pilot/registration-refined-v2.json` registers the new files. Verification covers 53 stored atlases / 424 cells, including the two retained older versions; active battle coverage remains 51 forms / 408 cells.

## Motion And Safety

- The existing physical slot still owns facing, attack travel, hit reactions and action duration. No damage, turn, progression or save behavior changes.
- One body wrapper contracts and settles around the registered support pivot. Hover lift is bounded by the space recovered through contraction. Idle motion never enlarges the registered silhouette.
- The old generic breath layer is disabled only once atlas art has decoded. Legacy outer idle enlargement/lift is suppressed for atlas actors, but attack/hit transforms and low-HP/boss filter cues remain.
- Main/sub slots have offset idle beats rather than synchronized breathing. Body and pose animations share the action duration and pause together during game pause or impact freeze.
- Low-performance mode stops idle motion and expression changes while retaining short attack/recoil motion. Reduced-motion CSS disables both animation layers and retains static action poses.
- No new particles, blur filters, timers, per-frame React state or runtime dependencies. Texture dimensions remain 2048x768 and each actor still uses one atlas. The two replacements total about 236 KiB more transfer than their previous versions and load on demand, not on every game launch. Physical-device FPS and thermals are not measured.

## Validation

- All 51 forms decoded in a browser fixture mounting production `BattleSprite`; all eight pose positions and stable outer dimensions were verified.
- Production `BattleScreen` was sampled in solo and four-actor Co-op, with the new art, narrow portrait and short landscape layouts, Crazy Dragon, Sword God and independently resolved Dragon King phase-two art. No horizontal overflow or observed actor/HUD occlusion in the sampled static poses.
- Viewport overrides were requested at 390x844, 844x390, 320x568, 568x320 and 1280x720. The browser reported CSS viewports 354x767, 767x354, 291x516, 516x291 and 1163x654; these are emulated checks, not physical-phone testing.
- Live computed styles confirmed idle movement, removal of stacked breathing, the secondary actor's exclusive attack clip, exact retained matrices while paused, and low-performance idle-off / attack-on behavior. Reduced-motion rules were reviewed, not OS-preference-emulated.
- The temporary QA entry points are removed after verification; no game-save actions or audio settings were used.
- TypeScript, strict lint, all 861 tests, `git diff --check` and production bundle budgets pass. Total JavaScript is 964.3 KiB / 976.6 KiB; BattleScreen is 78.7 KiB / 83.0 KiB. No budget thresholds were increased. This is local verification, not a new remote CI run.
