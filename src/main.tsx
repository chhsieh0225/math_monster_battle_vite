import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { I18nProvider } from './i18n';

// vite-plugin-pwa: 偵測到新版時立即啟用，避免卡在舊快取版本
// Native bundles own their version; service workers only update hosted web builds.
if (window.location.protocol === 'https:' || window.location.protocol === 'http:') {
  let registered = false;
  const registerAfterFirstScene = () => {
    if (registered) return;
    registered = true;
    window.clearTimeout(fallback);
    window.removeEventListener('game:visual-ready', registerAfterFirstScene);
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() { void updateSW(true); },
    });
  };
  // Installing the offline shell fetches every screen chunk. Let first-screen art win the network.
  window.addEventListener('game:visual-ready', registerAfterFirstScene, { once: true });
  const fallback = window.setTimeout(registerAfterFirstScene, 30000);
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');
const VisualPilot = import.meta.env.DEV ? lazy(() => import('./components/screens/VisualPilot')) : null;
const GuardianPreview = import.meta.env.DEV ? lazy(() => import('./components/screens/GuardianPreview')) : null;
const showVisualPilot = new URLSearchParams(window.location.search).get('visual') === 'pilot';
const showGuardians = new URLSearchParams(window.location.search).get('visual') === 'guardians';

createRoot(rootEl).render(
  <I18nProvider>
    {GuardianPreview && showGuardians ? <Suspense fallback={<div role="status">Loading guardian art...</div>}><GuardianPreview /></Suspense>
      : VisualPilot && showVisualPilot ? <Suspense fallback={<div className="app-error-wrap" role="status">Loading visual trial…</div>}><VisualPilot /></Suspense> : <App />}
  </I18nProvider>
);
