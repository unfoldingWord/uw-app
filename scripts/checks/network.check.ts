import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allowedHosts } from '@lib/network';
import type { Check } from './check.ts';
import { dependencyFindings, documentedPackages, type LockedPackage } from './dependencies.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

type PackageJson = { dependencies?: Record<string, string> };
type PackageLock = { packages?: Record<string, { dev?: boolean }> };

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(repositoryRoot, file), 'utf8')) as T;
}

const check: Check = {
  name: 'network',
  rule: 'No runtime dependency opens a connection itself or reports to a third party, every runtime dependency is recorded in docs/dependencies.md, and the Http port admits only the allowlisted hosts',
  run() {
    const runtime = Object.keys(readJson<PackageJson>('package.json').dependencies ?? {});
    const locked: LockedPackage[] = Object.entries(readJson<PackageLock>('package-lock.json').packages ?? {})
      .filter(([path]) => path !== '')
      .map(([path, entry]) => ({ name: path.replace(/^.*node_modules\//, ''), dev: entry.dev === true }));
    const documented = documentedPackages(
      readFileSync(join(repositoryRoot, 'docs', 'dependencies.md'), 'utf8'),
    );
    const findings = dependencyFindings({ runtime, locked, documented });
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    return {
      status: 'pass',
      summary: `${runtime.length} runtime dependencies recorded, none opens a connection or reports out; ${locked.filter((item) => !item.dev).length} locked production packages scanned; hosts ${allowedHosts.join(', ')}`,
    };
  },
};

export default check;
