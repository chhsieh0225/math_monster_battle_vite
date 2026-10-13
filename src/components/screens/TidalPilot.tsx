import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { getSpriteAnimationAsset } from '../../data/spriteAnimationAssets.ts';
import { golumnSVG, playerwater2SVG } from '../../data/sprites.ts';
import { battleSpritePreloader } from '../../utils/battleSpritePreload.ts';
import { BattleSprite } from './battle/BattleSprite.tsx';
import { SkillStrikeEffect } from '../effects/SkillStrikeEffect.tsx';
import { getTidalFrame, getTidalLayout, TIDAL_TIMING } from '../effects/skillEffectModel.ts';
import type { TidalPhase } from '../effects/skillEffectModel.ts';
import type { TidalRenderer } from '../effects/tidalRenderer.ts';
import '../effects/SkillStrikeEffect.css';
import './TidalPilot.css';

const BACKGROUND = `${import.meta.env.BASE_URL}backgrounds/water_breach.jpg`;
const PLAYER = playerwater2SVG();
const ENEMY = golumnSVG();

export default function TidalPilot() {
  const { locale } = useI18n();
  const tr = (zh: string, en: string) => locale === 'zh-TW' ? zh : en;
  const [mode, setMode] = useState<'pixi' | 'original'>('pixi');
  const [level, setLevel] = useState(5);
  const [speed, setSpeed] = useState(1);
  const [reversed, setReversed] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<TidalPhase>('ready');
  const [gpu, setGpu] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [art, setArt] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [size, setSize] = useState({ width: 720, height: 380 });
  const [hidden, setHidden] = useState(() => document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TidalRenderer | null>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLOutputElement>(null);
  const playhead = useRef(0);
  const phaseRef = useRef<TidalPhase>('ready');
  const layout = getTidalLayout(size.width, size.height, reversed);
  const showPixi = mode === 'pixi' && gpu === 'ready';
  const busy = art === 'loading' || (mode === 'pixi' && gpu === 'loading');
  const active = phase !== 'ready' && phase !== 'done';
  const contact = phase === 'impact' || phase === 'settle';

  const failGpu = useCallback(() => {
    rendererRef.current?.destroy(); rendererRef.current = null;
    setGpu('failed');
  }, []);

  useEffect(() => {
    let alive = true;
    let instance: TidalRenderer | null = null;
    const host = canvasRef.current;
    if (!host) return;
    void import('../effects/tidalRenderer.ts').then(({ createTidalRenderer }) => createTidalRenderer(host, failGpu))
      .then((renderer) => {
        if (!alive) { renderer.destroy(); return; }
        instance = renderer; rendererRef.current = renderer; setGpu('ready');
      }).catch(() => { if (alive) failGpu(); });
    return () => { alive = false; instance?.destroy(); rendererRef.current = null; };
  }, [failGpu]);

  useEffect(() => {
    let alive = true;
    const urls = ['playerwater2SVG', 'golumnSVG'].map((key) => getSpriteAnimationAsset(key)!.src);
    const bg = new Image(); bg.src = BACKGROUND;
    const timer = window.setTimeout(() => { if (alive) setArt('failed'); }, 12000);
    void Promise.all([...urls.map((url) => battleSpritePreloader.load(url)), bg.decode().then(() => true)])
      .then((results) => { if (alive) setArt(results.every(Boolean) ? 'ready' : 'failed'); })
      .catch(() => { if (alive) setArt('failed'); })
      .finally(() => window.clearTimeout(timer));
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const measure = () => setSize({ width: scene.clientWidth, height: scene.clientHeight });
    const observer = new ResizeObserver(measure); observer.observe(scene); measure();
    const visibility = () => setHidden(document.hidden);
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(query.matches);
    document.addEventListener('visibilitychange', visibility); query.addEventListener('change', motion);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); query.removeEventListener('change', motion); };
  }, []);

  const draw = useCallback((elapsed: number) => {
    const time = Math.max(0, Math.min(TIDAL_TIMING.end, elapsed));
    playhead.current = time;
    const next = getTidalFrame(time, level).phase;
    if (phaseRef.current !== next) { phaseRef.current = next; setPhase(next); }
    if (showPixi) {
      try { rendererRef.current?.draw(time, level, getTidalLayout(size.width, size.height, reversed), reducedMotion); }
      catch { failGpu(); }
    }
    if (rangeRef.current) rangeRef.current.value = String(time);
    if (timeRef.current) timeRef.current.textContent = `${Math.round(time)} / ${TIDAL_TIMING.end} ms`;
    // One playhead drives both CSS key poses and GPU effects, including pause and scrubbing.
    sceneRef.current?.querySelectorAll<HTMLElement>('[data-clock-origin]').forEach((group) => {
      const local = Math.max(0, time - Number(group.dataset.clockOrigin));
      group.getAnimations({ subtree: true }).forEach((animation) => {
        if (animation.playState !== 'paused') animation.pause();
        animation.currentTime = local;
      });
    });
  }, [level, showPixi, size.width, size.height, reversed, reducedMotion, failGpu]);

  useLayoutEffect(() => { draw(playhead.current); }, [draw, phase]);

  useEffect(() => {
    if (!running || hidden || busy) return;
    let id = 0, previous = performance.now();
    const tick = (now: number) => {
      const time = playhead.current + (now - previous) * speed; previous = now;
      draw(time);
      if (time >= TIDAL_TIMING.end) setRunning(false);
      else id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, hidden, busy, speed, draw]);

  const reset = () => { setRunning(false); draw(0); };
  const replay = () => { draw(0); setRunning(true); };
  const phaseLabel: Record<TidalPhase, string> = {
    ready: tr('準備', 'Ready'), charge: tr('蓄力', 'Gather'), surge: tr('浪起', 'Surge'),
    impact: tr('命中', 'Impact'), settle: tr('退潮', 'Recede'), done: tr('完成', 'Complete'),
  };

  return <main className="tidal-pilot">
    <div className="tidal-shell">
      <header className="tidal-header">
        <a href={window.location.pathname}>{tr('返回遊戲', 'Back to game')}</a>
        <span>VFX STUDY / 01</span>
        <span className="tidal-status">{showPixi ? 'PIXI / WEBGL' : 'SVG / CSS'}</span>
      </header>
      <div className="tidal-heading"><p>{tr('招式試映室', 'SKILL SCREENING ROOM')}</p>
        <h1>{tr('海嘯衝擊', 'Tidal Impact')}<span>{tr('潮起，有形。', 'Give the tide a shape.')}</span></h1>
      </div>
      <div className="tidal-toolbar" aria-label={tr('特效版本', 'Effect renderer')}>
        <button aria-pressed={mode === 'pixi'} onClick={() => { reset(); setMode('pixi'); }}>{tr('新版 · 流動浪潮', 'New · Flowing tide')}</button>
        <button aria-pressed={mode === 'original'} onClick={() => { reset(); setMode('original'); }}>{tr('原版 · SVG', 'Original · SVG')}</button>
      </div>
      <section className="tidal-stage" aria-label={tr('海岸試映戰場', 'Coastal preview arena')}>
        <div className={`tidal-hud${reversed ? ' is-reversed' : ''}`}><div><span>{tr('施術者', 'CASTER')}</span><strong>{tr('水系最終型態', 'Water evolution')}</strong></div>
          <div><span>{tr('練習對象', 'TARGET')}</span><strong>{tr('岩石巨像', 'Stone golem')}</strong></div></div>
        <div ref={sceneRef} className="tidal-scene" data-phase={phase} data-renderer={showPixi ? 'pixi' : 'svg'}>
          <img className="tidal-backdrop" src={BACKGROUND} alt="" />
          <div className="tidal-atmosphere" />
          <div className="tidal-actor" data-clock-origin="0" style={{ left: layout.source.cx, top: layout.source.cy,
            width: layout.source.size, transform: `translate(-50%,-50%) scaleX(${reversed ? 1 : -1})` }}>
            <div className="tidal-shadow" />
            <BattleSprite profileKey="playerwater2SVG" svgStr={PLAYER} size={layout.source.size}
              animation={active && !reducedMotion ? `attackLunge ${TIDAL_TIMING.end}ms` : 'none'} />
          </div>
          <div className="tidal-actor" data-clock-origin={TIDAL_TIMING.hit} style={{ left: layout.target.cx, top: layout.target.cy,
            width: layout.target.size, transform: `translate(-50%,-50%) scaleX(${reversed ? -1 : 1})` }}>
            <div className="tidal-shadow" />
            <BattleSprite profileKey="golumnSVG" svgStr={ENEMY} size={layout.target.size}
              animation={contact && !reducedMotion ? 'enemyWaterHit 520ms' : 'none'} />
          </div>
          <div ref={canvasRef} className="tidal-canvas" style={{ visibility: showPixi ? 'visible' : 'hidden' }} />
          {!showPixi && active && phase !== 'charge' && <div className="tidal-svg" data-clock-origin={contact ? TIDAL_TIMING.hit : TIDAL_TIMING.release}>
            <SkillStrikeEffect key={contact ? 'impact' : 'launch'}
              effect={{ type: 'water', skillId: 'water:2', idx: 2, lvl: level, flightMs: TIDAL_TIMING.flight,
                ...(contact ? { impact: { outcome: 'hit', at: TIDAL_TIMING.hit } } : {}) }}
              source={layout.source} target={layout.target} arena={layout} lowPerf={reducedMotion} />
          </div>}
          {contact && <span className="tidal-contact-label" style={{ left: layout.target.cx, top: layout.target.cy - layout.target.size * .58 }}>{tr('命中', 'HIT')}</span>}
          <div className="tidal-phase">{phaseLabel[phase]}</div>
          <span className="tidal-scene-note">{tr('視覺試作，不影響存檔與戰鬥數值', 'Visual study. No saves or combat stats changed.')}</span>
        </div>
      </section>
      <section className="tidal-controls" aria-label={tr('播放控制', 'Playback controls')}>
        <div className="tidal-play-row">
          <button className="tidal-play" disabled={busy} onClick={replay}>{tr('施放招式', 'Cast skill')}</button>
          <button disabled={busy || phase === 'ready' || phase === 'done'} onClick={() => setRunning((value) => !value)}>{running ? tr('暫停', 'Pause') : tr('繼續', 'Resume')}</button>
          <button aria-pressed={speed === .5} onClick={() => setSpeed(speed === 1 ? .5 : 1)}>{tr('慢速', 'Slow')} {speed === .5 ? '0.5×' : '1×'}</button>
          <button aria-pressed={reversed} onClick={() => { reset(); setReversed(!reversed); }}>{tr('反向', 'Reverse')}</button>
        </div>
        <label className="tidal-timeline">{tr('逐格查看', 'Scrub timeline')}
          <input ref={rangeRef} type="range" min="0" max={TIDAL_TIMING.end} step="1" defaultValue="0"
            disabled={busy} onChange={(event) => { setRunning(false); draw(Number(event.target.value)); }} />
          <output ref={timeRef}>0 / {TIDAL_TIMING.end} ms</output>
        </label>
        <div className="tidal-mastery"><span>{tr('招式熟練度', 'MASTERY')}</span>
          {[1, 3, 5].map((lvl) => <button key={lvl} aria-pressed={level === lvl} onClick={() => { reset(); setLevel(lvl); }}>
            Lv.{lvl} <small>{lvl === 1 ? tr('破浪', 'Crest') : lvl === 3 ? tr('疊潮', 'Surge') : tr('海嘯', 'Tsunami')}</small>
          </button>)}
        </div>
        <p className="tidal-detail">{tr('同一命中時刻，不以放大角色或滿屏閃光製造威力。升級增加浪層、水紋與飛沫。', 'Same hit timing. Mastery adds wave layers, flowing water and spray, not oversized actors or screen flashes.')}</p>
        <p className="tidal-load-status" role="status">{gpu === 'failed' && mode === 'pixi'
          ? tr('WebGL 無法使用，已切回原版特效。可重新整理後再試。', 'WebGL unavailable. Showing the original effect; reload to retry.')
          : busy ? tr('正在準備這一招的素材…', 'Preparing this skill…') : art === 'failed'
            ? tr('部分場景素材未讀取成功，可重新整理重試。', 'Some art could not load. Reload to retry.')
            : reducedMotion ? tr('已尊重系統減少動態效果設定。', 'System reduced-motion preference is active.')
              : tr('可切換原版比較，或拖動時間軸觀察浪頭。', 'Compare renderers or scrub to inspect the crest.')}</p>
      </section>
    </div>
  </main>;
}
