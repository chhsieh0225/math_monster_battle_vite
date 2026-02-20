import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // SW 自動更新，使用者永遠拿到最新版
      workbox: {
        // 預快取所有 build 產物（JS/CSS bundles + public/ 複製過來的靜態資源）
        globPatterns: ['**/*.{js,css,html,png,jpg,mp3,json,svg,ico,webp}'],
        // MP3 最大 ~3MB，需提高上限（預設 2MB）
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Google Fonts：runtime cache，避免 precache 外部資源失敗阻擋安裝
        runtimeCaching: [
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
        name: '數學怪獸大亂鬥',
        short_name: '數學對戰',
        description: '怪獸風格數學對戰遊戲 — 選擇招式、回答數學題、打倒怪獸！',
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
