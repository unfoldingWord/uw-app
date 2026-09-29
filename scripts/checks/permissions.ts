const androidAdmitted: readonly string[] = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.VIBRATE',
  'android.permission.MODIFY_AUDIO_SETTINGS',
];

export const androidRefused: readonly string[] = [
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

const iosAdmittedUsageDescriptions: readonly string[] = [];

const iosAdmittedEntitlements: readonly string[] = [];

export type ManifestPermission = { name: string; removed: boolean };

export type NativeConfig = {
  androidPermissions: readonly ManifestPermission[];
  androidAllowBackup: string | undefined;
  infoPlist: Readonly<Record<string, unknown>>;
  entitlements: Readonly<Record<string, unknown>>;
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function attributes(node: unknown): Record<string, unknown> {
  return record(record(node).$);
}

export function nativeConfigOf(introspected: unknown): NativeConfig {
  const modResults = record(record(record(introspected)._internal).modResults);
  const android = record(modResults.android);
  const ios = record(modResults.ios);
  const manifest = record(record(android.manifest).manifest);
  const permissions = [...list(manifest['uses-permission']), ...list(manifest['uses-permission-sdk-23'])].map(
    (node) => {
      const named = attributes(node);
      return { name: String(named['android:name']), removed: named['tools:node'] === 'remove' };
    },
  );
  const application = attributes(list(manifest.application)[0]);
  const allowBackup = application['android:allowBackup'];
  return {
    androidPermissions: permissions,
    androidAllowBackup: typeof allowBackup === 'string' ? allowBackup : undefined,
    infoPlist: record(ios.infoPlist),
    entitlements: record(ios.entitlements),
  };
}

const usageDescription = /^NS\w+UsageDescription$/;

export function permissionFindings(config: NativeConfig): string[] {
  const findings: string[] = [];
  const requested = config.androidPermissions.filter((permission) => !permission.removed);
  const removed = new Set(config.androidPermissions.filter((item) => item.removed).map((item) => item.name));
  for (const permission of requested) {
    if (androidRefused.includes(permission.name)) {
      findings.push(`Android manifest requests ${permission.name}, which PRD sections 9 and 12 refuse`);
    } else if (!androidAdmitted.includes(permission.name)) {
      findings.push(
        `Android manifest requests ${permission.name}, which is not on the admitted list in scripts/checks/permissions.ts`,
      );
    }
  }
  for (const name of androidRefused) {
    if (!removed.has(name)) {
      findings.push(
        `${name} is not in android.blockedPermissions, so a library manifest could still merge it in`,
      );
    }
  }
  if (config.androidAllowBackup !== 'false') {
    findings.push('android:allowBackup is not "false", so Android backs up notes, groups and names');
  }
  for (const key of Object.keys(config.infoPlist)) {
    if (usageDescription.test(key) && !iosAdmittedUsageDescriptions.includes(key)) {
      findings.push(`Info.plist carries ${key}, a permission the PRD does not admit`);
    }
  }
  if (list(config.infoPlist.UIBackgroundModes).length > 0) {
    findings.push(
      `Info.plist asks for background modes ${list(config.infoPlist.UIBackgroundModes).join(', ')}`,
    );
  }
  if (record(config.infoPlist.NSAppTransportSecurity).NSAllowsArbitraryLoads === true) {
    findings.push(
      'Info.plist allows arbitrary loads; the Http port only reaches allowlisted hosts over HTTPS',
    );
  }
  if (config.infoPlist.ITSAppUsesNonExemptEncryption !== false) {
    findings.push('Info.plist does not declare ITSAppUsesNonExemptEncryption false');
  }
  for (const key of Object.keys(config.entitlements)) {
    if (!iosAdmittedEntitlements.includes(key)) {
      findings.push(`iOS entitlements carry ${key}, which nothing in the PRD needs`);
    }
  }
  return findings;
}
