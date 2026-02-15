import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
