import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AttackEffectVm } from '../../types/battle.ts';
import type { SpriteTarget } from '../../hooks/useSpriteTargets.ts';
import { SkillStrikeEffect } from './SkillStrikeEffect.tsx';
import type { SkillEffectArena } from './SkillStrikeEffect.tsx';
import { advanceBattleEffectClock, getBattleTidalLayout, getBattleTidalTime, getPaintedFrame, hasPaintedEffect, isNewEffectCast, isTidalEffect, TIDAL_TIMING } from './skillEffectModel.ts';
import type { BattleEffectClock } from './skillEffectModel.ts';
import type { PaintedSkillRenderer } from './paintedSkillRenderer.ts';
import { getSkillChoreography } from './skillChoreography.ts';

type Props = {
  effect: AttackEffectVm | null;
  source: SpriteTarget;
  target: SpriteTarget;
  arena: SkillEffectArena;
  warmSkillId?: string;
  warmType?: string;
  warmEnemySkillId?: string;
  warmEnemyType?: string;
  scene?: string;
  paused: boolean;
  lowPerf: boolean;
};

/** Persistent per battle, not per attack. Battle flow remains the sole owner of damage. */
export const BattleSkillEffect = memo(function BattleSkillEffect({ effect, source, target, arena, warmSkillId, warmType = 'water', warmEnemySkillId, warmEnemyType = 'dark', scene, paused, lowPerf }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<PaintedSkillRenderer | null>(null);
  const clock = useRef<BattleEffectClock | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const active = hasPaintedEffect(effect) ? effect : null;
  const enabled = !lowPerf && !reduced && !failed;
  const shouldWarm = enabled;
  const [cast, setCast] = useState<{ effect: AttackEffectVm; gpu: boolean } | null>(null);
  // Choose once at launch: a late module download cannot replace an SVG mid-flight.
  if ((cast?.effect || null) !== active) {
    setCast(active ? { effect: active, gpu: isNewEffectCast(cast?.effect || null, active) ? ready && enabled : Boolean(cast?.gpu) } : null);
  }
  const gpu = Boolean(active && cast?.gpu && ready && enabled);
  const fail = useCallback(() => {
    renderer.current?.destroy();
    renderer.current = null;
    setFailed(true);
    setReady(false);
  }, []);

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(query.matches);
    document.addEventListener('visibilitychange', visibility);
    query.addEventListener('change', motion);
    return () => { document.removeEventListener('visibilitychange', visibility); query.removeEventListener('change', motion); };
  }, []);

  useEffect(() => {
    const container = host.current;
    if (!shouldWarm || !container) return;
    let alive = true;
    let instance: PaintedSkillRenderer | null = null;
    void import('./paintedSkillRenderer.ts')
      .then(({ createPaintedSkillRenderer }) => alive ? createPaintedSkillRenderer(container, fail) : null)
      .then((value) => {
        if (!value) return;
        if (!alive) { value.destroy(); return; }
        instance = value;
        renderer.current = value;
        setReady(true);
      }).catch(() => { if (alive) fail(); });
    return () => { alive = false; instance?.destroy(); renderer.current = null; setReady(false); };
  }, [shouldWarm, fail]);

  useEffect(() => {
    if (!ready || active || hidden || paused) return;
    const warm = () => {
      try {
        if (warmSkillId) renderer.current?.prepare(warmSkillId, warmType, scene);
        if (warmEnemySkillId) renderer.current?.prepare(warmEnemySkillId, warmEnemyType, scene);
      } catch { fail(); }
    };
    if ('requestIdleCallback' in window) {
      const task = window.requestIdleCallback(warm, { timeout: 500 });
      return () => window.cancelIdleCallback(task);
    }
    const task = setTimeout(warm, 60);
    return () => clearTimeout(task);
  }, [ready, active, hidden, paused, warmSkillId, warmType, warmEnemySkillId, warmEnemyType, scene, fail]);

  useLayoutEffect(() => {
    let frame = 0;
    const layout = getBattleTidalLayout(source, target, arena);
    const draw = (now: number) => {
      if (!active) clock.current = null;
      else clock.current = advanceBattleEffectClock(clock.current, active, now, paused);
      const current = gpu ? clock.current : null;
      const done = !current || (isTidalEffect(active)
        ? getBattleTidalTime(current) === 0 || getBattleTidalTime(current) >= TIDAL_TIMING.end : getPaintedFrame(current).done);
      try { renderer.current?.draw(current, layout, scene); }
      catch { fail(); return; }
      if (gpu && !paused && !document.hidden && !done) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(frame);
  }, [active, source, target, arena, paused, gpu, hidden, ready, scene, fail]);

  const fallback = active && (!gpu || active.impact?.outcome === 'blocked');
  return <>
    <div ref={host} className="battle-painted-canvas" data-painted-status={failed ? 'fallback' : ready ? 'ready' : shouldWarm ? 'warming' : 'off'}
      data-painted-light={gpu && getSkillChoreography(active?.skillId)?.pigment === 'lightning' || undefined}
      data-painted-skill={active?.skillId} data-painted-active={gpu && active?.impact?.outcome !== 'miss' && active?.impact?.outcome !== 'blocked'}
      style={{ width: arena.width, height: arena.height, visibility: gpu ? 'visible' : 'hidden' }} aria-hidden="true" />
    {fallback && <SkillStrikeEffect effect={active} source={source} target={target} arena={arena} lowPerf={lowPerf || reduced} />}
  </>;
});
