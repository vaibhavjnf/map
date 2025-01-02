import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet'],
          vendor: ['vue'],
          keys: ['/src/config/keys.ts']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['leaflet']
  },
  define: {
    __VUE_PROD_DEVTOOLS__: false,
  }
})
