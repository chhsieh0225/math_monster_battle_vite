import { useEffect, useState, type ReactNode } from 'react';
import { scenePreloader } from '../../utils/scenePreload.ts';
import { battleSpritePreloader } from '../../utils/battleSpritePreload.ts';
import { useI18n } from '../../i18n';

type Props = { images?: readonly string[]; sprites?: readonly string[]; wait?: boolean; children: ReactNode };

function AssetPreparation({ images = [], sprites = [], wait = true, children }: Props) {
  const { t } = useI18n();
  // The keyed boundary owns this plan for its lifetime; HP/animation renders do not restart it.
  const [tasks] = useState(() => [
    ...images.map((src) => ({ src, loader: scenePreloader })),
    ...sprites.map((src) => ({ src, loader: battleSpritePreloader })),
  ]);
  const [state, setState] = useState(() => ({
    done: tasks.filter(({ src, loader }) => loader.isReady(src)).length,
    ready: !wait || tasks.every(({ src, loader }) => loader.isReady(src)), failed: false,
  }));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (state.ready) window.dispatchEvent(new Event('game:visual-ready'));
  }, [state.ready]);
  useEffect(() => {
    let active = true;
    const unpin = tasks.map(({ src, loader }) => loader.subscribe(src, () => {}));
    let done = 0;
    let failed = false;
    const deadline = window.setTimeout(() => {
      if (active) setState((old) => ({ ...old, failed: true }));
    }, 15000);
    for (const { src, loader } of tasks) {
      void loader.load(src).then((ok) => {
        if (!active) return;
        done++;
        failed ||= !ok;
        if (done === tasks.length) window.clearTimeout(deadline);
        setState((old) => ({ done, failed: old.failed || (done === tasks.length && failed),
          ready: old.ready || (done === tasks.length && !failed) }));
      });
    }
    return () => { active = false; window.clearTimeout(deadline); unpin.forEach((stop) => stop()); };
  }, [tasks, attempt]);

  if (state.ready) return children;
  return <div className="visual-loading" aria-busy={!state.failed}>
    <div className="visual-loading-title" role="status" aria-live="polite">
      {state.failed
        ? t('app.loading.artFailed', 'Some artwork could not load. Check your connection and retry.')
        : t('app.loading.art', 'Preparing the scene and monsters...')}
    </div>
    <progress value={state.done} max={Math.max(1, tasks.length)} aria-label={t('app.loading.progress', 'Artwork loading progress')} />
    <span className="visual-loading-count">{state.done} / {tasks.length}</span>
    {state.failed && <div className="visual-loading-actions">
      <button onClick={() => { setState({ done: 0, ready: false, failed: false }); setAttempt((n) => n + 1); }}>
        {t('app.error.retry', 'Retry')}
      </button>
      <button onClick={() => setState((old) => ({ ...old, ready: true }))}>
        {t('app.loading.continue', 'Continue without waiting')}
      </button>
    </div>}
  </div>;
}

/** Mount cinematics and controls only after required art is decoded, not merely requested. */
export default function VisualAssetGate({ images = [], sprites = [], wait = true, children }: Props) {
  const uniqueImages = [...new Set(images.filter(Boolean))].sort();
  const uniqueSprites = [...new Set(sprites.filter(Boolean))].sort();
  return <AssetPreparation key={JSON.stringify([uniqueImages, uniqueSprites])}
    images={uniqueImages} sprites={uniqueSprites} wait={wait}>{children}</AssetPreparation>;
}
