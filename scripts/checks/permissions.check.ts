import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { androidRefused, type LibraryPermission } from './android-permissions.ts';
import { dataExtractionFindings } from './backup-rules.ts';
import type { Check } from './check.ts';
import { scanLibraryManifests } from './library-manifests.ts';
import {
  easFindings,
  installerFlag,
  installerProfile,
  nativeConfigOf,
  permissionFindings,
  radioFindings,
  type NativeConfig,
} from './permissions.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

const dataExtractionRulesFile = join(
  repositoryRoot,
  'plugins',
  'data-extraction-rules',
  'data_extraction_rules.xml',
);

function shortName(name: string): string {
  return name.replace('android.permission.', '');
}

type Introspected = { ok: true; config: NativeConfig } | { ok: false; finding: string };

function introspect(installerBuild: boolean, library: readonly LibraryPermission[]): Introspected {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries({ ...process.env, EXPO_OFFLINE: '1', CI: '1', EXPO_NO_TELEMETRY: '1' }).filter(
      ([name]) => name !== installerFlag,
    ),
  );
  const result = spawnSync(
    join(repositoryRoot, 'node_modules', '.bin', 'expo'),
    ['config', '--type', 'introspect', '--json'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: installerBuild ? { ...env, [installerFlag]: '1' } : env,
    },
  );
  if (result.status !== 0) {
    return { ok: false, finding: `expo config --type introspect failed: ${result.stderr.trim()}` };
  }
  return { ok: true, config: nativeConfigOf(JSON.parse(result.stdout), library) };
}

const check: Check = {
  name: 'permissions',
  rule: 'The app manifest and Info.plist that prebuild would write ask for no permission, usage description, background mode or entitlement the PRD does not admit, every dangerous permission not admitted is blocked, every permission a library manifest in node_modules or modules/ would merge in is admitted or blocked, and Android backs nothing up and migrates nothing to a new phone (PRD sections 9 and 12); iOS keeps the existing App Store bundle identifier; a burrito .zip opens the app over content URIs and an iOS document type only (SH-3); iOS asks for local network access with the one Bonjour service the transfer uses, and only the apk build may install a received app, every other build blocks it (SH-1, SH-2)',
  run() {
    const scan = scanLibraryManifests(repositoryRoot);
    if (scan.manifests === 0) {
      return {
        status: 'fail',
        findings: ['No library AndroidManifest.xml was found under node_modules; run npm ci first'],
      };
    }
    const store = introspect(false, scan.permissions);
    const installer = introspect(true, scan.permissions);
    if (!store.ok || !installer.ok) {
      return {
        status: 'fail',
        findings: [store, installer].flatMap((item) => (item.ok ? [] : [item.finding])),
      };
    }
    const findings = [
      ...permissionFindings(store.config),
      ...radioFindings(store.config, false),
      ...permissionFindings(installer.config, true).map((finding) => `${installerProfile} build: ${finding}`),
      ...radioFindings(installer.config, true),
      ...easFindings(JSON.parse(readFileSync(join(repositoryRoot, 'eas.json'), 'utf8'))),
      ...dataExtractionFindings(readFileSync(dataExtractionRulesFile, 'utf8')),
    ];
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    const requested = store.config.androidPermissions.filter((permission) => !permission.removed);
    const merged = [...new Set(scan.permissions.map((permission) => permission.name))].sort();
    return {
      status: 'pass',
      summary: `App manifest requests ${requested.map((permission) => shortName(permission.name)).join(', ')}, and the ${installerProfile} build adds REQUEST_INSTALL_PACKAGES, which every other build blocks; ${scan.manifests} library manifests declare ${merged.map(shortName).join(', ')}, each admitted or blocked; ${androidRefused.length} refused permissions blocked; allowBackup false; dataExtractionRules names plugins/data-extraction-rules/data_extraction_rules.xml, which excludes every domain from cloud-backup and device-transfer; iOS asks only for local network access (_uwapp._tcp), with no background mode or entitlement; iOS bundle identifier com.unfoldingword.iosapp; a .zip opens the app over content URIs (Android) and public.zip-archive (iOS). Not observed here: permissions from Maven dependencies outside node_modules, which only a Gradle merge shows; the device CI diffs the built APK against the admitted list (scripts/apk-permissions.ts)`,
    };
  },
};

export default check;
