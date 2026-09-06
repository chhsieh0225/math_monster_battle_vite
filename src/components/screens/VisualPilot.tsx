import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import { genQ } from '../../utils/questionGenerator';
import { calcAttackDamage } from '../../utils/damageCalc';
import { createPilotState, getPilotMotion, getPilotPosePosition, PILOT_ART, PILOT_MAX_HP, PILOT_PHASE_MS, PILOT_POSES, pilotReducer } from './visualPilotModel';
import type { PilotMotion } from './visualPilotModel';
import './VisualPilot.css';

const BASE = import.meta.env.BASE_URL;
const ASSETS = {
  player: `${BASE}sprites/visual-pilot/${PILOT_ART.player.file}`,
  enemy: `${BASE}sprites/visual-pilot/${PILOT_ART.enemy.file}`,
};
const ORIGINALS = { player: `${BASE}sprites/player_wolf2.png`, enemy: `${BASE}sprites/boss_crazy_dragon.png` };
type PilotStyle = CSSProperties & Record<`--${string}`, string | number>;

function PilotActor({ actor, motion, original, label, inspectPose }: {
  actor: 'player' | 'enemy'; motion: PilotMotion; original: boolean; label: string; inspectPose: number | null;
}) {
  const style: PilotStyle = { '--pilot-foot-x': `${(1 - PILOT_ART[actor].footX / 512) * 100}%`,
    '--pilot-inspect-position': getPilotPosePosition(inspectPose ?? 0) };
  return <div className={`pilot-fighter is-${actor}`} data-motion={motion} style={style}>
    <div className="pilot-ground-shadow" />
    <div className="pilot-body">
      <div className="pilot-breathing">
        <div className="pilot-facing">
          {original ? <img className="pilot-original" src={ORIGINALS[actor]} alt={label} draggable={false} />
            : <div className="pilot-atlas" role="img" aria-label={label}
              style={{ backgroundImage: `url("${ASSETS[actor]}")` }} />}
        </div>
      </div>
    </div>
    {inspectPose !== null && <div className="pilot-foot-guide" aria-hidden="true" />}
  </div>;
}

export default function VisualPilot() {
  const { locale, t } = useI18n();
  const tr = (zh: string, en: string) => locale === 'zh-TW' ? zh : en;
  const [state, dispatch] = useReducer(pilotReducer, undefined, () => createPilotState());
  const [original, setOriginal] = useState(false);
  const [paused, setPaused] = useState(false);
  const [slow, setSlow] = useState(false);
  const [inspectPose, setInspectPose] = useState<number | null>(null);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [assets, setAssets] = useState<'loading' | 'ready' | 'failed'>('loading');
  const timing = useRef({ key: '', remaining: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [fxGeometry, setFxGeometry] = useState({ width: 1000, height: 600,
    mouth: { x: 690, y: 280 }, player: { x: 300, y: 420 }, enemy: { x: 750, y: 280 }, radius: 32 });
  const suspended = paused || hidden || inspectPose !== null;
  const duration = (PILOT_PHASE_MS[state.phase] ?? 0) * (slow ? 1.8 : 1);
  const busy = duration > 0 || state.phase === 'question';
  const terminal = state.phase === 'victory' || state.phase === 'defeat';

  useEffect(() => {
    let active = true;
    const images = Object.values(ASSETS).map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode();
    });
    void Promise.all(images).then(() => { if (active) setAssets('ready'); })
      .catch(() => { if (active) setAssets('failed'); });
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const measure = () => {
      const player = world.querySelector<HTMLElement>('.pilot-fighter.is-player');
      const enemy = world.querySelector<HTMLElement>('.pilot-fighter.is-enemy');
      if (!player || !enemy) return;
      const root = world.getBoundingClientRect();
      const p = player.getBoundingClientRect();
      const e = enemy.getBoundingClientRect();
      const shift = parseFloat(getComputedStyle(enemy).getPropertyValue('--pilot-shift')) || 0;
      const point = (rect: DOMRect, anchor: { x: number; y: number }) => ({
        x: rect.left - root.left + rect.width * (1 - anchor.x / 512),
        y: rect.top - root.top + rect.height * anchor.y / 384,
      });
      const mouth = point(e, PILOT_ART.enemy.mouth);
      setFxGeometry({ width: root.width, height: root.height,
        mouth: { x: mouth.x + shift, y: mouth.y },
        player: point(p, PILOT_ART.player.hit),
        enemy: point(e, PILOT_ART.enemy.hit),
        radius: Math.min(50, e.width * .15) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(world);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // One deadline per action beat, never a per-frame React update. Preserve the
  // remaining time while paused; reducer tokens reject callbacks from old runs.
  useEffect(() => {
    const key = `${state.cycle}:${state.phase}`;
    if (timing.current.key !== key) timing.current = { key, remaining: duration };
    if (!duration || suspended) return;
    const start = performance.now();
    const timer = window.setTimeout(() => dispatch({ type: 'advance', phase: state.phase, cycle: state.cycle }), timing.current.remaining);
    return () => {
      window.clearTimeout(timer);
      timing.current.remaining = Math.max(0, timing.current.remaining - (performance.now() - start));
    };
  }, [state.phase, state.cycle, duration, suspended]);

  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = 0; }, [state.phase]);

  const playerName = tr('蒼鋼狼王', 'Steel Wolf');
  const enemyName = tr('單翼狂龍', 'One-Winged Dragon');
  const phaseLabel = {
    ready: tr('觀察呼吸、蓄力與收勢；也可以答題出招。', 'Watch the breathing, anticipation and follow-through, or answer a question to attack.'),
    question: tr('答對施放鋼爪突擊；答錯則由狂龍進攻。', 'Answer correctly to strike. A wrong answer lets the dragon attack.'),
    playerWindup: tr('狼王壓低身體，準備突擊。', 'The wolf crouches before the strike.'),
    playerImpact: tr('鋼爪命中！', 'Steel claw connects!'),
    playerRecover: tr('收爪、落地，披風隨動作收回。', 'The claw follows through; the cape settles.'),
    enemyWindup: tr('狂龍展翼、吸氣，準備吐息。', 'The dragon opens its wing and draws breath.'),
    enemyImpact: tr('熾焰吐息！', 'Ember breath!'),
    enemyRecover: tr('狂龍收勢，狼王恢復站姿。', 'The dragon settles; the wolf regains its stance.'),
    victory: tr('試玩勝利。可重來，或繼續比較動作。', 'Trial complete. Restart or compare the animation.'),
    defeat: tr('試玩結束。重新挑戰吧。', 'Trial over. Restart to try again.'),
  }[state.phase];
  const style: PilotStyle = {
    '--pilot-beat': `${duration || 1000}ms`,
    '--pilot-play-state': suspended ? 'paused' : 'running',
    '--pilot-scene': `url("${BASE}backgrounds/burnt_warplace.jpg")`,
  };
  const { mouth, player: target, enemy: slash, radius } = fxGeometry;
  const distance = Math.max(1, Math.hypot(target.x - mouth.x, target.y - mouth.y));
  const breathAngle = Math.atan2(target.y - mouth.y, target.x - mouth.x) * 180 / Math.PI;
  const inspecting = inspectPose !== null;

  return <main className="visual-pilot" style={style} data-phase={state.phase} data-paused={suspended}
    data-original={original || assets !== 'ready'} data-inspecting={inspecting}>
    <header className="pilot-header">
      <div><p className="pilot-eyebrow">ART & MOTION STUDY / 02</p><h1>{tr('鋼與焰', 'Steel & Ember')}</h1></div>
      <a className="pilot-back" href={BASE}>{tr('返回遊戲', 'Back to game')}</a>
      <p className="pilot-disclaimer">{tr('獨立演出試玩 · 簡化回合，不寫入存檔或學習紀錄', 'Isolated art trial · Simplified turns, no saves or learning records')}</p>
    </header>

    <section className="pilot-arena" aria-label={tr('演出戰場', 'Animation arena')}>
      <div className="pilot-hud">
        {(['player', 'enemy'] as const).map((actor) => {
          const hp = actor === 'player' ? state.playerHp : state.enemyHp;
          const name = actor === 'player' ? playerName : enemyName;
          return <div key={actor} className={`pilot-hp is-${actor}`}>
            <div><strong>{name}</strong><span>{hp} / {PILOT_MAX_HP[actor]}</span></div>
            <div role="progressbar" aria-label={`${name} HP`} aria-valuemin={0} aria-valuemax={PILOT_MAX_HP[actor]} aria-valuenow={hp}>
              <i style={{ width: `${hp / PILOT_MAX_HP[actor] * 100}%` }} />
            </div>
          </div>;
        })}
      </div>
      <div className="pilot-world" ref={worldRef}>
        <div className="pilot-scenery" /><div className="pilot-horizon" /><div className="pilot-ground" />
        <div className="pilot-stage-label">{tr('燼落戰場', 'ASHFALL GROUNDS')}</div>
        <PilotActor actor="enemy" motion={getPilotMotion(state.phase, 'enemy')} original={original || assets !== 'ready'} label={enemyName} inspectPose={inspectPose} />
        <PilotActor actor="player" motion={getPilotMotion(state.phase, 'player')} original={original || assets !== 'ready'} label={playerName} inspectPose={inspectPose} />
        {!original && !inspecting && assets === 'ready' && <svg className="pilot-fx" viewBox={`0 0 ${fxGeometry.width} ${fxGeometry.height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pilot-breath" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fff4c2" /><stop offset=".24" stopColor="#ffd27b" /><stop offset=".65" stopColor="#fc7831" /><stop offset="1" stopColor="#d93414" stopOpacity="0" /></linearGradient>
            <radialGradient id="pilot-muzzle"><stop stopColor="#fff8d6" /><stop offset=".35" stopColor="#ffca6a" stopOpacity=".8" /><stop offset="1" stopColor="#ff6524" stopOpacity="0" /></radialGradient>
          </defs>
          {state.phase === 'playerImpact' && <g className="pilot-claw-fx">
            {[0, .45, .9].map((offset) => <path key={offset} pathLength={1} d={`M${slash.x + radius * (offset + .3)} ${slash.y - radius} Q${slash.x + radius * offset} ${slash.y} ${slash.x + radius * (offset - 1)} ${slash.y + radius}`} />)}
            <ellipse cx={slash.x} cy={slash.y} rx={radius} ry={radius * .7}
              style={{ transformOrigin: `${slash.x}px ${slash.y}px` }} />
            {[0, 1, 2, 3].map((i) => <path className="pilot-impact-spark" key={`spark-${i}`} pathLength={1}
              d={`M${slash.x + radius * Math.cos(i * 1.7)} ${slash.y + radius * Math.sin(i * 1.7)} l${radius * .32 * Math.cos(i * 1.7)} ${radius * .32 * Math.sin(i * 1.7)}`} />)}
          </g>}
          {state.phase === 'enemyImpact' && <g className="pilot-breath-fx" style={{ transformOrigin: `${mouth.x}px ${mouth.y}px` }}>
            <circle cx={mouth.x} cy={mouth.y} r={radius * .55} fill="url(#pilot-muzzle)" />
            <g className="pilot-flame-space" transform={`translate(${mouth.x} ${mouth.y}) rotate(${breathAngle}) scale(${distance / 100} ${radius / 20})`}>
              <path className="pilot-flame-outer" d="M0 0 C12 -2 15 -7 26 -5 C23 -2 26 -2 31 -4 C43 -12 58 -7 63 -12 C59 -5 67 -5 75 -11 C83 -16 89 -13 100 -18 C92 -10 95 -5 87 -2 C97 -3 98 6 100 9 C91 4 88 13 79 9 C84 16 78 18 68 12 C55 18 52 10 43 9 C33 11 34 5 26 7 C16 5 9 5 0 0Z" fill="url(#pilot-breath)" />
              <path className="pilot-flame-core" d="M0 0 C12 -2 19 -3 29 -1 C38 3 45 -6 58 -3 C55 -1 64 1 71 -2 C67 1 71 2 80 3 C68 3 70 8 60 5 C48 1 40 7 30 4 C18 4 14 2 0 0Z" fill="#fff2b6" />
              <path className="pilot-flame-ribbon" d="M0 0 Q25 8 48 1 T91 3" fill="none" stroke="#ffad4a" strokeWidth="1.2" />
            </g>
          </g>}
        </svg>}
        {(state.phase === 'playerImpact' || state.phase === 'enemyImpact') && !state.preview && !inspecting &&
          <div className="pilot-damage" style={{ left: (state.phase === 'playerImpact' ? slash : target).x,
            top: (state.phase === 'playerImpact' ? slash : target).y - radius * 1.6 }} aria-hidden="true">
            −{state.phase === 'playerImpact' ? state.damage : 18}
          </div>}
        <div className="pilot-foreground" />
      </div>
    </section>

    <div className="pilot-panel" ref={panelRef}>
      <div className="pilot-toolbar">
        <div className="pilot-compare" role="group" aria-label={tr('比較呈現方式', 'Compare presentation')}>
          <button aria-pressed={!original} onClick={() => setOriginal(false)}>{tr('新作畫動畫', 'New animation')}</button>
          <button aria-pressed={original} onClick={() => { setOriginal(true); setInspectPose(null); }}>{tr('原素材動態', 'Original sprite')}</button>
        </div>
        <button className="pilot-small-btn" aria-pressed={slow} disabled={busy} onClick={() => setSlow(!slow)}>{tr('慢動作', 'Slow motion')}</button>
        <button className="pilot-small-btn" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? tr('繼續', 'Resume') : tr('暫停', 'Pause')}</button>
        <button className="pilot-small-btn" aria-pressed={inspecting} disabled={original || assets !== 'ready'} onClick={() => setInspectPose(inspecting ? null : 0)}>{tr('逐格檢查', 'Inspect poses')}</button>
        {paused && duration > 0 && !inspecting && <button className="pilot-small-btn" onClick={() => dispatch({ type: 'advance', phase: state.phase, cycle: state.cycle })}>{tr('下一拍', 'Next beat')}</button>}
      </div>
      <p className="pilot-status" role="status">{assets === 'loading' ? tr('正在準備動畫素材…', 'Preparing animation textures…')
        : assets === 'failed' ? tr('動畫素材載入失敗，目前顯示原素材。重新整理可重試。', 'Animation textures unavailable. Showing original sprites; reload to retry.')
          : inspecting ? tr('逐格檢查中：戰鬥計時暫停，基準線標示腳底與支撐腳位置。', 'Pose inspection: combat clock paused; guides mark the floor and support foot.')
            : suspended ? tr('演出已暫停', 'Animation paused') : phaseLabel}</p>
      {inspecting && <div className="pilot-pose-picker" role="group" aria-label={tr('八格姿勢', 'Eight key poses')}>
        {PILOT_POSES.map(([zh, en], index) => <button key={en} aria-pressed={inspectPose === index} onClick={() => setInspectPose(index)}>
          <small>{String(index + 1).padStart(2, '0')}</small>{tr(zh, en)}
        </button>)}
      </div>}
      {state.phase === 'question' && state.question ? <div className="pilot-question">
        <div className="pilot-expression" aria-label={tr('題目', 'Question')}>{state.question.display} = ?</div>
        <div className="pilot-answers">{state.question.choices.map((choice) => <button key={choice} disabled={suspended}
          onClick={() => dispatch({ type: 'answer', answer: choice, damage: calcAttackDamage({ basePow: 42, streak: 0, stageBonus: 0, effMult: 1 }) })}>{choice}</button>)}</div>
      </div> : <div className="pilot-actions">
        <button className="pilot-primary" disabled={busy || suspended || assets === 'loading'} onClick={() => terminal
          ? dispatch({ type: 'reset' })
          : dispatch({ type: 'question', question: genQ({ range: [2, 9], ops: ['+','×'] }, 1, { t }) })}>
          <span>{terminal ? tr('重新試玩', 'Restart trial') : tr('答題出招', 'Answer & attack')}</span>
          <small>{tr('鋼爪突擊', 'STEEL CLAW')}</small>
        </button>
        <button disabled={busy || suspended || assets === 'loading'} onClick={() => dispatch({ type: 'preview', actor: 'player' })}>{tr('看狼王出招', 'Preview wolf')}</button>
        <button disabled={busy || suspended || assets === 'loading'} onClick={() => dispatch({ type: 'preview', actor: 'enemy' })}>{tr('看狂龍吐息', 'Preview dragon')}</button>
      </div>}
      {state.correct === false && state.question && <p className="pilot-answer-note">{tr('正確答案：', 'Correct answer: ')}{state.question.answer}</p>}
      <footer className="pilot-footnote"><span>{tr('8 格關鍵姿勢＋連續動態 · 保留腳底基準', '8 key poses + continuous motion · Stable foot anchors')}</span>
        <button onClick={() => { dispatch({ type: 'reset' }); setPaused(false); setInspectPose(null); }}>{tr('重設試玩', 'Reset trial')}</button></footer>
    </div>
  </main>;
}
