import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0', // Allow access from network
    port: 5173, // Default Vite port
    strictPort: false // Try next available port if 5173 is taken
  },
  build: {
    // Security: Production build optimizations
    minify: 'esbuild',
    sourcemap: false, // Don't expose source maps in production (security)
    rollupOptions: {
      output: {
        // Obfuscate chunk names to make reverse engineering harder
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]'
      }
    }
    // Note: Console logs should be replaced with logger utility
    // See: src/utils/logger.js for production-safe logging
  },
  // Security headers (handled by Vercel, but good to document)
  define: {
    // Remove debug flags in production
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV === 'development')
  }
});
