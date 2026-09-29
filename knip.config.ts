import type { KnipConfig } from 'knip';

const dependenciesAwaitingFirstImport = [
  'expo-router',
  'expo-constants',
  'expo-linking',
  'react-native-safe-area-context',
  'react-native-screens',
];

const config: KnipConfig = {
  entry: [
    'scripts/*.ts',
    'scripts/*/cli.ts',
    'scripts/checks/*.check.ts',
    'sim/scenarios/*.ts',
    'migrations/*.ts',
    'src/features/*/migrations/*.ts',
  ],
  ignoreExportsUsedInFile: true,
  ignore: ['design-system/**'],
  ignoreDependencies: dependenciesAwaitingFirstImport,
};

export default config;
