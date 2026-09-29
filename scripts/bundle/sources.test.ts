import { describe, expect, it } from 'vitest';
import { forbiddenSources } from './sources';

describe('forbiddenSources', () => {
  const root = '/repo';

  it('names every sim, scripts, sql.js and react-native-web module in a native bundle', () => {
    expect(
      forbiddenSources(root, [
        '/repo/app/_layout.tsx',
        '/repo/src/platform/ports.ts',
        '/repo/sim/web/ports.ts',
        '/repo/sim/adapters/files.ts',
        '/repo/node_modules/sql.js/dist/sql-wasm-browser.js',
        '/repo/node_modules/react-native-web/dist/index.js',
        '/repo/node_modules/react-native/index.js',
      ]),
    ).toEqual([
      'node_modules/react-native-web/dist/index.js',
      'node_modules/sql.js/dist/sql-wasm-browser.js',
      'sim/adapters/files.ts',
      'sim/web/ports.ts',
    ]);
  });

  it('passes a bundle of application code', () => {
    expect(forbiddenSources(root, ['/repo/src/lib/kernel.ts', '/repo/src/platform/ports.ts'])).toEqual([]);
  });
});
