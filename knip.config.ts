import type { KnipConfig } from 'knip';

const sharedLibraryBarrels = ['src/shared/*/index.ts'];

const featureTemplate = ['src/features/_template/**/*.{ts,tsx}'];

const config: KnipConfig = {
  entry: [
    'scripts/*.ts',
    'scripts/*/cli.ts',
    'scripts/checks/*.check.ts',
    'scripts/shots/page-*.js',
    'sim/scenarios/*.ts',
    'migrations/*.ts',
    'src/features/*/migrations/*.ts',
    ...sharedLibraryBarrels,
    ...featureTemplate,
  ],
  ignoreExportsUsedInFile: true,
  ignore: ['design-system/**'],
};

export default config;
