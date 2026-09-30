import type { AdmittedSocketPackage } from './sockets.ts';

const buildTool =
  'Runs in the Expo CLI, Metro, Babel or a developer tool on the build machine and never reaches an app bundle';

const devBuildOnly =
  'Serves the development client (Metro, the debugger, the error overlay); a release build leaves it out';

const docExample = 'The only hit is a usage example inside a doc comment';

const webOnly =
  'The hit is its web implementation; npm run bundle refuses web-only modules in the iOS and Android bundles';

export const socketsAdmitted: Readonly<Record<string, AdmittedSocketPackage>> = {
  '@expo/cli': { signals: ['fetch', 'node socket'], why: buildTool },
  '@expo/devcert': { signals: ['node socket'], why: buildTool },
  '@expo/devtools': { signals: ['WebSocket'], why: devBuildOnly },
  '@expo/image-utils': { signals: ['fetch'], why: buildTool },
  '@expo/log-box': { signals: ['WebSocket', 'apple socket', 'fetch', 'jvm socket'], why: devBuildOnly },
  '@expo/metro-runtime': { signals: ['fetch'], why: devBuildOnly },
  '@expo/ui': {
    signals: ['jvm socket'],
    why: 'Its Android image loader opens a remote image URL; expo-router pulls it in and no screen renders an @expo/ui image',
  },
  '@expo/ws-tunnel': { signals: ['node socket'], why: buildTool },
  '@react-native/community-cli-plugin': { signals: ['fetch', 'node socket'], why: buildTool },
  '@react-native/debugger-frontend': { signals: ['WebSocket', 'XMLHttpRequest', 'fetch'], why: buildTool },
  '@react-native/dev-middleware': { signals: ['fetch'], why: buildTool },
  'agent-base': { signals: ['node socket'], why: buildTool },
  'babel-plugin-react-compiler': { signals: ['XMLHttpRequest'], why: buildTool },
  'caniuse-lite': { signals: ['XMLHttpRequest'], why: buildTool },
  'chrome-launcher': { signals: ['node socket'], why: buildTool },
  'chromium-edge-launcher': { signals: ['node socket'], why: buildTool },
  connect: { signals: ['node socket'], why: buildTool },
  'cross-fetch': { signals: ['XMLHttpRequest', 'fetch'], why: webOnly },
  debug: { signals: ['node socket'], why: buildTool },
  'dnssd-advertise': { signals: ['node socket'], why: buildTool },
  domutils: { signals: ['fetch'], why: buildTool },
  expo: {
    signals: ['WebSocket', 'XMLHttpRequest', 'apple socket', 'fetch', 'jvm socket'],
    why: 'expo/fetch is the native client under the Http port (src/platform/http.ts), the one caller; the WebSocket is the development client’s Metro link',
  },
  'expo-asset': {
    signals: ['apple socket', 'jvm socket'],
    why: 'Downloads an asset only when its URI is remote; every asset the app loads is bundled',
  },
  'expo-audio': {
    signals: ['apple socket', 'fetch', 'jvm socket'],
    why: 'The native player can stream a URL; the Player module loads only files under packs/ (ST-4, ADR 0010)',
  },
  'expo-file-system': {
    signals: ['apple socket', 'jvm socket'],
    why: 'Download and upload tasks, which neither the Files, Db nor Transport adapter calls; downloads go through the Http port',
  },
  'expo-modules-core': {
    signals: ['apple socket', 'jvm socket'],
    why: 'URL type conversion and the development network inspector; it opens no connection of its own in a release build',
  },
  'expo-modules-jsi': {
    signals: ['apple socket'],
    why: 'A URLSession type named in a Swift promise helper; it opens nothing',
  },
  'expo-network': { signals: ['fetch'], why: webOnly },
  'expo-router': {
    signals: ['fetch'],
    why: 'Server components and route loaders, which the app does not use',
  },
  'expo-sharing': {
    signals: ['apple socket', 'jvm socket'],
    why: 'Resolves content shared into the app from a URL; the share-into target is off unless its plugin is given options, and app.config.ts gives none',
  },
  'expo-sqlite': { signals: ['WebSocket', 'XMLHttpRequest', 'fetch'], why: webOnly },
  'fb-watchman': { signals: ['node socket'], why: buildTool },
  fbjs: { signals: ['fetch'], why: webOnly },
  'fetch-nodeshim': { signals: ['node socket'], why: buildTool },
  glob: { signals: ['fetch'], why: buildTool },
  'https-proxy-agent': { signals: ['node socket'], why: buildTool },
  'jimp-compact': { signals: ['XMLHttpRequest', 'node socket'], why: buildTool },
  'lan-network': { signals: ['node socket'], why: buildTool },
  'lodash.debounce': { signals: ['EventSource'], why: docExample },
  'lodash.throttle': { signals: ['EventSource'], why: docExample },
  'lru-cache': { signals: ['fetch'], why: buildTool },
  metro: { signals: ['node socket'], why: buildTool },
  'metro-cache': { signals: ['node socket'], why: buildTool },
  'node-fetch': { signals: ['fetch', 'node socket'], why: webOnly },
  'node-forge': { signals: ['XMLHttpRequest'], why: buildTool },
  'on-headers': { signals: ['node socket'], why: buildTool },
  'react-devtools-core': { signals: ['XMLHttpRequest', 'fetch', 'node socket'], why: devBuildOnly },
  'react-native': {
    signals: ['WebSocket', 'XMLHttpRequest', 'apple socket', 'fetch', 'jvm socket', 'node socket'],
    why: 'Its networking modules back the fetch, XMLHttpRequest and WebSocket globals, which src/lib may not name and only src/platform/http.ts reaches; the node sockets are its CLI',
  },
  'react-native-svg': {
    signals: ['fetch'],
    why: 'SvgUri and the CSS loader fetch a remote SVG; the app renders only inline SVG (grep src app for SvgUri: none)',
  },
  'react-native-tcp-socket': {
    signals: ['apple socket', 'jvm socket'],
    why: 'The Transport stream on a shared local network (ADR 0013); only src/platform/transport.ts imports it',
  },
  'react-native-worklets': {
    signals: ['XMLHttpRequest', 'apple socket', 'jvm socket'],
    why: 'Networking inside the worklet runtime, which the app never starts; expo-router pulls it in',
  },
  'source-map-support': { signals: ['XMLHttpRequest'], why: buildTool },
  terser: { signals: ['XMLHttpRequest'], why: buildTool },
  typescript: { signals: ['node socket'], why: buildTool },
  'whatwg-fetch': {
    signals: ['XMLHttpRequest', 'fetch'],
    why: 'The global fetch React Native installs over its XMLHttpRequest; src/lib may not name it and no application file calls it',
  },
  ws: { signals: ['WebSocket', 'node socket'], why: buildTool },
};
