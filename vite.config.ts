import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

// External packages that should not be bundled
const EXTERNAL_PACKAGES = [
  '@google/genai',
  '@mistralai/mistralai',
  '@anthropic-ai/sdk',
  'cohere-ai',
  'google-auth-library',
  'zod',
  '@aws-crypto',
  '@aws-sdk',
  '@smithy'
];

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: '../dist-electron',
            rollupOptions: {
              external: (id) => {
                // Externalize electron and all native SDKs plus their dependencies
                return id === 'electron' || EXTERNAL_PACKAGES.some(pkg => id.startsWith(pkg));
              },
              output: {
                format: 'es'
              }
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: '../dist-electron',
            rollupOptions: {
              output: {
                format: 'es'
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
