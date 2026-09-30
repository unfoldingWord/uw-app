import { compareText } from './order';
import type { Db, Migration } from './ports';

export const migrationsTable = 'schema_migrations';

export type MigrationOutcome =
  { ok: true; applied: readonly string[] } | { ok: false; failed: string | undefined };

export async function runMigrations(db: Db, migrations: readonly Migration[]): Promise<MigrationOutcome> {
  const ordered = [...migrations].sort((left, right) => compareText(left.id, right.id));
  const applied: string[] = [];
  let current: string | undefined;
  try {
    const existing = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [
      migrationsTable,
    ]);
    if (existing === undefined) {
      await db.exec(`CREATE TABLE ${migrationsTable} (id TEXT PRIMARY KEY NOT NULL)`);
    }
    const done = new Set((await db.all(`SELECT id FROM ${migrationsTable}`)).map((row) => String(row.id)));
    for (const migration of ordered) {
      if (done.has(migration.id)) {
        continue;
      }
      current = migration.id;
      await db.transaction(async (session) => {
        for (const statement of migration.statements) {
          await session.exec(statement);
        }
        await session.run(`INSERT INTO ${migrationsTable} (id) VALUES (?)`, [migration.id]);
      });
      applied.push(migration.id);
    }
    return { ok: true, applied };
  } catch {
    return { ok: false, failed: current };
  }
}
