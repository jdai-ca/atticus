import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

export default defineConfig({
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
            outDir: 'dist-electron',
            rollupOptions: {
              external: (id) => {
                // Externalize electron and all native SDKs plus their dependencies
                return id === 'electron' ||
                  id.startsWith('@google/genai') ||
                  id.startsWith('@mistralai/mistralai') ||
                  id.startsWith('@anthropic-ai/sdk') ||
                  id.startsWith('cohere-ai') ||
                  id.startsWith('google-auth-library') ||
                  id.startsWith('zod') ||
                  id.startsWith('@aws-crypto') ||
                  id.startsWith('@aws-sdk') ||
                  id.startsWith('@smithy');
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
            outDir: 'dist-electron',
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
    outDir: 'dist'
  }
});
