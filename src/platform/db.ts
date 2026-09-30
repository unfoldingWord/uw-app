import { Directory } from 'expo-file-system';
import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Db, DbRow, DbTransaction, SqlValue } from '@lib/ports';

const deviceDatabaseName = 'uw.db';

export function createDatabaseDirectory(): string {
  const location = String(defaultDatabaseDirectory);
  const directory = new Directory(location.startsWith('/') ? `file://${encodeURI(location)}` : location);
  directory.create({ intermediates: true, idempotent: true });
  return directory.uri;
}

export function createPlatformDb(name: string = deviceDatabaseName): Db {
  let opened: Promise<SQLiteDatabase> | undefined;
  let lock: Promise<unknown> = Promise.resolve();

  function database(): Promise<SQLiteDatabase> {
    opened ??= openDatabaseAsync(name).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL');
      await db.execAsync('PRAGMA secure_delete = ON');
      return db;
    });
    return opened;
  }

  const connection: DbTransaction = {
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
    exec: (sql) => serialized(() => connection.exec(sql)),
    run: (sql, params) => serialized(() => connection.run(sql, params)),
    all: (sql, params) => serialized(() => connection.all(sql, params)),
    get: (sql, params) => serialized(() => connection.get(sql, params)),
    transaction: (work) =>
      serialized(async () => {
        await connection.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(connection);
          await connection.exec('COMMIT');
          return result;
        } catch (error) {
          await connection.exec('ROLLBACK');
          throw error;
        }
      }),
  };
}
