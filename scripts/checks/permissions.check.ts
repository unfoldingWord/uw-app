import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { androidRefused } from './android-permissions.ts';
import { dataExtractionFindings } from './backup-rules.ts';
import type { Check } from './check.ts';
import { scanLibraryManifests } from './library-manifests.ts';
import { nativeConfigOf, permissionFindings } from './permissions.ts';

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

const check: Check = {
  name: 'permissions',
  rule: 'The app manifest and Info.plist that prebuild would write ask for no permission, usage description, background mode or entitlement the PRD does not admit, every dangerous permission not admitted is blocked, every permission a library manifest in node_modules or modules/ would merge in is admitted or blocked, and Android backs nothing up and migrates nothing to a new phone (PRD sections 9 and 12); iOS keeps the existing App Store bundle identifier; a burrito .zip opens the app over content URIs and an iOS document type only (SH-3)',
  run() {
    const result = spawnSync(
      join(repositoryRoot, 'node_modules', '.bin', 'expo'),
      ['config', '--type', 'introspect', '--json'],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, EXPO_OFFLINE: '1', CI: '1', EXPO_NO_TELEMETRY: '1' },
      },
    );
    if (result.status !== 0) {
      return { status: 'fail', findings: [`expo config --type introspect failed: ${result.stderr.trim()}`] };
    }
    const scan = scanLibraryManifests(repositoryRoot);
    if (scan.manifests === 0) {
      return {
        status: 'fail',
        findings: ['No library AndroidManifest.xml was found under node_modules; run npm ci first'],
      };
    }
    const config = nativeConfigOf(JSON.parse(result.stdout), scan.permissions);
    const findings = [
      ...permissionFindings(config),
      ...dataExtractionFindings(readFileSync(dataExtractionRulesFile, 'utf8')),
    ];
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    const requested = config.androidPermissions.filter((permission) => !permission.removed);
    const merged = [...new Set(scan.permissions.map((permission) => permission.name))].sort();
    return {
      status: 'pass',
      summary: `App manifest requests ${requested.map((permission) => shortName(permission.name)).join(', ')}; ${scan.manifests} library manifests declare ${merged.map(shortName).join(', ')}, each admitted or blocked; ${androidRefused.length} refused permissions blocked; allowBackup false; dataExtractionRules names plugins/data-extraction-rules/data_extraction_rules.xml, which excludes every domain from cloud-backup and device-transfer; no iOS usage description, background mode or entitlement; iOS bundle identifier com.unfoldingword.iosapp; a .zip opens the app over content URIs (Android) and public.zip-archive (iOS). Not observed: permissions from Maven dependencies outside node_modules, which only a Gradle merge shows`,
    };
  },
};

export default check;
