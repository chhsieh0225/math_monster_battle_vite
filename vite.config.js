import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
