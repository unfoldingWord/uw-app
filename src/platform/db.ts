import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Db, DbRow, DbTransaction, SqlValue } from '@lib/ports';

export const deviceDatabaseName = 'uw.db';

export function createPlatformDb(name: string = deviceDatabaseName): Db {
  let opened: Promise<SQLiteDatabase> | undefined;
  let lock: Promise<unknown> = Promise.resolve();

  function database(): Promise<SQLiteDatabase> {
    opened ??= openDatabaseAsync(name).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL');
      return db;
    });
    return opened;
  }

  const session: DbTransaction = {
    exec: async (sql) => {
      await (await database()).execAsync(sql);
    },
    run: async (sql, params: readonly SqlValue[] = []) => {
      const result = await (await database()).runAsync(sql, [...params]);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
    },
    all: async (sql, params: readonly SqlValue[] = []) =>
      (await database()).getAllAsync<DbRow>(sql, [...params]),
    get: async (sql, params: readonly SqlValue[] = []) =>
      (await (await database()).getFirstAsync<DbRow>(sql, [...params])) ?? undefined,
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
        await session.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(session);
          await session.exec('COMMIT');
          return result;
        } catch (error) {
          await session.exec('ROLLBACK');
          throw error;
        }
      }),
  };
}
