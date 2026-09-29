import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Migration } from '@lib/ports';

const repositoryRoot = join(import.meta.dirname, '..');
const migrationFile = /^\d{4}-[a-z0-9-]+\.ts$/;

function migrationDirectories(): string[] {
  const features = join(repositoryRoot, 'src', 'features');
  const featureDirectories = existsSync(features)
    ? readdirSync(features, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(features, entry.name, 'migrations'))
    : [];
  return [join(repositoryRoot, 'migrations'), ...featureDirectories].filter((directory) =>
    existsSync(directory),
  );
}

function isMigration(value: unknown): value is Migration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.statements) &&
    candidate.statements.every((statement) => typeof statement === 'string')
  );
}

async function discoverMigrations(): Promise<readonly Migration[]> {
  const found: Migration[] = [];
  for (const directory of migrationDirectories()) {
    for (const file of readdirSync(directory).filter((name) => migrationFile.test(name))) {
      const loaded: { default?: unknown } = await import(pathToFileURL(join(directory, file)).href);
      if (!isMigration(loaded.default)) {
        throw new Error(`${join(directory, file)} must default-export a Migration`);
      }
      if (`${loaded.default.id}.ts` !== file) {
        throw new Error(`${file} must declare the id ${file.replace(/\.ts$/, '')}`);
      }
      found.push(loaded.default);
    }
  }
  const ids = found.map((migration) => migration.id);
  const repeated = ids.find((id, index) => ids.indexOf(id) !== index);
  if (repeated !== undefined) {
    throw new Error(`migration ${repeated} is declared twice`);
  }
  return found.sort((left, right) => left.id.localeCompare(right.id));
}

export const migrations = await discoverMigrations();
