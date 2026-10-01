import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { allowedHosts } from '@lib/network';
import type { Check } from './check.ts';
import {
  admittedSockets,
  dependencyFindings,
  documentedPackages,
  type LockedPackage,
} from './dependencies.ts';
import { scanProductionPackages, type LockEntry } from './socket-scan.ts';
import { socketFindings } from './sockets.ts';
import { socketsAdmitted } from './sockets-admitted.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

type PackageJson = { dependencies?: Record<string, string> };
type PackageLock = { packages?: Record<string, LockEntry> };

const scannedRoots = ['src', 'app', 'sim', 'scripts'];

const sourceFile = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function sourcesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourcesUnder(path);
    }
    return sourceFile.test(entry.name) ? [path] : [];
  });
}

function importersOf(names: readonly string[]): Record<string, string[]> {
  const files = scannedRoots.flatMap((root) => sourcesUnder(join(repositoryRoot, root)));
  const found: Record<string, string[]> = {};
  for (const name of names) {
    const pattern = new RegExp(
      `(from|import|require\\()\\s*['"]${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}['"/]`,
    );
    found[name] = files
      .filter((file) => pattern.test(readFileSync(file, 'utf8')))
      .map((file) => relative(repositoryRoot, file).split('\\').join('/'));
  }
  return found;
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(repositoryRoot, file), 'utf8')) as T;
}

const check: Check = {
  name: 'network',
  rule: 'No runtime dependency is a known network client or reports to a third party, every production package whose code can open a connection is admitted by name with a reason, every runtime dependency is recorded in docs/dependencies.md, and the Http port admits only the allowlisted hosts',
  run() {
    const runtime = Object.keys(readJson<PackageJson>('package.json').dependencies ?? {});
    const lock = readJson<PackageLock>('package-lock.json').packages ?? {};
    const locked: LockedPackage[] = Object.entries(lock)
      .filter(([path]) => path !== '')
      .map(([path, entry]) => ({ name: path.replace(/^.*node_modules\//, ''), dev: entry.dev === true }));
    const documented = documentedPackages(
      readFileSync(join(repositoryRoot, 'docs', 'dependencies.md'), 'utf8'),
    );
    const importers = importersOf(Object.keys(admittedSockets));
    const scan = scanProductionPackages(repositoryRoot, lock);
    const findings = [
      ...dependencyFindings({ runtime, locked, documented, importers }),
      ...socketFindings(scan.found, socketsAdmitted, scan.present),
    ];
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    return {
      status: 'pass',
      summary: `${runtime.length} runtime dependencies recorded, none opens a connection or reports out but the transfer socket in ${Object.values(admittedSockets).join(', ')}; ${scan.present.size} production packages in node_modules scanned (${scan.scannedFiles} files), ${Object.keys(scan.found).length} can open a connection and each is admitted with a reason; hosts ${allowedHosts.join(', ')}`,
    };
  },
};

export default check;
