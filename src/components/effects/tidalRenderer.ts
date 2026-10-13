import { Application, Container, Graphics, Mesh, MeshGeometry, Shader, Sprite, Texture, UniformGroup } from 'pixi.js';
import { clamp01, getTidalFrame, getTidalLayout, tidalSeed, TIDAL_TIMING } from './skillEffectModel.ts';
import type { TidalLayout } from './skillEffectModel.ts';

const vertex = `
precision highp float;
attribute vec2 aPosition;
attribute vec2 aUV;
uniform vec4 uBounds;
uniform vec2 uViewport;
uniform float uDirection;
varying vec2 vUV;
void main() {
  vec2 p = aPosition;
  p.x = uDirection < 0.0 ? 1.0 - p.x : p.x;
  p = uBounds.xy + p * uBounds.zw;
  gl_Position = vec4(p.x / uViewport.x * 2.0 - 1.0, 1.0 - p.y / uViewport.y * 2.0, 0.0, 1.0);
  vUV = aUV;
}`;
const fragment = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uOpacity;
void main() {
  vec4 edge = texture2D(uTexture, vUV);
  float water = smoothstep(0.04, 0.24, edge.b - edge.r);
  vec2 flow = vec2(sin(vUV.y * 31.0 - uTime * 8.0), cos(vUV.x * 24.0 + uTime * 5.0));
  vec4 paint = texture2D(uTexture, vUV + flow * 0.009 * water);
  float ripple = sin(vUV.y * 67.0 + sin(vUV.x * 23.0 - uTime * 4.0) * 2.0 - uTime * 11.0);
  vec3 color = mix(edge.rgb, paint.rgb, water * 0.65);
  color += vec3(0.014, 0.045, 0.05) * ripple * water * edge.a;
  gl_FragColor = vec4(color, edge.a) * uOpacity;
}`;

function paintedTexture(kind: 'wave' | 'drop') {
  const canvas = document.createElement('canvas');
  canvas.width = kind === 'wave' ? 1024 : 64;
  canvas.height = kind === 'wave' ? 768 : 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas texture unavailable');
  if (kind === 'drop') {
    const ink = ctx.createLinearGradient(15, 8, 38, 55);
    ink.addColorStop(0, '#fffdeb'); ink.addColorStop(.4, '#c7fff7'); ink.addColorStop(1, '#238cad');
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.moveTo(32, 4); ctx.bezierCurveTo(26, 22, 18, 35, 23, 45);
    ctx.bezierCurveTo(29, 57, 46, 46, 40, 32); ctx.closePath(); ctx.fill();
    return Texture.from(canvas);
  }
  ctx.scale(2, 2);
  const body = new Path2D('M18 341 C111 325 153 246 193 164 C229 88 292 29 363 44 C421 55 456 91 443 133 C431 173 397 183 369 157 C352 140 363 116 382 115 C398 114 405 128 393 137 C416 138 421 111 400 99 C365 76 325 111 320 150 C310 218 402 264 486 314 L492 352 C332 376 144 364 18 352Z');
  const water = ctx.createLinearGradient(245, 50, 210, 365);
  water.addColorStop(0, '#e1f8eb'); water.addColorStop(.2, '#7bd9d2');
  water.addColorStop(.46, '#168fba'); water.addColorStop(.74, '#13659b'); water.addColorStop(1, '#173759');
  ctx.fillStyle = water; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  ctx.lineCap = 'round';
  ctx.fillStyle = '#104a78';
  ctx.fill(new Path2D('M73 345 C212 300 191 147 311 80 C250 145 244 224 312 276 C353 308 407 323 477 340Z'));
  ctx.fillStyle = '#2186a1';
  ctx.fill(new Path2D('M170 343 C251 281 242 205 274 141 C258 238 333 300 433 342Z'));
  ctx.fillStyle = '#64c9ca';
  ctx.fill(new Path2D('M226 263 C247 202 269 119 329 82 C289 135 273 191 298 240 C278 218 259 244 226 263Z'));
  for (let i = 0; i < 24; i++) {
    const offset = i * 6.8;
    ctx.strokeStyle = i % 3 ? 'rgba(166,237,221,.29)' : 'rgba(9,56,99,.45)';
    ctx.lineWidth = i % 3 ? 1.2 : 2.6;
    ctx.beginPath(); ctx.moveTo(88 + offset, 349);
    ctx.bezierCurveTo(223 + offset * .4, 306 - offset * .17, 178 + offset * .35, 142, 318 + offset * .4, 71 + offset * .12);
    ctx.stroke();
  }
  for (let i = 0; i < 220; i++) {
    const x = tidalSeed(i) * 512, y = tidalSeed(i + 300) * 384;
    ctx.strokeStyle = `rgba(204,246,217,${.025 + tidalSeed(i + 500) * .08})`;
    ctx.lineWidth = 1 + tidalSeed(i + 800) * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12 + tidalSeed(i + 100) * 22, y - 4); ctx.stroke();
  }
  ctx.restore();
  const crest = new Path2D('M29 339 C137 310 159 233 203 152 C250 68 308 28 367 51 C419 62 449 96 436 132 C426 161 401 171 376 150');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 15; ctx.strokeStyle = '#73c5c2'; ctx.stroke(crest);
  ctx.lineWidth = 8; ctx.strokeStyle = '#e8f5da'; ctx.stroke(crest);
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#fcfff1'; ctx.stroke(crest);
  for (let i = 0; i < 37; i++) {
    const a = Math.PI * (.98 + i / 36 * 1.14);
    const x = 353 + Math.cos(a) * (89 + tidalSeed(i + 40) * 6);
    const y = 108 + Math.sin(a) * 57;
    ctx.fillStyle = i % 3 ? '#e1f7e7' : '#ffffff';
    ctx.beginPath(); ctx.ellipse(x, y, 2 + tidalSeed(i + 20) * 5, 2 + tidalSeed(i + 70) * 4, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#a6e9df'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(53 + i * 29, 349 - i * 8);
    ctx.bezierCurveTo(223, 319 - i * 8, 311, 368 - i * 9, 474 - i * 13, 336 - i * 6); ctx.stroke();
  }
  const dissolve = ctx.createLinearGradient(0, 326, 0, 372);
  dissolve.addColorStop(0, '#000'); dissolve.addColorStop(1, 'transparent');
  ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = dissolve; ctx.fillRect(0, 0, 512, 384);
  return Texture.from(canvas);
}

export type TidalRenderer = {
  draw: (elapsed: number, level: number, layout: TidalLayout, reducedMotion: boolean) => void;
  destroy: () => void;
};

/** One canvas, local textured meshes and reused droplets; no filters or idle ticker. */
export async function createTidalRenderer(host: HTMLElement, onLost: () => void): Promise<TidalRenderer> {
  const app = new Application();
  try {
    await app.init({ preference: 'webgl', width: 1, height: 1, backgroundAlpha: 0, antialias: true,
      resolution: window.devicePixelRatio || 1, autoDensity: true, autoStart: false, sharedTicker: false });
  } catch (error) {
    app.stage.destroy({ children: true });
    app.renderer?.destroy({ removeView: true });
    throw error;
  }
  app.stop();
  app.stage.sortableChildren = true;
  const canvas = app.canvas;
  canvas.setAttribute('aria-hidden', 'true');
  const lost = () => onLost();
  canvas.addEventListener('webglcontextlost', lost);
  host.appendChild(canvas);
  let painter: ReturnType<typeof createTidalPainter> | null = null;
  try {
    painter = createTidalPainter(app);
    const layout = getTidalLayout(host.clientWidth, host.clientHeight);
    painter.draw(TIDAL_TIMING.hit, 5, layout, false);
    painter.draw(0, 5, layout, false);
    let destroyed = false;
    return { draw: painter.draw, destroy: () => {
      if (destroyed) return;
      destroyed = true;
      canvas.removeEventListener('webglcontextlost', lost);
      painter?.destroy();
      app.destroy({ removeView: true }, { children: true });
    } };
  } catch (error) {
    canvas.removeEventListener('webglcontextlost', lost);
    painter?.destroy();
    app.destroy({ removeView: true }, { children: true });
    throw error;
  }
}

/** Water shares the production application's context with all other painted skills. */
export function createTidalPainter(app: Application) {
  const root = new Container(); root.sortableChildren = true; app.stage.addChild(root);
  const textures: Texture[] = [];
  const shaders: Shader[] = [];
  const geometry = new MeshGeometry({ positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), indices: new Uint32Array([0, 1, 2, 0, 2, 3]) });
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    root.destroy({ children: true });
    shaders.forEach((shader) => shader.destroy());
    geometry.destroy();
    textures.forEach((texture) => texture.destroy(true));
  };
  try {
    const waveTexture = paintedTexture('wave'); textures.push(waveTexture);
    const dropTexture = paintedTexture('drop'); textures.push(dropTexture);
    const rings = Array.from({ length: 3 }, (_, i) => {
      const ring = new Graphics().ellipse(0, 0, 55, 13).stroke({ color: i ? 0xbee9d9 : 0x49a6b9, width: i ? 1.4 : 3 });
      root.addChild(ring); return ring;
    });
    const waves = Array.from({ length: 3 }, (_, i) => {
      const uniform = new UniformGroup({
        uBounds: { value: new Float32Array(4), type: 'vec4<f32>' },
        uViewport: { value: new Float32Array(2), type: 'vec2<f32>' },
        uDirection: { value: 1, type: 'f32' }, uTime: { value: 0, type: 'f32' }, uOpacity: { value: 0, type: 'f32' },
      });
      const shader = Shader.from({ gl: { vertex, fragment }, resources: { waveUniforms: uniform, uTexture: waveTexture.source } });
      shaders.push(shader);
      const mesh = new Mesh({ geometry, shader }); mesh.zIndex = 3 - i; root.addChild(mesh);
      return { mesh, uniform };
    });
    const spray = Array.from({ length: 42 }, () => {
      const sprite = new Sprite(dropTexture); sprite.anchor.set(.5); sprite.zIndex = 4; root.addChild(sprite); return sprite;
    });
    const charge = new Graphics().ellipse(0, 0, 35, 13).stroke({ width: 2, color: 0xb9efde });
    root.addChild(charge);
    let lastW = 0, lastH = 0;
    const draw: TidalRenderer['draw'] = (elapsed, level, layout, reducedMotion) => {
      if (destroyed) return;
      if (lastW !== layout.width || lastH !== layout.height) {
        app.renderer.resize(layout.width, layout.height);
        lastW = layout.width; lastH = layout.height;
      }
      const f = getTidalFrame(elapsed, level);
      const { source, target, direction, waveSize } = layout;
      const travel = f.flight * f.flight * (3 - 2 * f.flight);
      const x = source.cx + (target.cx - source.cx) * travel;
      const floor = source.cy + (target.cy - source.cy) * travel + waveSize * .39;
      const visible = f.phase !== 'ready' && f.phase !== 'done';
      const fade = 1 - clamp01(f.decay * 1.55);
      charge.visible = visible && f.time < TIDAL_TIMING.hit && !reducedMotion;
      charge.position.set(source.cx, source.cy + waveSize * .39);
      charge.scale.set(.7 + Math.sin(clamp01(f.time / TIDAL_TIMING.hit) * Math.PI) * .65);
      charge.alpha = .65 * (1 - f.flight);
      rings.forEach((ring, i) => {
        ring.visible = visible && f.contact;
        ring.position.set(target.cx, target.cy + waveSize * .39);
        const size = .4 + f.decay * (1.8 + i * .55);
        ring.scale.set(size * waveSize / 120, size * waveSize / 160);
        ring.alpha = (1 - f.decay) * (i ? .55 : .8);
      });
      waves.forEach(({ mesh, uniform }, i) => {
        mesh.visible = visible && f.phase !== 'charge' && i < f.waveCount && !reducedMotion;
        if (!mesh.visible) return;
        const weight = 1 - i * .17;
        const size = waveSize * weight * (.32 + .68 * Math.sin(clamp01(f.flight * 1.6) * Math.PI / 2));
        const w = size * 1.34 * (1 + f.decay * .36);
        const h = size * (1 - f.decay * .8);
        const cx = x - direction * (i * waveSize * .23 + size * .22);
        // The curling crest, rather than the texture center, meets the contact anchor.
        const left = direction > 0 ? cx - w * .64 : cx - w * .36;
        const u = uniform.uniforms;
        u.uBounds.set([left, floor - h * .91 - i * waveSize * .02, w, h]);
        u.uViewport.set([layout.width, layout.height]);
        u.uDirection = direction; u.uTime = f.time / 1000 + i * .7;
        u.uOpacity = fade * (1 - i * .2) * clamp01(f.flight * 7);
      });
      spray.forEach((sprite, i) => {
        sprite.visible = visible && !reducedMotion && i < f.sprayCount && (f.flight > .2 || f.contact);
        if (!sprite.visible) return;
        const seed = tidalSeed(i);
        const age = f.contact ? clamp01((f.time - TIDAL_TIMING.hit) / (430 + seed * 220)) : (f.flight * 1.2 + seed) % 1;
        const origin = f.contact ? target.cx : x - direction * waveSize * .12;
        const spread = f.contact ? (seed - .42) * waveSize * 1.6 : -seed * waveSize * .6;
        sprite.position.set(origin + direction * spread * age,
          (f.contact ? target.cy : floor - waveSize * (.5 + seed * .35))
          - Math.sin(age * Math.PI) * waveSize * (.25 + tidalSeed(i + 50) * .5) + age * age * waveSize * .48);
        const scale = waveSize / 200 * (.11 + tidalSeed(i + 20) * .15) * (1 - age * .5);
        sprite.scale.set(scale * .7, scale * (1.6 - age * .7));
        sprite.rotation = direction * ((seed - .5) * 2 + age * 1.5);
        sprite.alpha = Math.sin(age * Math.PI) * (f.contact ? 1 - f.decay * .7 : .65);
      });
      app.render();
    };
    return { draw, destroy, setVisible: (visible: boolean) => { root.visible = visible; } };
  } catch (error) { destroy(); throw error; }
}
