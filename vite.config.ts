import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetPort = Number(process.env.PORT || env.PORT) || 3000;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: targetPort,
      strictPort: false,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || `http://localhost:${targetPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: targetPort,
      strictPort: false,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || `http://localhost:${targetPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

