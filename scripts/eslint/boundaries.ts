import { builtinModules } from 'node:module';

type RestrictedPattern = { regex: string; message: string; allowTypeImports?: boolean };

export type Layer = { name: string; files: string[]; ignores?: string[]; patterns: RestrictedPattern[] };

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

const deviceModules = [
  'expo-file-system',
  'expo-sqlite',
  'expo-audio',
  'expo-av',
  'expo-video',
  'expo-sharing',
  'expo-localization',
  'expo-network',
  'expo-document-picker',
  'expo-crypto',
  'expo-secure-store',
  'expo-location',
  'expo-contacts',
  'expo-notifications',
  'expo-device',
  'expo-application',
  'expo-cellular',
  'expo-clipboard',
  'expo-media-library',
  'expo-image-picker',
  'expo-camera',
  'expo-sensors',
  'expo-intent-launcher',
  'expo-nearby-connections',
  'expo-print',
  'expo-mail-composer',
  'expo-sms',
  'expo-tracking-transparency',
  'react-native-mmkv',
  '@react-native-async-storage/async-storage',
  'react-native-fs',
  'react-native-blob-util',
  'react-native-ble-plx',
  'react-native-ble-manager',
  'react-native-tcp-socket',
  'react-native-udp',
  'react-native-wifi-p2p',
  'react-native-nearby-api',
  'react-native-multipeer',
  'react-native-share',
  'react-native-device-info',
  '@modules',
];

function escaped(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

const deviceApis: RestrictedPattern = {
  regex: `^(${deviceModules.map(escaped).join('|')})(/.*)?$`,
  message:
    'Application code reaches a device API only through a port; only src/platform imports device modules (AGENTS.md rule 2).',
};

const reactNativeDeviceApis: RestrictedPattern = {
  regex: '^react-native/Libraries/(Network|WebSocket|Blob|Share|Linking|Storage)(/|$)',
  message: 'Application code reaches a device API only through a port (AGENTS.md rule 2).',
};

const renderingModules = ['expo-blur', 'expo-haptics', 'expo-font', 'expo-glass-effect'];

const renderingApis: RestrictedPattern = {
  regex: `^(${renderingModules.map(escaped).join('|')})(/.*)?$`,
  message:
    'Blur, haptics and fonts are reached through the glass primitives and useThemeFonts in src/shared, never directly (docs/exceptions.md).',
};

const designSystemAssets: RestrictedPattern = {
  regex: '^@design-system(/|$)',
  message:
    'Only src/shared/fonts imports from design-system/, and only its fonts (AGENTS.md section 3, docs/exceptions.md).',
};

const platformFromApplication: RestrictedPattern = {
  regex: '^@platform(/|$)',
  message: 'Application code reaches a device API only through a port (AGENTS.md rule 2).',
};

const otherFeatures: RestrictedPattern = {
  regex: '^@features(/|$)',
  message:
    'A feature never imports another feature, and reaches its own files by relative path. Shared code moves to src/shared (AGENTS.md rule 2).',
};

const applicationBase: RestrictedPattern[] = [
  simFromApplication,
  deviceApis,
  reactNativeDeviceApis,
  designSystemAssets,
];

export const layers: Layer[] = [
  {
    name: 'lib',
    files: ['src/lib/**'],
    ignores: ['src/lib/**/*.test.ts'],
    patterns: [
      reactNativeAndExpo,
      nodeBuiltins,
      designSystemAssets,
      {
        regex: '^@(features|shared|platform|sim|modules)(/|$)',
        message: 'src/lib imports nothing above it in the tower (AGENTS.md rule 2).',
      },
    ],
  },
  {
    name: 'lib tests',
    files: ['src/lib/**/*.test.ts'],
    patterns: [
      reactNativeAndExpo,
      designSystemAssets,
      {
        regex: '^@(features|shared|platform|sim|modules)(/|$)',
        message: 'src/lib imports nothing above it in the tower (AGENTS.md rule 2).',
      },
    ],
  },
  {
    name: 'features',
    files: ['src/features/**'],
    ignores: ['src/features/*/screens/**', 'src/features/*/migrations/**'],
    patterns: [otherFeatures, platformFromApplication, renderingApis, ...applicationBase],
  },
  {
    name: 'screens',
    files: ['src/features/*/screens/**'],
    patterns: [
      otherFeatures,
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
      renderingApis,
      ...applicationBase,
    ],
  },
  {
    name: 'shared',
    files: ['src/shared/**'],
    ignores: ['src/shared/glass/**', 'src/shared/fonts/**', 'src/shared/ui/Logo.tsx'],
    patterns: [
      {
        regex: '^@features(/|$)',
        message: 'src/shared never imports from src/features (AGENTS.md rule 2).',
      },
      platformFromApplication,
      renderingApis,
      ...applicationBase,
    ],
  },
  {
    name: 'shared logo',
    files: ['src/shared/ui/Logo.tsx'],
    patterns: [
      {
        regex: '^@features(/|$)',
        message: 'src/shared never imports from src/features (AGENTS.md rule 2).',
      },
      platformFromApplication,
      renderingApis,
      {
        regex: '^@design-system/(?!assets/logo/logo-horizontal-(color|reversed)\\.png$)',
        message:
          'src/shared/ui/Logo.tsx imports only the two horizontal lockups from design-system/ (AGENTS.md section 3, docs/exceptions.md).',
      },
      simFromApplication,
      deviceApis,
      reactNativeDeviceApis,
    ],
  },
  {
    name: 'shared glass',
    files: ['src/shared/glass/**'],
    patterns: [
      {
        regex: '^@features(/|$)',
        message: 'src/shared never imports from src/features (AGENTS.md rule 2).',
      },
      platformFromApplication,
      ...applicationBase,
    ],
  },
  {
    name: 'shared fonts',
    files: ['src/shared/fonts/**'],
    patterns: [
      {
        regex: '^@features(/|$)',
        message: 'src/shared never imports from src/features (AGENTS.md rule 2).',
      },
      platformFromApplication,
      {
        regex: '^@design-system/(?!assets/fonts/)',
        message: 'src/shared/fonts imports only the fonts from design-system/ (AGENTS.md section 3).',
      },
      simFromApplication,
      deviceApis,
      reactNativeDeviceApis,
    ],
  },
  {
    name: 'platform web harness',
    files: ['src/platform/ports.web.ts'],
    patterns: [
      {
        regex: '^(?!@sim/web/ports$)',
        message:
          'src/platform/ports.web.ts only re-exports the QA render harness from @sim/web/ports (docs/exceptions.md).',
      },
    ],
  },
  {
    name: 'platform',
    files: ['src/platform/**'],
    ignores: ['src/platform/ports.web.ts'],
    patterns: [
      designSystemAssets,
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
    name: 'migrations',
    files: ['migrations/**', 'src/features/*/migrations/**'],
    patterns: [
      {
        regex: '^(?!@lib/ports$)',
        allowTypeImports: false,
        message:
          'A migration is data: its statements and the Migration type from @lib/ports, nothing else (AGENTS.md section 3).',
      },
      {
        regex: '^@lib/ports$',
        allowTypeImports: true,
        message: 'A migration imports @lib/ports as a type only (AGENTS.md section 3).',
      },
    ],
  },
  {
    name: 'app routes',
    files: ['app/**'],
    ignores: ['app/**/_layout.tsx', 'app/_layout.tsx'],
    patterns: [
      {
        regex: '^(?!@features/[^/]+/screens/)',
        message:
          'A route file is a one-line re-export of a feature screen, @features/<name>/screens/<Name>Screen (AGENTS.md section 1).',
      },
    ],
  },
  {
    name: 'app layouts',
    files: ['app/**/_layout.tsx'],
    ignores: ['app/_layout.tsx'],
    patterns: [
      {
        regex: '^@(lib|platform)(/|$)',
        message:
          'A nested layout arranges screens; only the root layout, app/_layout.tsx, composes the kernel (AGENTS.md rule 2).',
      },
      {
        regex: '^@features/(?![^/]+/screens/)',
        message: 'A layout reaches a feature only through its screens (AGENTS.md rule 2).',
      },
      renderingApis,
      ...applicationBase,
    ],
  },
  {
    name: 'app root',
    files: ['app/_layout.tsx'],
    patterns: [
      {
        regex: '^@lib/(?!kernel$)',
        message:
          'The root layout is the composition root: it calls createKernel from @lib/kernel with the platform adapters and hands them the host allowlist @lib/kernel re-exports, and nothing else from src/lib (AGENTS.md section 1).',
      },
      {
        regex: '^@features/(?![^/]+/(screens/|service$))',
        message:
          'The root layout reaches a feature through its screens and service.ts only (AGENTS.md rule 2).',
      },
      renderingApis,
      ...applicationBase,
    ],
  },
  {
    name: 'sim',
    files: ['sim/**'],
    patterns: [
      reactNativeAndExpo,
      designSystemAssets,
      {
        regex: '^@(platform|shared|modules)(/|$)',
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

export const applicationSources = ['src/**', 'app/**', 'migrations/**'];

export const applicationNetworkGlobals: { name: string; message: string }[] = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
].map((name) => ({
  name,
  message:
    'The only network calls go through the Http port, which src/platform implements (AGENTS.md section 10).',
}));

export const moduleLoadingSyntax: { selector: string; message: string }[] = [
  {
    selector: 'ImportExpression',
    message:
      'Application code imports statically so the boundary rules see every import; discovery by reserved filename lives in src/platform (AGENTS.md rules 2 and 4).',
  },
  {
    selector: "CallExpression[callee.type='Identifier'][callee.name='require']",
    message: 'Application code imports statically so the boundary rules see every import (AGENTS.md rule 2).',
  },
  {
    selector: 'TSImportType',
    message: 'Name a type through a static import type so the boundary rules see it (AGENTS.md rule 2).',
  },
];
