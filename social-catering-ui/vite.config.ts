import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/assets/',                        // ensures absolute /assets/... paths in HTML
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',                        // build to local dist first
    assetsDir: '',                         // keep JS/CSS at root
    manifest: false,                       // we're serving index.html directly
    sourcemap: false,                      // Disable sourcemaps in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  preview: {
    port: 4173,
  },
})
