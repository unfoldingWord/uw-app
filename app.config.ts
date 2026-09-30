import type { ExpoConfig } from 'expo/config';
import { locales } from './src/lib/strings/locales.ts';

const iosBundleIdentifier = 'com.unfoldingword.iosapp';

const androidPackage = 'org.unfoldingword.app';

const brand = {
  paper: '#F4FAFB',
  night: '#04161F',
} as const;

const archiveTypes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];

const blockedPermissions = [
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.READ_CONTACTS',
  'android.permission.GET_ACCOUNTS',
  'android.permission.READ_PHONE_STATE',
  'android.permission.CAMERA',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.POST_NOTIFICATIONS',
];

const config: ExpoConfig = {
  name: 'unfoldingWord',
  slug: 'unfoldingword',
  scheme: 'unfoldingword',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  platforms: ['ios', 'android'],
  updates: { enabled: false },
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
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
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
    blockedPermissions,
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

export default config;
