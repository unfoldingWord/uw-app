import { describe, expect, it } from 'vitest';
import { androidRefused, nativeConfigOf, permissionFindings } from './permissions.ts';

function introspected(options: {
  permissions: { name: string; remove?: boolean }[];
  allowBackup?: string;
  infoPlist?: Record<string, unknown>;
  entitlements?: Record<string, unknown>;
}): unknown {
  return {
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
              application: [{ $: { 'android:allowBackup': options.allowBackup } }],
            },
          },
        },
        ios: {
          infoPlist: { ITSAppUsesNonExemptEncryption: false, ...options.infoPlist },
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
        permissions: [{ name: 'android.permission.BLUETOOTH_SCAN' }, ...blocked],
        allowBackup: 'false',
        infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } },
        entitlements: { 'com.apple.developer.icloud-container-identifiers': [] },
      }),
    );
    expect(permissionFindings(config)).toEqual([
      'Android manifest requests android.permission.BLUETOOTH_SCAN, which is not on the admitted list in scripts/checks/permissions.ts',
      'Info.plist allows arbitrary loads; the Http port only reaches allowlisted hosts over HTTPS',
      'iOS entitlements carry com.apple.developer.icloud-container-identifiers, which nothing in the PRD needs',
    ]);
  });
});
