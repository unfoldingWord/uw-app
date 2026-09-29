import type { KnipConfig } from 'knip';

const sharedPrimitivesAwaitingScreens = [
  'src/shared/theme/index.ts',
  'src/shared/glass/index.ts',
  'src/shared/fonts/index.ts',
  'src/shared/kernel/index.ts',
];

const featureTemplate = ['src/features/_template/**/*.{ts,tsx}'];

const config: KnipConfig = {
  entry: [
    'scripts/*.ts',
    'scripts/*/cli.ts',
    'scripts/checks/*.check.ts',
    'sim/scenarios/*.ts',
    'migrations/*.ts',
    'src/features/*/migrations/*.ts',
    ...sharedPrimitivesAwaitingScreens,
    ...featureTemplate,
  ],
  ignoreExportsUsedInFile: true,
  ignore: ['design-system/**'],
};

export default config;
