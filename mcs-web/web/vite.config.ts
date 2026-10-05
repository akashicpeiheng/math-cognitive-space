import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(here, '../shared'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    fs: { allow: [resolve(here, '..')] },
    proxy: {
      '/api': 'http://127.0.0.1:3784',
    },
  },
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
});
