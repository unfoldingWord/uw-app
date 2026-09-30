import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { DbRow, SqlValue } from '@lib/ports';
import { createSqlDb, type MemoryDb, type SqlEngine } from './sql-db';

export type { MemoryDb } from './sql-db';

function inputs(params: readonly SqlValue[]): SQLInputValue[] {
  return [...params];
}

function toRow(value: unknown): DbRow {
  return value as DbRow;
}

function nodeSqlEngine(database: DatabaseSync): SqlEngine {
  return {
    exec: (sql) => {
      database.exec(sql);
    },
    run: (sql, params) => {
      const result = database.prepare(sql).run(...inputs(params));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    all: (sql, params) =>
      database
        .prepare(sql)
        .all(...inputs(params))
        .map(toRow),
    get: (sql, params) => {
      const row = database.prepare(sql).get(...inputs(params));
      return row === undefined ? undefined : toRow(row);
    },
    close: () => database.close(),
  };
}

export function createMemoryDb(): MemoryDb {
  return createSqlDb(nodeSqlEngine(new DatabaseSync(':memory:')));
}
