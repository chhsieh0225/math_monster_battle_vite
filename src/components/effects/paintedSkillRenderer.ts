import { Application, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { getSkillRecipe } from './skillRecipes.ts';
import { paintSkillAtlas } from './paintedSkillArt.ts';
import { clamp01, getBattleTidalTime, getEffectLighting, getPaintedFrame, getTidalLayout, isTidalEffect, tidalSeed, TIDAL_TIMING } from './skillEffectModel.ts';
import type { BattleEffectClock, TidalLayout } from './skillEffectModel.ts';
import { createTidalPainter } from './tidalRenderer.ts';
import { getSignatureArt, paintSignatureAtlas } from './signatureSkillArt.ts';
import { drawSignatureSkill } from './signatureSkillMotion.ts';
import { getSkillChoreography } from './skillChoreography.ts';
import { paintChoreographyAtlas } from './skillPigmentArt.ts';
import { drawChoreographedSkill } from './skillPigmentMotion.ts';

type Atlas = { root: Texture; tiles: Texture[]; bytes: number };
export type PaintedSkillRenderer = {
  prepare: (skillId: string, type: string, scene?: string) => void;
  draw: (clock: BattleEffectClock | null, layout: TidalLayout, scene?: string) => void;
  destroy: () => void;
};

/** One context and sprite pool; the LRU bounds pigment texture storage to 24 MiB. */
export async function createPaintedSkillRenderer(host: HTMLElement, onLost: () => void): Promise<PaintedSkillRenderer> {
  const app = new Application();
  try {
    await app.init({ preference: 'webgl', width: 1, height: 1, backgroundAlpha: 0, antialias: true,
      resolution: window.devicePixelRatio || 1, autoDensity: true, autoStart: false, sharedTicker: false });
  } catch (error) { app.stage.destroy({ children: true }); app.renderer?.destroy({ removeView: true }); throw error; }
  app.stop();
  const canvas = app.canvas; canvas.setAttribute('aria-hidden', 'true'); host.appendChild(canvas);
  canvas.addEventListener('webglcontextlost', onLost);
  const root = new Container(); app.stage.addChild(root);
  const sprites = Array.from({ length: 48 }, () => { const sprite = new Sprite(Texture.EMPTY); sprite.anchor.set(.5); sprite.visible = false; root.addChild(sprite); return sprite; });
  const atlases = new Map<string, Atlas>();
  const atlasKey = (id: string, type: string, scene: string) => `${getSignatureArt(id) || `${id}/${type}`}/${getEffectLighting(scene)}`;
  let atlasBytes = 0;
  let water: ReturnType<typeof createTidalPainter> | null = null;
  let destroyed = false, lastW = 0, lastH = 0;
  const disposeAtlas = (atlas: Atlas) => {
    for (const sprite of sprites) if (sprite.texture.source === atlas.root.source) sprite.texture = Texture.EMPTY;
    atlas.tiles.forEach((texture) => texture.destroy()); atlas.root.destroy(true);
    atlasBytes -= atlas.bytes;
  };
  const destroy = () => {
    if (destroyed) return; destroyed = true;
    canvas.removeEventListener('webglcontextlost', onLost);
    water?.destroy();
    atlases.forEach(disposeAtlas); atlases.clear();
    app.destroy({ removeView: true }, { children: true });
  };
  const prepare = (skillId: string, type: string, scene = '') => {
    if (destroyed) return;
    if (skillId === 'water:2') {
      if (!water) {
        water = createTidalPainter(app);
        water.draw(TIDAL_TIMING.hit, 5, getTidalLayout(lastW || 1, lastH || 1), false);
        water.setVisible(false); app.render();
      }
      return;
    }
    const lighting = getEffectLighting(scene);
    const key = atlasKey(skillId, type, scene);
    const cached = atlases.get(key);
    if (cached) { atlases.delete(key); atlases.set(key, cached); return; }
    const recipe = getSkillRecipe(skillId); if (!recipe) return;
    const signature = getSignatureArt(skillId);
    const choreography = getSkillChoreography(skillId);
    const art = signature ? paintSignatureAtlas(signature, lighting === 'night')
      : choreography ? paintChoreographyAtlas(choreography, recipe, type, lighting) : paintSkillAtlas(recipe, type, lighting);
    const bytes = art.width * art.height * 4;
    // Evict before uploading so preparing a fifth atlas cannot briefly exceed the budget.
    while (atlases.size >= 4 || atlasBytes + bytes > 24 * 1024 * 1024) {
      const oldest = atlases.keys().next().value!;
      disposeAtlas(atlases.get(oldest)!); atlases.delete(oldest);
    }
    const texture = Texture.from(art), columns = art.width / 512;
    const tiles = Array.from({ length: columns * 2 }, (_, i) => new Texture({ source: texture.source,
      frame: new Rectangle(i % columns * 512, Math.floor(i / columns) * 512, 512, 512) }));
    atlases.set(key, { root: texture, tiles, bytes }); atlasBytes += bytes;
    // Upload during the question/telegraph, not during the first impact frame.
    app.renderer.texture.initSource(texture.source);
  };

  const draw = (clock: BattleEffectClock | null, layout: TidalLayout, scene = '') => {
    if (destroyed) return;
    if (layout.width !== lastW || layout.height !== lastH) {
      app.renderer.resize(layout.width, layout.height); lastW = layout.width; lastH = layout.height;
    }
    root.visible = false; water?.setVisible(false);
    if (!clock) { app.render(); return; }
    const effect = clock.effect;
    if (isTidalEffect(effect)) {
      water ??= createTidalPainter(app); water.setVisible(true);
      water.draw(getBattleTidalTime(clock), effect.lvl, layout, false); return;
    }
    const f = getPaintedFrame(clock), recipe = getSkillRecipe(effect.skillId);
    if (!recipe || !f.visible) { app.render(); return; }
    prepare(effect.skillId!, effect.type, scene);
    const key = atlasKey(effect.skillId!, effect.type, scene), atlas = atlases.get(key)!;
    atlases.delete(key); atlases.set(key, atlas);
    sprites.forEach((sprite) => { sprite.visible = false; }); root.visible = true;
    let cursor = 0;
    const put = (tile: number, x: number, y: number, width: number, height: number, rotation = 0, alpha = 1, flip = 1) => {
      if (cursor >= sprites.length || alpha <= .002 || width <= .01 || height <= .01) return;
      const sprite = sprites[cursor++]; sprite.texture = atlas.tiles[tile]; sprite.visible = true;
      sprite.position.set(x, y); sprite.width = width; sprite.height = height; sprite.scale.x = Math.abs(sprite.scale.x) * flip;
      sprite.rotation = rotation; sprite.alpha = clamp01(alpha);
    };
    if (drawSignatureSkill(clock, layout, put)) { app.render(); return; }
    if (drawChoreographedSkill(clock, layout, put)) { app.render(); return; }
    const { source: a, target: b, direction: dir } = layout;
    const size = Math.min(layout.width * .48, layout.height * .46, b.size * 1.28, 255);
    const dx = b.cx - a.cx, dy = b.cy - a.cy, angle = Math.atan2(dy, dx);
    const p = f.flight * f.flight * (3 - 2 * f.flight);
    const x = a.cx + dx * p, y = a.cy + dy * p;
    const fade = f.fade;
    const growth = f.contact ? 1 + Math.sin(Math.min(1, f.decay * 2) * Math.PI) * .12 : .35 + .65 * p;
    const { motion, motif } = recipe;
    const clockMs = f.contact ? f.contactAge : f.age;
    const detail = f.tier - 1;
    const ground = (opacity: number) => put(2, b.cx, b.cy + size * .31, size * 1.1, size * .32, -.07, opacity);

    if (motion === 'shot' || motion === 'rush') {
      const count = motif === 'bubble' ? 3 + detail : 1 + detail;
      for (let i = count - 1; i >= 0; i--) {
        const offset = (i % 2 ? -1 : 1) * i * size * .12;
        const spread = f.contact ? 1 + f.decay * 1.7 : 1;
        const length = size * (motion === 'rush' ? 1 : .67) * (1 - i * .12) * growth;
        put(0, x - Math.cos(angle) * i * size * .19, y + offset * spread, length,
          length * (1 + Math.sin(clockMs / 67 + i) * .06), motif === 'bubble' ? i * .2 : angle, fade * (1 - i * .18));
      }
      if (motion === 'rush' || (motif !== 'bubble' && motif !== 'mirror')) {
        for (let i = 0; i < 3; i++) put(2, x - dx * (.04 + i * .1), y - dy * (.04 + i * .1),
          size * (1.15 - i * .22), size * (.5 - i * .08), angle + .25, fade * (.45 - i * .1) * f.flight);
      }
    } else if (motion === 'slash') {
      ground(fade * .24);
      const parallel = effect.skillId === 'wolf:1';
      const crossing = effect.skillId === 'wolf:2' || effect.skillId === 'monster:venom_cross';
      const splitBlade = parallel || effect.skillId === 'wolf:2';
      const count = splitBlade ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const turn = crossing ? -.4 + i * 1.6 : -.22;
        const sweep = f.contact ? clamp01((f.contactAge - i * 45) / 95) : f.flight * .18;
        put(splitBlade ? 0 : 1, b.cx + dir * (sweep - 1) * size * .22, b.cy + (parallel ? (i - .5) * size * .28 : 0),
          size * (1.28 + detail * .07) * sweep, size * (f.contact ? 1 : .3), turn * dir,
          fade * (f.contact ? 1 : .3), dir);
      }
      if (f.contact && detail) put(2, b.cx, b.cy + size * .06, size * 1.45, size * .83, -.35 * dir, fade * .38, dir);
    } else if (motion === 'wave') {
      const count = (motif === 'roar' || motif === 'eclipse' ? 3 : 2) + detail;
      for (let i = count - 1; i >= 0; i--) {
        const scale = 1 - i * .1;
        put(0, x - dir * i * size * .18, y + size * .06, size * scale * growth,
          size * scale * growth * (1 - f.decay * .48), 0, fade * (1 - i * .13), dir);
      }
      if (f.contact) ground(fade * .6);
    } else if (motion === 'fall' || (motion === 'field' && motif === 'bolt')) {
      ground(f.contact ? fade * .75 : .18 + p * .28);
      const thunder = motif === 'bolt';
      const count = (thunder ? 1 : effect.idx >= 2 ? 3 : 1) + detail;
      for (let i = 0; i < count; i++) {
        const lateral = (i - (count - 1) / 2) * size * .24;
        const spread = size * (1.35 + tidalSeed(i) * .25);
        const dropY = Math.max(size * .5, b.cy - spread * (1 - p));
        const strikeHeight = Math.min(size * (1.45 + tidalSeed(i + 9) * .25), Math.max(60, b.cy - 42));
        if (thunder) put(0, b.cx + lateral, b.cy - strikeHeight * .38, size * (.48 + tidalSeed(i + 9) * .12),
          strikeHeight * (f.contact ? 1 : .3 + p * .45), (i - (count - 1) / 2) * .18,
          fade * (f.contact ? .98 : .22), i % 2 ? -1 : 1);
        else {
          const sword = motif === 'sword';
          const followThrough = f.contact ? clamp01((f.contactAge - i * 22) / 180) : 0;
          put(0, b.cx + lateral, dropY + f.decay * size * .1 - (sword && f.contact ? (1 - followThrough) * size * .25 : 0),
            size * (sword ? .46 : .85 - i * .07) * growth,
            size * (sword ? 1.15 : .92) * (1 - f.decay * .5),
            motif === 'meteor' ? 1 : sword ? Math.PI + (i - (count - 1) / 2) * .14 : motif === 'frost' ? Math.PI / 2 : 0, fade);
        }
      }
    } else if (motion === 'beam') {
      // Overlapping painted plumes build a breath, not a straight glowing laser.
      const length = Math.hypot(dx, dy), count = 5 + detail;
      for (let i = 0; i < count; i++) {
        const t = (i + .6) / count * (f.contact ? 1 : p);
        const plume = size * (.35 + t * .62) * (1 + Math.sin(clockMs / 90 + i) * .055);
        put(0, a.cx + dx * t, a.cy + dy * t, Math.max(plume, length / count * 1.9), plume,
          angle, fade * (.4 + t * .45));
      }
      if (f.contact) put(1, b.cx, b.cy, size * 1.3, size * 1.3, motif === 'rift' ? .05 : angle, fade);
    } else if (motion === 'lash') {
      const links = motif === 'chain' || motif === 'serpent';
      const count = links ? 10 + detail * 2 : 7;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const reach = f.contact ? 1 : p;
        const bx = a.cx + dx * t * reach;
        const bend = Math.sin(t * Math.PI * 2 + clockMs / 250) * size * .24 * Math.sin(t * Math.PI);
        const tile = links || motif === 'vine' ? 0 : motif === 'mirror' ? 1 : 2;
        put(tile, bx, a.cy + dy * t * reach + bend, size * (links ? .34 : .64), size * (links ? .36 : .34),
          angle + Math.cos(t * Math.PI * 2) * .55, fade * (f.contact ? .35 : .78));
      }
      if (f.contact) {
        const loops = motif === 'serpent' ? 5 + detail * 2 : 3;
        for (let i = 0; i < loops; i++) {
          const a = i / loops * Math.PI * 2 + f.decay * .6;
          put(motif === 'serpent' ? 0 : 1, b.cx + Math.cos(a) * size * .19, b.cy + Math.sin(a) * size * .2,
            size * .9, size * .9, a, fade * .82);
        }
      }
    } else if (motion === 'orbit') {
      const vortex = ['vortex', 'storm', 'wisp'].includes(motif);
      const count = vortex ? 3 + detail : 4 + detail;
      const radius = size * (f.contact ? .48 * (1 - f.decay * .75) : .12 + p * .36);
      for (let i = 0; i < count; i++) {
        const turn = i / count * Math.PI * 2 + clockMs / (vortex ? 270 : 500);
        if (vortex) put(i === 0 ? 0 : 2, b.cx, b.cy, radius * 2.8, radius * 2.2, turn, fade * (i ? .55 : .85));
        else put(0, b.cx + Math.cos(turn) * radius, b.cy + Math.sin(turn) * radius * .68,
          size * (motif === 'mirror' ? .58 : .48), size * .59, turn + Math.PI / 2, fade * (.4 + p * .6));
      }
      if (f.contact && !vortex) put(1, b.cx, b.cy, size * .9 * (1 + f.decay * .3), size * .9, -.1, fade * .48);
    } else {
      ground(f.contact ? fade * .8 : p * .3);
      const count = (motif === 'flame' ? 1 : 3) + detail;
      const halfField = Math.min(size * .72, layout.width * .46);
      const fieldX = Math.max(halfField, Math.min(layout.width - halfField, b.cx));
      for (let i = 0; i < count; i++) {
        const rise = f.contact ? clamp01((f.contactAge - i * 18) / 100) : p * .22;
        const plume = size * (.96 + tidalSeed(i + 20) * .28);
        const spread = motif === 'sword' || motif === 'matrix' ? .29 : .22;
        put(0, fieldX + (i - (count - 1) / 2) * size * spread, b.cy + size * .32 - plume * rise * .38,
          plume * .62, plume * rise * (1 - f.decay * .15), (i - (count - 1) / 2) * .12 + Math.sin(clockMs / 90 + i) * .035,
          fade * (f.contact ? .94 : .27));
      }
      if (f.contact && motif !== 'flame') put(1, b.cx, b.cy, size * 1.15, size * 1.15, .06, fade * .35);
    }

    // Chips, embers, leaves and ice keep their material shape; no universal glitter burst.
    const fragments = f.contact ? 6 + f.tier * 4 : Math.min(5, f.tier * 2);
    for (let i = 0; i < fragments; i++) {
      const seed = tidalSeed(i + 60);
      const age = f.contact ? clamp01(f.decay * (1 + seed * .3)) : (f.flight + seed) % 1;
      const turn = seed * Math.PI * 2;
      const reach = size * (.18 + age * .6);
      const px = (f.contact ? b.cx : x) + Math.cos(turn) * reach;
      const py = (f.contact ? b.cy : y) + Math.sin(turn) * reach * .65 + age * age * size * .18;
      const chip = size * (.055 + tidalSeed(i + 100) * .1) * (1 - age * .45);
      put(3, px, py, chip, chip * (motif === 'leaf' || motif === 'butterfly' ? 1 : 1.5), turn + age * 2,
        Math.sin(age * Math.PI) * fade * (f.contact ? .8 : .28));
    }
    app.render();
  };
  try {
    // Compile the shared sprite batch before the first cast, on a hidden 1px canvas.
    const seed = sprites[0]; seed.texture = Texture.WHITE; seed.visible = true;
    seed.width = seed.height = 1; app.render();
    seed.visible = false; root.visible = false; app.render();
  } catch (error) { destroy(); throw error; }
  return { prepare, draw, destroy };
}
