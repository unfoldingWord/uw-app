import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import type { Check } from './check.ts';
import { androidRefused, nativeConfigOf, permissionFindings } from './permissions.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

const check: Check = {
  name: 'permissions',
  rule: 'The native projects prebuild would write ask for no permission, usage description, background mode or entitlement the PRD does not admit, and Android backs nothing up (PRD sections 9 and 12); a burrito .zip opens the app over content URIs and an iOS document type only (SH-3)',
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
    const config = nativeConfigOf(JSON.parse(result.stdout));
    const findings = permissionFindings(config);
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    const requested = config.androidPermissions.filter((permission) => !permission.removed);
    return {
      status: 'pass',
      summary: `Android requests ${requested.map((permission) => permission.name.replace('android.permission.', '')).join(', ')}; ${androidRefused.length} refused permissions blocked; allowBackup false; no iOS usage description, background mode or entitlement; a .zip opens the app over content URIs (Android) and public.zip-archive (iOS)`,
    };
  },
};

export default check;
