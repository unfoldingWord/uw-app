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
    ...sharedPrimitivesAwaitingScreens,
  ],
  ignore: ['design-system/**'],
  ignoreDependencies: dependenciesAwaitingFirstImport,
};

export default config;
