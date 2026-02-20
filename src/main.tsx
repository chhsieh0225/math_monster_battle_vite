import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { I18nProvider } from './i18n';

// vite-plugin-pwa: 自動更新 SW，使用者永遠取得最新版本
registerSW({ immediate: true });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
