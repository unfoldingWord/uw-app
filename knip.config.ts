import type { KnipConfig } from 'knip';

const dependenciesAwaitingFirstImport = [
  'expo-router',
  'expo-constants',
  'expo-linking',
  'react-native-safe-area-context',
  'react-native-screens',
];

const sharedPrimitivesAwaitingScreens = ['src/shared/theme/index.ts'];

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
