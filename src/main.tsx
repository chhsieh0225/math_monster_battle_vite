import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { I18nProvider } from './i18n';

// vite-plugin-pwa: 偵測到新版時立即啟用，避免卡在舊快取版本
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true);
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');
const VisualPilot = lazy(() => import('./components/screens/VisualPilot'));
const showVisualPilot = new URLSearchParams(window.location.search).get('visual') === 'pilot';

createRoot(rootEl).render(
  <I18nProvider>
    {showVisualPilot ? <Suspense fallback={<div className="app-error-wrap" role="status">Loading visual trial…</div>}><VisualPilot /></Suspense> : <App />}
  </I18nProvider>
);
