import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { socketSignals, type SocketSignal } from './sockets.ts';

const scannedFile = /\.(?:js|cjs|mjs|jsx|ts|tsx|java|kt|swift|m|mm|h|c|cc|cpp)$/;

const skippedDirectories: ReadonlySet<string> = new Set(['node_modules', '__tests__', '__mocks__']);

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) || entry.name.startsWith('.') ? [] : filesUnder(path);
    }
    return entry.isFile() && scannedFile.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

export type LockEntry = { dev?: boolean };

type SocketScan = {
  present: Set<string>;
  scannedFiles: number;
  found: Record<string, SocketSignal[]>;
};

function packageName(lockPath: string): string {
  return lockPath.replace(/^.*node_modules\//, '');
}

export function scanProductionPackages(
  repositoryRoot: string,
  lock: Readonly<Record<string, LockEntry>>,
): SocketScan {
  const present = new Set<string>();
  const signalsOf = new Map<string, Set<SocketSignal>>();
  let scannedFiles = 0;
  for (const [lockPath, entry] of Object.entries(lock)) {
    const root = join(repositoryRoot, lockPath);
    if (lockPath === '' || entry.dev === true || !existsSync(root)) {
      continue;
    }
    const name = packageName(lockPath);
    present.add(name);
    for (const file of filesUnder(root)) {
      scannedFiles += 1;
      for (const signal of socketSignals(readFileSync(file, 'utf8'))) {
        signalsOf.set(name, (signalsOf.get(name) ?? new Set()).add(signal));
      }
    }
  }
  const found: Record<string, SocketSignal[]> = {};
  for (const [name, signals] of [...signalsOf].sort(([a], [b]) => a.localeCompare(b))) {
    found[name] = [...signals].sort();
  }
  return { present, scannedFiles, found };
}
