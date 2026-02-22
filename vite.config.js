import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // SW 自動更新，使用者永遠拿到最新版
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        // 只預快取 app shell，重資產（音樂/場景/精靈圖）走 runtime cache。
        // 這可大幅降低首次安裝與更新下載量。
        globPatterns: ['**/*.{js,css,html,json,svg,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // Google Fonts：runtime cache，避免 precache 外部資源失敗阻擋安裝
        runtimeCaching: [
          {
            // 場景圖與精靈圖：首次請求後快取，之後離線可用。
            urlPattern: /\/(?:backgrounds|sprites)\/.*\.(?:png|jpg|jpeg|webp|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-visual-assets',
              expiration: { maxEntries: 260, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // BGM/SE：避免全量 precache，改為按需快取。
            urlPattern: /\/musics\/.*\.mp3$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-bgm-assets',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 45 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-style',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfont',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // 把 manifest 設定搬進來，build 時自動產生 + 自動注入 <link rel="manifest">
      manifest: {
        name: 'Math Monster Brawl — 數學怪獸大亂鬥',
        short_name: 'MathBrawl',
        description: 'Monster-style math battle game — pick moves, solve math, defeat monsters! 怪獸風格數學對戰遊戲',
        start_url: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#4338ca',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  base: './',           // 用相對路徑，部署到任何位置都能正確載入
  server: {
    open: true,         // npm run dev 時自動開瀏覽器
    host: true,         // 允許手機透過區網 IP 測試
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          if (id.includes('/src/data/')) {
            return 'game-data'
          }
          if (id.includes('/src/components/effects/')) {
            return 'battle-effects'
          }
          return undefined
        },
      },
    },
  },
})
