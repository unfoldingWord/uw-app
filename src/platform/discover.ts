import type { Migration } from '@lib/ports';

export type ModuleContext = {
  keys(): string[];
  (id: string): unknown;
};

const migrationFile = /(?:^|\/)(\d{4}-[a-z0-9-]+)\.ts$/;

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

function byCodePoint(left: Migration, right: Migration): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function collectMigrations(contexts: readonly ModuleContext[]): readonly Migration[] {
  const found: Migration[] = [];
  for (const context of contexts) {
    for (const key of context.keys()) {
      const name = migrationFile.exec(key)?.[1];
      if (name === undefined) {
        continue;
      }
      const loaded = context(key);
      const migration =
        typeof loaded === 'object' && loaded !== null && 'default' in loaded ? loaded.default : undefined;
      if (!isMigration(migration)) {
        throw new Error(`${key} must default-export a Migration`);
      }
      if (migration.id !== name) {
        throw new Error(`${key} must declare the id ${name}`);
      }
      found.push(migration);
    }
  }
  const ids = found.map((migration) => migration.id);
  const repeated = ids.find((id, index) => ids.indexOf(id) !== index);
  if (repeated !== undefined) {
    throw new Error(`migration ${repeated} is declared twice`);
  }
  return found.sort(byCodePoint);
}
