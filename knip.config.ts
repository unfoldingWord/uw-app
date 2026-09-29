import type { KnipConfig } from 'knip';

const dependenciesAwaitingFirstImport = [
  'expo-router',
  'expo-constants',
  'expo-linking',
  'react-native-screens',
];

const sharedPrimitivesAwaitingScreens = [
  'src/shared/theme/index.ts',
  'src/shared/glass/index.ts',
  'src/shared/fonts/index.ts',
];

const config: KnipConfig = {
  entry: [
    'scripts/*.ts',
    'scripts/*/cli.ts',
    'scripts/checks/*.check.ts',
    'sim/scenarios/*.ts',
    'migrations/*.ts',
    'src/features/*/migrations/*.ts',
    ...sharedPrimitivesAwaitingScreens,
  ],
  ignoreExportsUsedInFile: true,
  ignore: ['design-system/**'],
  ignoreDependencies: dependenciesAwaitingFirstImport,
};

export default config;
