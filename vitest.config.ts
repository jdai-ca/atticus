import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for React component and browser-API tests
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Exclude Electron main-process code (uses Node-only APIs)
    exclude: [
      '**/node_modules/**',
      '**/dist-electron/**',
      'src/electron/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/services/**'],
      exclude: ['src/electron/**', 'src/test/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
