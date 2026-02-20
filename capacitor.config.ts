import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mathmonster.battle',
  appName: '數學怪獸大亂鬥',
  webDir: 'dist',              // Vite build 產出目錄
  server: {
    // iOS WKWebView 用 file:// 載入，不需要 localhost server
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',  // 自動處理 safe area
    scheme: 'MathMonsterBattle',
  },
};

export default config;
