import type { ExpoConfig } from 'expo/config';
import { withDataExtractionRules } from './plugins/data-extraction-rules/index.ts';
import { collectedDataTypes } from './plugins/privacy-manifest/index.ts';
import { localNetworkUsage, systemPromptLocales } from './plugins/system-prompts/index.ts';
import { telemetryEndpoint } from './src/lib/network.ts';
import { locales } from './src/lib/strings/locales.ts';

const iosBundleIdentifier = 'com.unfoldingword.iosapp';

const androidPackage = 'org.unfoldingword.app';

const brand = {
  paper: '#F4FAFB',
  night: '#04161F',
} as const;

const archiveTypes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];

const transferService = '_uwapp._tcp';

const installerBuild = process.env.UW_ANDROID_PACKAGE_INSTALLER === '1';

const installerPermission = 'android.permission.REQUEST_INSTALL_PACKAGES';

const installerPermissions = installerBuild ? [installerPermission] : [];

const blockedPermissions = [
  'READ_CALENDAR',
  'WRITE_CALENDAR',
  'CAMERA',
  'READ_CONTACTS',
  'WRITE_CONTACTS',
  'GET_ACCOUNTS',
  'ACCESS_FINE_LOCATION',
  'ACCESS_COARSE_LOCATION',
  'ACCESS_BACKGROUND_LOCATION',
  'ACCESS_MEDIA_LOCATION',
  'RECORD_AUDIO',
  'READ_PHONE_STATE',
  'READ_PHONE_NUMBERS',
  'CALL_PHONE',
  'ANSWER_PHONE_CALLS',
  'READ_CALL_LOG',
  'WRITE_CALL_LOG',
  'ADD_VOICEMAIL',
  'USE_SIP',
  'PROCESS_OUTGOING_CALLS',
  'ACCEPT_HANDOVER',
  'BODY_SENSORS',
  'BODY_SENSORS_BACKGROUND',
  'ACTIVITY_RECOGNITION',
  'SEND_SMS',
  'RECEIVE_SMS',
  'READ_SMS',
  'RECEIVE_WAP_PUSH',
  'RECEIVE_MMS',
  'READ_EXTERNAL_STORAGE',
  'WRITE_EXTERNAL_STORAGE',
  'READ_MEDIA_IMAGES',
  'READ_MEDIA_VIDEO',
  'READ_MEDIA_AUDIO',
  'READ_MEDIA_VISUAL_USER_SELECTED',
  'BLUETOOTH_SCAN',
  'BLUETOOTH_CONNECT',
  'BLUETOOTH_ADVERTISE',
  'UWB_RANGING',
  'NEARBY_WIFI_DEVICES',
  'POST_NOTIFICATIONS',
  'ACCESS_WIFI_STATE',
  'SYSTEM_ALERT_WINDOW',
  'FOREGROUND_SERVICE',
  'FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'CHANGE_NETWORK_STATE',
].map((name) => `android.permission.${name}`);

const blockedOnThisBuild = installerBuild ? blockedPermissions : [...blockedPermissions, installerPermission];

const localeGate = process.env.UW_LOCALE_GATE === 'drafts' ? 'drafts' : 'reviewed';

const easProjectId = '047f36eb-f4b6-46a5-8668-ea6088f77d8f';

const config: ExpoConfig = {
  name: 'unfoldingWord',
  slug: 'uw-app',
  owner: 'unfoldingword',
  scheme: 'unfoldingword',
  version: '0.0.1',
  orientation: 'portrait',
  extra: { localeGate, eas: { projectId: easProjectId } },
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  platforms: ['ios', 'android'],
  updates: { enabled: false },
  locales: systemPromptLocales(),
  ios: {
    bundleIdentifier: iosBundleIdentifier,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      UIFileSharingEnabled: false,
      LSSupportsOpeningDocumentsInPlace: false,
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Scripture Burrito archive',
          CFBundleTypeRole: 'Viewer',
          LSHandlerRank: 'Alternate',
          LSItemContentTypes: ['public.zip-archive'],
        },
      ],
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: true },
      NSLocalNetworkUsageDescription: localNetworkUsage('en'),
      NSBonjourServices: [transferService],
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: collectedDataTypes(telemetryEndpoint),
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
      ],
    },
  },
  android: {
    package: androidPackage,
    allowBackup: false,
    blockedPermissions: blockedOnThisBuild,
    permissions: installerPermissions,
    intentFilters: [
      {
        action: 'VIEW',
        category: ['DEFAULT'],
        data: archiveTypes.map((mimeType) => ({ scheme: 'content', mimeType })),
      },
    ],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
      backgroundColor: brand.paper,
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-sqlite',
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    ['expo-localization', { supportsRTL: true, supportedLocales: [...locales] }],
    'expo-sharing',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: brand.paper,
        dark: { image: './assets/splash-icon.png', backgroundColor: brand.night },
      },
    ],
  ],
};

export default withDataExtractionRules(config);
