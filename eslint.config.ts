import js from '@eslint/js';
import type { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import {
  applicationNetworkGlobals,
  applicationSources,
  layers,
  moduleLoadingSyntax,
} from './scripts/eslint/boundaries.ts';
import {
  libRestrictedGlobals,
  libRestrictedProperties,
  libRestrictedSyntax,
} from './scripts/eslint/lib-globals.ts';
import { uwPlugin } from './scripts/eslint/plugin.ts';

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      'design-system/**',
      'docs/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      '.claude/**',
      'coverage/**',
      'shots/**',
      'ios/**',
      'android/**',
      'expo-env.d.ts',
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'off',
    },
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    plugins: { uw: uwPlugin },
    rules: {
      'uw/no-comments': 'error',
      'uw/relative-imports-stay-in-unit': 'error',
      'max-lines': ['error', { max: 999, skipBlankLines: false, skipComments: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': true,
          'ts-nocheck': true,
          'ts-check': true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  ...layers.map((layer): Linter.Config => ({
    name: `uw/boundaries/${layer.name}`,
    files: layer.files,
    ...(layer.ignores ? { ignores: layer.ignores } : {}),
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: layer.patterns }],
    },
  })),
  {
    name: 'uw/shots-page-scripts',
    files: ['scripts/shots/page-*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { document: 'readonly', window: 'readonly', getComputedStyle: 'readonly' },
    },
  },
  {
    name: 'uw/static-imports',
    files: applicationSources,
    rules: {
      'no-restricted-syntax': ['error', ...moduleLoadingSyntax],
    },
  },
  {
    name: 'uw/network-through-http-port',
    files: ['src/features/**', 'src/shared/**', 'app/**'],
    rules: {
      'no-restricted-globals': ['error', ...applicationNetworkGlobals],
    },
  },
  {
    name: 'uw/lib-purity',
    files: ['src/lib/**'],
    rules: {
      'no-eval': ['error', { allowIndirect: false }],
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-restricted-globals': ['error', ...libRestrictedGlobals],
      'no-restricted-properties': ['error', ...libRestrictedProperties],
      'no-restricted-syntax': ['error', ...moduleLoadingSyntax, ...libRestrictedSyntax],
    },
  },
);
