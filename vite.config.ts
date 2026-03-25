import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'GEMINI_'],
    define: {
      // We no longer bake API keys here to avoid "undefined" string issues in WordPress.
      // Instead, we read from window.bcnSettings at runtime.
    },
    build: {
      outDir: 'beauty-care-nabila-plugin/assets',
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
          assetFileNames: 'index.[ext]',
        },
      },
      emptyOutDir: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
