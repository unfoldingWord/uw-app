import type { Db, DbTransaction, DbRow, RunResult, SqlValue } from '@lib/ports';
import { portError } from './errors';

export type MemoryDb = Db & {
  failWrites(fail: boolean | RegExp): void;
  onWrite(listener: (sql: string, params: readonly SqlValue[]) => void): () => void;
  tables(): readonly string[];
  close(): void;
};

export type SqlEngine = {
  exec(sql: string): void;
  run(sql: string, params: readonly SqlValue[]): RunResult;
  all(sql: string, params: readonly SqlValue[]): DbRow[];
  get(sql: string, params: readonly SqlValue[]): DbRow | undefined;
  close(): void;
};

const writeStatement = /^\s*(insert|update|delete|replace|create|drop|alter)\b/i;

export function createSqlDb(engine: SqlEngine): MemoryDb {
  let failing: boolean | RegExp = false;
  let lock: Promise<unknown> = Promise.resolve();
  const listeners = new Set<(sql: string, params: readonly SqlValue[]) => void>();

  function guard(sql: string, params: readonly SqlValue[] = []): void {
    if (writeStatement.test(sql)) {
      for (const listener of listeners) {
        listener(sql, params);
      }
    }
    const refused = failing instanceof RegExp ? failing.test(sql) : failing;
    if (refused && writeStatement.test(sql)) {
      throw portError('db.io', 'the database refused a write');
    }
  }

  const connection: DbTransaction = {
    exec: async (sql) => {
      guard(sql);
      engine.exec(sql);
    },
    run: async (sql, params = []) => {
      guard(sql, params);
      return engine.run(sql, params);
    },
    all: async (sql, params = []) => engine.all(sql, params),
    get: async (sql, params = []) => engine.get(sql, params),
  };

  function serialized<T>(work: () => Promise<T>): Promise<T> {
    const result = lock.then(work, work);
    lock = result.catch(() => undefined);
    return result;
  }

  return {
    exec: (sql) => serialized(() => connection.exec(sql)),
    run: (sql, params) => serialized(() => connection.run(sql, params)),
    all: (sql, params) => serialized(() => connection.all(sql, params)),
    get: (sql, params) => serialized(() => connection.get(sql, params)),
    transaction: (work) =>
      serialized(async () => {
        engine.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(connection);
          engine.exec('COMMIT');
          return result;
        } catch (error) {
          engine.exec('ROLLBACK');
          throw error;
        }
      }),
    failWrites: (fail) => {
      failing = fail;
    },
    onWrite: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tables: () =>
      engine
        .all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", [])
        .map((row) => String(row.name)),
    close: () => engine.close(),
  };
}
