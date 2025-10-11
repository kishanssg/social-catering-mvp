import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production-ready configuration for Rails asset pipeline integration
export default defineConfig({
  plugins: [react()],
  base: '/assets/', // Critical: Rails serves assets from /assets/
  build: {
    // Build into Rails app/assets/builds directory
    outDir: '../../app/assets/builds',
    assetsDir: '',
    rollupOptions: {
      input: {
        application: './src/main.tsx'
      },
      output: {
        entryFileNames: 'application.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'application.css'
      }
    },
    // Ensure proper asset handling
    assetsInlineLimit: 0,
    sourcemap: true, // Enable sourcemaps for debugging
    manifest: true
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/healthz': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
