import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mathmonster.battle',
  appName: 'Math Monster Brawl',
  webDir: 'dist',              // Vite build 產出目錄
  server: {
    // Native builds serve bundled files; never point a release at the dev server.
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',  // 自動處理 safe area
    scheme: 'App',
  },
};

export default config;
