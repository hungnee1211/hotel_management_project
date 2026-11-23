import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API is proxied, so the browser sees ONE origin: HTTP-only cookies work with SameSite=Lax.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:5000', changeOrigin: false } } },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.js'], css: false, include: ['tests/unit/**/*.test.{js,jsx}'] },
});
