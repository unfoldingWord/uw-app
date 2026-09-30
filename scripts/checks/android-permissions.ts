const permission = (name: string): string => `android.permission.${name}`;

const androidAdmitted: Readonly<Record<string, string>> = {
  [permission('INTERNET')]: 'The Http port reaches the catalog and the partner feed (PRD 8, PA-6)',
  [permission('ACCESS_NETWORK_STATE')]: "The Http adapter's offline signal through expo-network",
  [permission('VIBRATE')]: 'The light haptic on press through expo-haptics',
  [permission('MODIFY_AUDIO_SETTINGS')]: 'Story and passage audio through expo-audio (ST-4)',
  [permission('WAKE_LOCK')]:
    'A normal install-time permission a Maven dependency of the native modules merges in; it shows no prompt and reads nothing, and the manifest-merger report device/ci/apk-report.sh prints names the dependency',
};

export const installerPermission = permission('REQUEST_INSTALL_PACKAGES');

const androidAdmittedOnApk: Readonly<Record<string, string>> = {
  [installerPermission]:
    'The apk build hands a received app package to the system installer (SH-2); Google Play restricts it, so every other build blocks it',
};

export const androidDangerous: readonly string[] = [
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
].map(permission);

const androidAlsoRefused: readonly string[] = [
  'ACCESS_WIFI_STATE',
  'SYSTEM_ALERT_WINDOW',
  'FOREGROUND_SERVICE',
  'FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'CHANGE_NETWORK_STATE',
].map(permission);

export const androidRefused: readonly string[] = [...androidDangerous, ...androidAlsoRefused].filter(
  (name) => !(name in androidAdmitted),
);

export function isAdmitted(name: string, installerBuild = false): boolean {
  return name in androidAdmitted || (installerBuild && name in androidAdmittedOnApk);
}

export function androidBlockedOn(installerBuild: boolean): readonly string[] {
  return installerBuild ? androidRefused : [...androidRefused, ...Object.keys(androidAdmittedOnApk)];
}

export type LibraryPermission = { manifest: string; name: string };

const commentPattern = /<!--[\s\S]*?-->/g;

const permissionElement = /<uses-permission(?:-sdk-23|-sdk-m)?\b([^>]*)>/g;

const attributePattern = /([\w:.-]+)\s*=\s*"([^"]*)"/g;

export function permissionsInManifest(xml: string): string[] {
  const names: string[] = [];
  for (const element of xml.replace(commentPattern, '').matchAll(permissionElement)) {
    const attributes = new Map(
      [...(element[1] ?? '').matchAll(attributePattern)].map((match) => [match[1], match[2]]),
    );
    const name = attributes.get('android:name');
    if (name !== undefined && attributes.get('tools:node') !== 'remove') {
      names.push(name);
    }
  }
  return names;
}

export function libraryPermissionFindings(
  library: readonly LibraryPermission[],
  blocked: ReadonlySet<string>,
  installerBuild = false,
): string[] {
  const findings: string[] = [];
  for (const entry of library) {
    if (!isAdmitted(entry.name, installerBuild) && !blocked.has(entry.name)) {
      findings.push(
        `${entry.manifest} merges ${entry.name} into the app, and it is neither admitted in scripts/checks/android-permissions.ts nor in android.blockedPermissions`,
      );
    }
  }
  return findings;
}
