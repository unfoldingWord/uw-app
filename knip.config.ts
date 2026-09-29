import type { KnipConfig } from 'knip';

const dependenciesAwaitingFirstImport = [
  'expo-router',
  'expo-constants',
  'expo-linking',
  'react-native-safe-area-context',
  'react-native-screens',
];

const config: KnipConfig = {
  entry: ['scripts/*.ts', 'scripts/*/cli.ts', 'scripts/checks/*.check.ts'],
  ignore: ['design-system/**'],
  ignoreDependencies: dependenciesAwaitingFirstImport,
};

export default config;
