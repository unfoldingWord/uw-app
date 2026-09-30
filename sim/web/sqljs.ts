import initSqlJs, { type Database, type SqlValue as EngineValue } from 'sql.js';
import type { DbRow, SqlValue } from '@lib/ports';
import type { SqlEngine } from '@sim/adapters/sql-db';

function bound(params: readonly SqlValue[]): EngineValue[] {
  return [...params];
}

function rowsOf(database: Database, sql: string, params: readonly SqlValue[], limit: number): DbRow[] {
  const statement = database.prepare(sql);
  try {
    statement.bind(bound(params));
    const rows: DbRow[] = [];
    while (rows.length < limit && statement.step()) {
      rows.push(statement.getAsObject() as DbRow);
    }
    return rows;
  } finally {
    statement.free();
  }
}

function engineOver(database: Database): SqlEngine {
  return {
    exec: (sql) => {
      database.exec(sql);
    },
    run: (sql, params) => {
      database.run(sql, bound(params));
      const changes = database.getRowsModified();
      const last = database.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0];
      return { changes, lastInsertRowId: typeof last === 'number' ? last : 0 };
    },
    all: (sql, params) => rowsOf(database, sql, params, Number.POSITIVE_INFINITY),
    get: (sql, params) => rowsOf(database, sql, params, 1)[0],
    close: () => database.close(),
  };
}

export async function openSqlEngine(image: Uint8Array | undefined, wasmUrl: string): Promise<SqlEngine> {
  const engine = await initSqlJs({ locateFile: () => wasmUrl });
  return engineOver(image === undefined ? new engine.Database() : new engine.Database(image));
}
