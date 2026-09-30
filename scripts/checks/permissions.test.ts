import { describe, expect, it } from 'vitest';
import { androidRefused } from './android-permissions.ts';
import { nativeConfigOf, permissionFindings } from './permissions.ts';

function introspected(options: {
  permissions: { name: string; remove?: boolean }[];
  allowBackup?: string;
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
                  $: { 'android:allowBackup': options.allowBackup },
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

const blocked = androidRefused.map((name) => ({ name, remove: true }));

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
        permissions: [{ name: 'android.permission.WAKE_LOCK' }, ...blocked],
        allowBackup: 'false',
        infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } },
        entitlements: { 'com.apple.developer.icloud-container-identifiers': [] },
      }),
    );
    expect(permissionFindings(config)).toEqual([
      'Android manifest requests android.permission.WAKE_LOCK, which is not on the admitted list in scripts/checks/android-permissions.ts',
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
});
