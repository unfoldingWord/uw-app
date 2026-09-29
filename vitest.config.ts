import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

type TsconfigPaths = { compilerOptions: { paths: Record<string, string[]> } };

const tsconfig = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'tsconfig.json'), 'utf8'),
) as TsconfigPaths;

const alias = Object.entries(tsconfig.compilerOptions.paths).flatMap(([pattern, [target]]) =>
  target === undefined
    ? []
    : [
        {
          find: new RegExp(`^${pattern.replace('/*', '/(.*)')}$`),
          replacement: `${resolve(import.meta.dirname, target.replace('/*', ''))}/$1`,
        },
      ],
);

export default defineConfig({
  resolve: { alias },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'sim/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
