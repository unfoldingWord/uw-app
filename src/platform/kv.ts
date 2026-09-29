import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { Kv } from '@lib/ports';
import { messageOf, portError } from './errors';

export const preferencesDatabaseName = 'uw-preferences.db';

async function writing(key: string, work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch (error) {
    throw portError('kv.io', `write to ${key} refused: ${messageOf(error)}`);
  }
}

export function createPlatformKv(name: string = preferencesDatabaseName): Kv {
  const storage = new SQLiteStorage(name);
  return {
    get: async (key) => (await storage.getItemAsync(key)) ?? undefined,
    set: (key, value) => writing(key, () => storage.setItemAsync(key, value)),
    delete: (key) => writing(key, () => storage.removeItemAsync(key)),
    keys: async () => (await storage.getAllKeysAsync()).sort(),
  };
}
