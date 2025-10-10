import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'https://sc-mvp-staging-c6ef090c6c41.herokuapp.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
