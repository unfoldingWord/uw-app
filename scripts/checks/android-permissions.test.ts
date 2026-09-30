import { describe, expect, it } from 'vitest';
import {
  androidDangerous,
  androidRefused,
  isAdmitted,
  permissionsInManifest,
} from './android-permissions.ts';

describe('permissionsInManifest', () => {
  it('reads every uses-permission element a library declares, and skips removed and commented ones', () => {
    const xml = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
  <uses-permission-sdk-23 android:name="android.permission.NEARBY_WIFI_DEVICES"/>
  <uses-permission
      android:name="android.permission.WRITE_EXTERNAL_STORAGE"
      android:maxSdkVersion="28" />
  <uses-permission android:name="android.permission.CAMERA" tools:node="remove" />
  <!-- <uses-permission android:name="android.permission.READ_CONTACTS" /> -->
</manifest>`;
    expect(permissionsInManifest(xml)).toEqual([
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.NEARBY_WIFI_DEVICES',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ]);
  });
});

describe('androidRefused', () => {
  it('holds every dangerous permission that is not admitted, and ACCESS_WIFI_STATE', () => {
    for (const name of androidDangerous) {
      expect(androidRefused.includes(name) || isAdmitted(name)).toBe(true);
    }
    expect(androidRefused).toContain('android.permission.ACCESS_WIFI_STATE');
  });
});
