// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist-electron/**',
      'dist/**',
      'release/**',
      'node_modules/**',
      'public/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'scripts/**',
      'src/test/**',
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React plugin
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // React 17+ JSX transform — no need to import React in scope
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  // TypeScript-specific overrides
  {
    rules: {
      // Intentional any casts must be explicit; unintentional ones are flagged
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow underscore-prefixed unused vars (common convention for ignored params)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow void-returning async callbacks (e.g. event handlers)
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },

  // Electron main process — Node globals allowed
  {
    files: ['src/electron/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Prettier must be last — disables all formatting rules that conflict
  prettierConfig,
);
