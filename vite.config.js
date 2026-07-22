import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    open: false
  },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1600
  }
});
