import { describe, expect, it } from 'vitest';
import { androidBlockedOn, androidRefused } from './android-permissions.ts';
import {
  easFindings,
  installerFlag,
  installerPermission,
  nativeConfigOf,
  permissionFindings,
  radioFindings,
} from './permissions.ts';

function introspected(options: {
  permissions: { name: string; remove?: boolean }[];
  allowBackup?: string;
  dataExtractionRules?: string | null;
  infoPlist?: Record<string, unknown>;
  entitlements?: Record<string, unknown>;
  intentData?: { scheme: string; mimeType?: string }[];
  bundleIdentifier?: string;
}): unknown {
  const intentData = options.intentData ?? [
    { scheme: 'content', mimeType: 'application/zip' },
    { scheme: 'content', mimeType: 'application/x-zip-compressed' },
    { scheme: 'content', mimeType: 'application/octet-stream' },
  ];
  return {
    ios: { bundleIdentifier: options.bundleIdentifier ?? 'com.unfoldingword.iosapp' },
    _internal: {
      modResults: {
        android: {
          manifest: {
            manifest: {
              'uses-permission': options.permissions.map((permission) => ({
                $: {
                  'android:name': permission.name,
                  ...(permission.remove === true ? { 'tools:node': 'remove' } : {}),
                },
              })),
              application: [
                {
                  $: {
                    'android:allowBackup': options.allowBackup,
                    ...(options.dataExtractionRules === null
                      ? {}
                      : {
                          'android:dataExtractionRules':
                            options.dataExtractionRules ?? '@xml/data_extraction_rules',
                        }),
                  },
                  activity: [
                    {
                      'intent-filter': [
                        {
                          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
                          data: [{ $: { 'android:scheme': 'unfoldingword' } }],
                        },
                        {
                          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
                          data: intentData.map((data) => ({
                            $: {
                              'android:scheme': data.scheme,
                              ...(data.mimeType === undefined ? {} : { 'android:mimeType': data.mimeType }),
                            },
                          })),
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        ios: {
          infoPlist: {
            ITSAppUsesNonExemptEncryption: false,
            LSSupportsOpeningDocumentsInPlace: false,
            CFBundleDocumentTypes: [{ LSItemContentTypes: ['public.zip-archive'] }],
            ...options.infoPlist,
          },
          entitlements: options.entitlements ?? {},
        },
      },
    },
  };
}

const blocked = androidBlockedOn(false).map((name) => ({ name, remove: true }));

const apkBlocked = androidRefused.map((name) => ({ name, remove: true }));

describe('permissionFindings', () => {
  it('passes a manifest that blocks every refused permission and backs nothing up', () => {
    const config = nativeConfigOf(
      introspected({
        permissions: [{ name: 'android.permission.INTERNET' }, ...blocked],
        allowBackup: 'false',
      }),
    );
    expect(permissionFindings(config)).toEqual([]);
  });

  it('refuses the microphone, background audio and backups that expo-audio and the template add by default', () => {
    const config = nativeConfigOf(
      introspected({
        permissions: [
          { name: 'android.permission.INTERNET' },
          { name: 'android.permission.RECORD_AUDIO' },
          ...blocked.filter((permission) => permission.name !== 'android.permission.RECORD_AUDIO'),
        ],
        allowBackup: 'true',
        infoPlist: { NSMicrophoneUsageDescription: 'Allow', UIBackgroundModes: ['audio'] },
      }),
    );
    expect(permissionFindings(config)).toEqual([
      'Android manifest requests android.permission.RECORD_AUDIO, which PRD sections 9 and 12 refuse',
      'android.permission.RECORD_AUDIO is not in android.blockedPermissions, so a library manifest could still merge it in',
      'android:allowBackup is not "false", so Android backs up notes, groups and names',
      'Info.plist carries NSMicrophoneUsageDescription, a permission the PRD does not admit',
      'Info.plist asks for background modes audio',
    ]);
  });

  it('refuses a permission that is on neither list, arbitrary loads and an entitlement', () => {
    const config = nativeConfigOf(
      introspected({
        permissions: [{ name: 'android.permission.RECEIVE_BOOT_COMPLETED' }, ...blocked],
        allowBackup: 'false',
        infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } },
        entitlements: { 'com.apple.developer.icloud-container-identifiers': [] },
      }),
    );
    expect(permissionFindings(config)).toEqual([
      'Android manifest requests android.permission.RECEIVE_BOOT_COMPLETED, which is not on the admitted list in scripts/checks/android-permissions.ts',
      'Info.plist allows arbitrary loads; the Http port only reaches allowlisted hosts over HTTPS',
      'iOS entitlements carry com.apple.developer.icloud-container-identifiers, which nothing in the PRD needs',
    ]);
  });

  it('refuses a burrito registration that reads file URIs, edits in place, or is missing (SH-3)', () => {
    const config = nativeConfigOf(
      introspected({
        permissions: blocked,
        allowBackup: 'false',
        intentData: [{ scheme: 'file', mimeType: 'application/zip' }],
        infoPlist: {
          CFBundleDocumentTypes: [{ LSItemContentTypes: ['public.data'] }],
          LSSupportsOpeningDocumentsInPlace: true,
          UIFileSharingEnabled: true,
        },
      }),
    );
    expect(permissionFindings(config)).toEqual([
      'An Android intent filter admits the scheme file; only unfoldingword and content are admitted, and a file URI would need storage permission',
      'Android does not offer the app to open application/zip over content, so a burrito cannot be opened from another app (SH-3)',
      'Android does not offer the app to open application/x-zip-compressed over content, so a burrito cannot be opened from another app (SH-3)',
      'Android does not offer the app to open application/octet-stream over content, so a burrito cannot be opened from another app (SH-3)',
      'Info.plist declares the document type public.data; only public.zip-archive is admitted',
      'Info.plist declares no document type for public.zip-archive, so iOS never offers the app a burrito (SH-3)',
      'Info.plist does not set LSSupportsOpeningDocumentsInPlace false; an opened burrito must be copied, never edited in place',
      "Info.plist sets UIFileSharingEnabled, which shows the app's files in the Files app and Finder",
    ]);
  });

  it('refuses an iOS bundle identifier other than the App Store record the app replaces', () => {
    const config = nativeConfigOf(
      introspected({ permissions: blocked, allowBackup: 'false', bundleIdentifier: 'org.unfoldingword.app' }),
    );
    expect(permissionFindings(config)).toEqual([
      'The iOS bundle identifier is org.unfoldingword.app; the App Store record this app replaces (id 925570688) is com.unfoldingword.iosapp, and Apple never changes the bundle identifier of an existing record',
    ]);
  });

  it('refuses a permission a library manifest merges in unless it is admitted or blocked', () => {
    const library = [
      {
        manifest: 'node_modules/expo-network/android/src/main/AndroidManifest.xml',
        name: 'android.permission.ACCESS_NETWORK_STATE',
      },
      {
        manifest: 'node_modules/expo-network/android/src/main/AndroidManifest.xml',
        name: 'android.permission.ACCESS_WIFI_STATE',
      },
      {
        manifest: 'modules/example/android/src/main/AndroidManifest.xml',
        name: 'android.permission.CHANGE_WIFI_MULTICAST_STATE',
      },
    ];
    const config = nativeConfigOf(
      introspected({
        permissions: blocked.filter(
          (permission) => permission.name !== 'android.permission.ACCESS_WIFI_STATE',
        ),
        allowBackup: 'false',
      }),
      library,
    );
    expect(permissionFindings(config)).toEqual([
      'android.permission.ACCESS_WIFI_STATE is not in android.blockedPermissions, so a library manifest could still merge it in',
      'node_modules/expo-network/android/src/main/AndroidManifest.xml merges android.permission.ACCESS_WIFI_STATE into the app, and it is neither admitted in scripts/checks/android-permissions.ts nor in android.blockedPermissions',
      'modules/example/android/src/main/AndroidManifest.xml merges android.permission.CHANGE_WIFI_MULTICAST_STATE into the app, and it is neither admitted in scripts/checks/android-permissions.ts nor in android.blockedPermissions',
    ]);
    expect(
      permissionFindings(
        nativeConfigOf(introspected({ permissions: blocked, allowBackup: 'false' }), library.slice(0, 2)),
      ),
    ).toEqual([]);
  });

  it('requires every dangerous permission that is not admitted to be blocked, and none admitted to be', () => {
    const config = nativeConfigOf(
      introspected({
        permissions: [
          ...blocked.filter((permission) => permission.name !== 'android.permission.NEARBY_WIFI_DEVICES'),
          { name: 'android.permission.INTERNET', remove: true },
        ],
        allowBackup: 'false',
      }),
    );
    expect(permissionFindings(config)).toEqual([
      'android.permission.NEARBY_WIFI_DEVICES is not in android.blockedPermissions, so a library manifest could still merge it in',
      'android.permission.INTERNET is admitted and also in android.blockedPermissions; keep it in one list',
    ]);
  });

  it('refuses an application that names no data extraction rules, so Android 12 and later migrates the app to a new phone', () => {
    const config = nativeConfigOf(
      introspected({ permissions: blocked, allowBackup: 'false', dataExtractionRules: null }),
    );
    expect(permissionFindings(config)).toEqual([
      'android:dataExtractionRules is not @xml/data_extraction_rules, so Android 12 and later copies notes, groups and names to a new phone in a device-to-device transfer',
    ]);
  });
});

describe('the installer permission on the apk build and every other build', () => {
  it('asks every build but the apk build to block REQUEST_INSTALL_PACKAGES, and the apk build to request it unblocked', () => {
    const store = nativeConfigOf(introspected({ permissions: apkBlocked, allowBackup: 'false' }));
    expect(permissionFindings(store)).toEqual([
      `${installerPermission} is not in android.blockedPermissions, so a library manifest could still merge it in`,
    ]);
    const requestedOnStore = nativeConfigOf(
      introspected({ permissions: [{ name: installerPermission }, ...blocked], allowBackup: 'false' }),
    );
    expect(permissionFindings(requestedOnStore)).toEqual([
      `Android manifest requests ${installerPermission}, which is not on the admitted list in scripts/checks/android-permissions.ts`,
    ]);
    const blockedOnApk = nativeConfigOf(introspected({ permissions: blocked, allowBackup: 'false' }));
    expect(permissionFindings(blockedOnApk, true)).toEqual([
      `${installerPermission} is admitted and also in android.blockedPermissions; keep it in one list`,
    ]);
  });

  it('admits a library manifest that declares the installer permission only on the apk build', () => {
    const library = [
      {
        manifest: 'node_modules/example/android/src/main/AndroidManifest.xml',
        name: installerPermission,
      },
    ];
    const apk = nativeConfigOf(
      introspected({ permissions: [{ name: installerPermission }, ...apkBlocked], allowBackup: 'false' }),
      library,
    );
    expect(permissionFindings(apk, true)).toEqual([]);
    const unblockedStore = nativeConfigOf(
      introspected({ permissions: apkBlocked, allowBackup: 'false' }),
      library,
    );
    expect(permissionFindings(unblockedStore)).toEqual([
      `${installerPermission} is not in android.blockedPermissions, so a library manifest could still merge it in`,
      `node_modules/example/android/src/main/AndroidManifest.xml merges ${installerPermission} into the app, and it is neither admitted in scripts/checks/android-permissions.ts nor in android.blockedPermissions`,
    ]);
  });

  it('passes the CHANGE_NETWORK_STATE that react-native-tcp-socket declares only while it is blocked', () => {
    const library = [
      {
        manifest: 'node_modules/react-native-tcp-socket/android/src/main/AndroidManifest.xml',
        name: 'android.permission.CHANGE_NETWORK_STATE',
      },
    ];
    expect(
      permissionFindings(
        nativeConfigOf(introspected({ permissions: blocked, allowBackup: 'false' }), library),
      ),
    ).toEqual([]);
    const unblocked = nativeConfigOf(
      introspected({
        permissions: blocked.filter(
          (permission) => permission.name !== 'android.permission.CHANGE_NETWORK_STATE',
        ),
        allowBackup: 'false',
      }),
      library,
    );
    expect(permissionFindings(unblocked)).toEqual([
      'android.permission.CHANGE_NETWORK_STATE is not in android.blockedPermissions, so a library manifest could still merge it in',
      'node_modules/react-native-tcp-socket/android/src/main/AndroidManifest.xml merges android.permission.CHANGE_NETWORK_STATE into the app, and it is neither admitted in scripts/checks/android-permissions.ts nor in android.blockedPermissions',
    ]);
  });
});

describe('radioFindings and easFindings', () => {
  const radio = {
    NSLocalNetworkUsageDescription: 'The app looks for the other phone only while you send or receive.',
    NSBonjourServices: ['_uwapp._tcp'],
  };

  it('admits the local network prompt, the one Bonjour service and the installer only on the apk build', () => {
    const store = nativeConfigOf(
      introspected({ permissions: blocked, allowBackup: 'false', infoPlist: radio }),
    );
    expect(permissionFindings(store)).toEqual([]);
    expect(radioFindings(store, false)).toEqual([]);
    const apk = nativeConfigOf(
      introspected({
        permissions: [{ name: installerPermission }, ...apkBlocked],
        allowBackup: 'false',
        infoPlist: radio,
      }),
    );
    expect(permissionFindings(apk, true)).toEqual([]);
    expect(radioFindings(apk, true)).toEqual([]);
    expect(radioFindings(apk, false)).toEqual([
      'Android manifest requests android.permission.REQUEST_INSTALL_PACKAGES outside the apk build; Google Play restricts it (SH-2)',
    ]);
    expect(radioFindings(store, true)).toEqual([
      'The apk build does not request android.permission.REQUEST_INSTALL_PACKAGES, so the received app cannot be installed (SH-2)',
    ]);
  });

  it('refuses a missing local network prompt and any other Bonjour service', () => {
    const config = nativeConfigOf(
      introspected({
        permissions: blocked,
        allowBackup: 'false',
        infoPlist: { NSBonjourServices: ['_http._tcp'] },
      }),
    );
    expect(radioFindings(config, false)).toEqual([
      'Info.plist has no NSLocalNetworkUsageDescription, so iOS cannot ask for local network access when a transfer starts (SH-1)',
      'Info.plist NSBonjourServices is ["_http._tcp"]; only _uwapp._tcp is admitted (SH-1)',
    ]);
  });

  it('asks the apk profile to set the installer flag and no store profile to set it', () => {
    expect(
      easFindings({
        build: {
          base: { env: { EXPO_NO_TELEMETRY: '1' } },
          preview: { extends: 'base' },
          apk: { extends: 'preview', env: { [installerFlag]: '1' } },
          production: { extends: 'base', distribution: 'store' },
        },
      }),
    ).toEqual([]);
    expect(
      easFindings({
        build: {
          base: { env: { [installerFlag]: '1' } },
          production: { extends: 'base', distribution: 'store' },
        },
      }),
    ).toEqual([
      `eas.json profile apk does not set ${installerFlag}=1 (SH-2)`,
      `eas.json store profile production sets ${installerFlag}; the Play build never declares ${installerPermission}`,
    ]);
  });
});
