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

export type IntentData = { scheme: string | undefined; mimeType: string | undefined };

export type IntentFilter = { actions: readonly string[]; data: readonly IntentData[] };

const appScheme = 'unfoldingword';

const appStoreRecord = { id: '925570688', bundleIdentifier: 'com.unfoldingword.iosapp' } as const;

const importedMimeTypes: readonly string[] = [
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
];

const admittedIntentSchemes: readonly string[] = [appScheme, 'content'];

const admittedDocumentTypes: readonly string[] = ['public.zip-archive'];

const viewAction = 'android.intent.action.VIEW';

export type NativeConfig = {
  androidPermissions: readonly ManifestPermission[];
  androidAllowBackup: string | undefined;
  androidIntentFilters: readonly IntentFilter[];
  infoPlist: Readonly<Record<string, unknown>>;
  entitlements: Readonly<Record<string, unknown>>;
  iosBundleIdentifier: string | undefined;
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
  const bundleIdentifier = record(record(introspected).ios).bundleIdentifier;
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
  const applicationNode = list(manifest.application)[0];
  const application = attributes(applicationNode);
  const allowBackup = application['android:allowBackup'];
  const filters = list(record(applicationNode).activity)
    .flatMap((activity) => list(record(activity)['intent-filter']))
    .map((filter) => ({
      actions: list(record(filter).action).map((node) => String(attributes(node)['android:name'])),
      data: list(record(filter).data).map((node) => {
        const named = attributes(node);
        const scheme = named['android:scheme'];
        const mimeType = named['android:mimeType'];
        return {
          scheme: typeof scheme === 'string' ? scheme : undefined,
          mimeType: typeof mimeType === 'string' ? mimeType : undefined,
        };
      }),
    }));
  return {
    androidPermissions: permissions,
    androidAllowBackup: typeof allowBackup === 'string' ? allowBackup : undefined,
    androidIntentFilters: filters,
    infoPlist: record(ios.infoPlist),
    entitlements: record(ios.entitlements),
    iosBundleIdentifier: typeof bundleIdentifier === 'string' ? bundleIdentifier : undefined,
  };
}

const usageDescription = /^NS\w+UsageDescription$/;

function documentTypesOf(infoPlist: Readonly<Record<string, unknown>>): string[] {
  return list(infoPlist.CFBundleDocumentTypes).flatMap((type) =>
    list(record(type).LSItemContentTypes).map(String),
  );
}

function importFindings(config: NativeConfig): string[] {
  const findings: string[] = [];
  for (const filter of config.androidIntentFilters) {
    for (const data of filter.data) {
      if (data.scheme === undefined || !admittedIntentSchemes.includes(data.scheme)) {
        findings.push(
          `An Android intent filter admits the scheme ${data.scheme ?? '(any)'}; only ${admittedIntentSchemes.join(' and ')} are admitted, and a file URI would need storage permission`,
        );
      }
    }
  }
  const offered = new Set(
    config.androidIntentFilters
      .filter((filter) => filter.actions.includes(viewAction))
      .flatMap((filter) => filter.data)
      .filter((data) => data.scheme === 'content')
      .flatMap((data) => (data.mimeType === undefined ? [] : [data.mimeType])),
  );
  for (const mimeType of importedMimeTypes) {
    if (!offered.has(mimeType)) {
      findings.push(
        `Android does not offer the app to open ${mimeType} over content, so a burrito cannot be opened from another app (SH-3)`,
      );
    }
  }
  const documentTypes = documentTypesOf(config.infoPlist);
  for (const type of documentTypes) {
    if (!admittedDocumentTypes.includes(type)) {
      findings.push(
        `Info.plist declares the document type ${type}; only ${admittedDocumentTypes.join(', ')} is admitted`,
      );
    }
  }
  if (!documentTypes.includes('public.zip-archive')) {
    findings.push(
      'Info.plist declares no document type for public.zip-archive, so iOS never offers the app a burrito (SH-3)',
    );
  }
  if (config.infoPlist.LSSupportsOpeningDocumentsInPlace !== false) {
    findings.push(
      'Info.plist does not set LSSupportsOpeningDocumentsInPlace false; an opened burrito must be copied, never edited in place',
    );
  }
  if (config.infoPlist.UIFileSharingEnabled === true) {
    findings.push(
      "Info.plist sets UIFileSharingEnabled, which shows the app's files in the Files app and Finder",
    );
  }
  return findings;
}

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
  if (config.iosBundleIdentifier !== appStoreRecord.bundleIdentifier) {
    findings.push(
      `The iOS bundle identifier is ${config.iosBundleIdentifier ?? '(none)'}; the App Store record this app replaces (id ${appStoreRecord.id}) is ${appStoreRecord.bundleIdentifier}, and Apple never changes the bundle identifier of an existing record`,
    );
  }
  return [...findings, ...importFindings(config)];
}
