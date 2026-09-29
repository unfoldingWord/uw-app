import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Db, DbSession, Row, SqlValue } from '@lib/ports';
import { portError } from './errors';

export type MemoryDb = Db & {
  failWrites(fail: boolean): void;
  tables(): readonly string[];
  close(): void;
};

const writeStatement = /^\s*(insert|update|delete|replace|create|drop|alter)\b/i;

function toRow(value: unknown): Row {
  return value as Row;
}

function inputs(params: readonly SqlValue[]): SQLInputValue[] {
  return [...params];
}

export function createMemoryDb(): MemoryDb {
  const database = new DatabaseSync(':memory:');
  let failing = false;
  let lock: Promise<unknown> = Promise.resolve();

  function guard(sql: string): void {
    if (failing && writeStatement.test(sql)) {
      throw portError('db.io', 'the database refused a write');
    }
  }

  const session: DbSession = {
    exec: async (sql) => {
      guard(sql);
      database.exec(sql);
    },
    run: async (sql, params = []) => {
      guard(sql);
      const result = database.prepare(sql).run(...inputs(params));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    all: async (sql, params = []) =>
      database
        .prepare(sql)
        .all(...inputs(params))
        .map(toRow),
    get: async (sql, params = []) => {
      const row = database.prepare(sql).get(...inputs(params));
      return row === undefined ? undefined : toRow(row);
    },
  };

  function serialized<T>(work: () => Promise<T>): Promise<T> {
    const result = lock.then(work, work);
    lock = result.catch(() => undefined);
    return result;
  }

  return {
    exec: (sql) => serialized(() => session.exec(sql)),
    run: (sql, params) => serialized(() => session.run(sql, params)),
    all: (sql, params) => serialized(() => session.all(sql, params)),
    get: (sql, params) => serialized(() => session.get(sql, params)),
    transaction: (work) =>
      serialized(async () => {
        database.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(session);
          database.exec('COMMIT');
          return result;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      }),
    failWrites: (fail) => {
      failing = fail;
    },
    tables: () =>
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all()
        .map((row) => String((row as { name: unknown }).name)),
    close: () => database.close(),
  };
}
