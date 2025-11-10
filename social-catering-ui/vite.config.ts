import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  // For dev: base is '/' (normal Vite dev server)
  // For build: base is '/assets/' (production)
  const base = command === 'serve' ? '/' : '/assets/';
  
  return {
    plugins: [react()],
    base: base,
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        // Proxy API requests to the Rails server during local development
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
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
          // Ensure SVG and image assets are copied with proper naming
          assetFileNames: (assetInfo) => {
            // Keep original structure for images/icons (SVG, PNG, etc.)
            if (/\.(png|jpe?g|svg|gif|webp|ico)$/i.test(assetInfo.name || '')) {
              // Preserve original filename for logos and icons
              return '[name][extname]';
            }
            // Default for other assets
            return 'assets/[name].[hash][extname]';
          },
        },
      },
    },
    preview: {
      port: 4173,
    },
  };
});
