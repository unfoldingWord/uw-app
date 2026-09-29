import { builtinModules } from 'node:module';

type RestrictedPattern = { regex: string; message: string; allowTypeImports?: boolean };

const reactNativeAndExpo: RestrictedPattern = {
  regex:
    '^(react|react-dom|react-native|expo|lucide-react-native)(/.*)?$|^(expo-|react-native-|@expo/|@react-native|@react-navigation/)',
  message: 'React, React Native and Expo stay out of this layer (AGENTS.md rule 2).',
};

const nodeBuiltins: RestrictedPattern = {
  regex: `^node:|^(${builtinModules.filter((name) => !name.startsWith('_')).join('|')})(/.*)?$`,
  message: 'src/lib runs on Hermes as well as Node; reach the world through a port (AGENTS.md rule 2).',
};

const simFromApplication: RestrictedPattern = {
  regex: '^@sim(/|$)',
  message: 'Application code never imports the sim; the sim drives the application (AGENTS.md rule 2).',
};

export const layers: { name: string; files: string[]; ignores?: string[]; patterns: RestrictedPattern[] }[] =
  [
    {
      name: 'lib',
      files: ['src/lib/**'],
      ignores: ['src/lib/**/*.test.ts'],
      patterns: [
        reactNativeAndExpo,
        nodeBuiltins,
        {
          regex: '^@(features|shared|platform|sim)(/|$)',
          message: 'src/lib imports nothing above it in the tower (AGENTS.md rule 2).',
        },
      ],
    },
    {
      name: 'lib tests',
      files: ['src/lib/**/*.test.ts'],
      patterns: [
        reactNativeAndExpo,
        {
          regex: '^@(features|shared|platform|sim)(/|$)',
          message: 'src/lib imports nothing above it in the tower (AGENTS.md rule 2).',
        },
      ],
    },
    {
      name: 'features',
      files: ['src/features/**'],
      ignores: ['src/features/*/screens/**'],
      patterns: [
        {
          regex: '^@features(/|$)',
          message:
            'A feature never imports another feature, and reaches its own files by relative path. Shared code moves to src/shared (AGENTS.md rule 2).',
        },
        {
          regex: '^@platform(/|$)',
          message: 'Application code reaches a device API only through a port (AGENTS.md rule 2).',
        },
        simFromApplication,
      ],
    },
    {
      name: 'screens',
      files: ['src/features/*/screens/**'],
      patterns: [
        {
          regex: '^@features(/|$)',
          message:
            'A feature never imports another feature, and reaches its own files by relative path. Shared code moves to src/shared (AGENTS.md rule 2).',
        },
        {
          regex: '^@platform(/|$)',
          message: 'Screens never call a port directly; they call the feature service.ts (AGENTS.md rule 2).',
        },
        {
          regex: '^@lib/(?!domain(/|$))',
          message:
            'Screens never call the kernel or a port directly; they call the feature service.ts. Only @lib/domain types are visible here (AGENTS.md rule 2).',
        },
        {
          regex: '(^|/)store(\\.tsx?)?$',
          message:
            'Screens read durable values through the feature service.ts, never the store (AGENTS.md rules 2 and 3).',
        },
        simFromApplication,
      ],
    },
    {
      name: 'shared',
      files: ['src/shared/**'],
      patterns: [
        {
          regex: '^@features(/|$)',
          message: 'src/shared never imports from src/features (AGENTS.md rule 2).',
        },
        {
          regex: '^@platform(/|$)',
          message: 'Application code reaches a device API only through a port (AGENTS.md rule 2).',
        },
        simFromApplication,
      ],
    },
    {
      name: 'platform',
      files: ['src/platform/**'],
      patterns: [
        {
          regex: '^@(features|shared|sim)(/|$)',
          message: 'src/platform never imports application code (AGENTS.md rule 2).',
        },
        {
          regex: '^@lib/(?!ports$|domain(/|$))',
          message:
            'src/platform never imports application code; it sees only the types of @lib/ports and @lib/domain (AGENTS.md rule 2, docs/exceptions.md).',
        },
        {
          regex: '^@lib/(ports$|domain(/|$))',
          allowTypeImports: true,
          message:
            'src/platform imports @lib/ports and @lib/domain as types only (AGENTS.md rule 2, docs/exceptions.md).',
        },
      ],
    },
    {
      name: 'app',
      files: ['app/**'],
      patterns: [simFromApplication],
    },
    {
      name: 'sim',
      files: ['sim/**'],
      patterns: [
        reactNativeAndExpo,
        {
          regex: '^@(platform|shared)(/|$)',
          message: 'sim imports src/lib and src/features/*/service.ts and nothing else (AGENTS.md rule 2).',
        },
        {
          regex: '^@features/(?![^/]+/service$)',
          message: 'sim imports src/lib and src/features/*/service.ts and nothing else (AGENTS.md rule 2).',
        },
      ],
    },
    {
      name: 'scripts',
      files: ['scripts/**'],
      patterns: [reactNativeAndExpo],
    },
  ];
