import { describe, expect, it } from 'vitest';
import { apkPermissionFindings, apkPermissionsOf } from './apk-permissions.ts';

const dump = [
  'package: org.unfoldingword.app',
  'permission: org.unfoldingword.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
  "uses-permission: name='android.permission.INTERNET'",
  "uses-permission: name='android.permission.ACCESS_NETWORK_STATE'",
  "uses-permission: name='android.permission.VIBRATE'",
  "uses-permission: name='android.permission.MODIFY_AUDIO_SETTINGS'",
  "uses-permission: name='android.permission.WAKE_LOCK'",
  "uses-permission: name='org.unfoldingword.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'",
].join('\n');

describe('apkPermissionsOf (aapt2 dump permissions)', () => {
  it('reads the package, the permissions the app declares and every permission it uses', () => {
    expect(
      apkPermissionsOf(
        `${dump}\nuses-permission: name='android.permission.WRITE_EXTERNAL_STORAGE' maxSdkVersion='18'\nuses-permission-sdk-23: name='android.permission.CAMERA'\n`,
      ),
    ).toEqual({
      package: 'org.unfoldingword.app',
      declared: ['org.unfoldingword.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'],
      used: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.VIBRATE',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.WAKE_LOCK',
        'org.unfoldingword.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.CAMERA',
      ],
    });
  });
});

describe('apkPermissionFindings (issue #26)', () => {
  it('passes the admitted permissions and the app-private receiver permission the app declares', () => {
    expect(apkPermissionFindings(apkPermissionsOf(dump), false)).toEqual([]);
  });

  it('fails on a blocked permission that reached the APK and on one neither admitted nor blocked', () => {
    const merged = [
      dump,
      "uses-permission: name='android.permission.ACCESS_FINE_LOCATION'",
      "uses-permission: name='android.permission.REQUEST_INSTALL_PACKAGES'",
      "uses-permission: name='com.google.android.gms.permission.AD_ID'",
      "uses-permission: name='com.other.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'",
    ].join('\n');
    expect(apkPermissionFindings(apkPermissionsOf(merged), false)).toEqual([
      'android.permission.ACCESS_FINE_LOCATION is in the APK although android.blockedPermissions removes it; a Maven dependency merged it past the block',
      'android.permission.REQUEST_INSTALL_PACKAGES is in the APK although android.blockedPermissions removes it; a Maven dependency merged it past the block',
      'com.google.android.gms.permission.AD_ID is in the APK and neither admitted in scripts/checks/android-permissions.ts nor blocked in app.config.ts',
      'com.other.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION is in the APK and neither admitted in scripts/checks/android-permissions.ts nor blocked in app.config.ts',
    ]);
  });

  it('admits the installer permission on the apk build only', () => {
    const merged = `${dump}\nuses-permission: name='android.permission.REQUEST_INSTALL_PACKAGES'`;
    expect(apkPermissionFindings(apkPermissionsOf(merged), true)).toEqual([]);
  });

  it('fails when the dump names no package, so an empty or broken dump never passes', () => {
    expect(apkPermissionFindings(apkPermissionsOf(''), false)).toEqual([
      'the aapt2 permissions dump names no package; it is empty or not an aapt2 dump',
    ]);
  });
});
