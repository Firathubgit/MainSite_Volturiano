import { defineConfig } from 'vite';

// In development the UI proxies API calls to the Express server.
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:3001';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        // Agent turns stream for minutes; keep the proxy from cutting them off.
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      onwarn(warning, warn) {
        // Libraries ship "use client" markers that mean nothing in a Vite build.
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
