import type { Kv } from '@lib/ports';
import { portError } from './errors';

export type MemoryKv = Kv & { entries(): Readonly<Record<string, string>>; failWrites(fail: boolean): void };

export function createMemoryKv(): MemoryKv {
  const values = new Map<string, string>();
  let failing = false;
  function guard(key: string): void {
    if (failing) {
      throw portError('kv.io', `write to ${key} refused`);
    }
  }
  return {
    get: async (key) => values.get(key),
    set: async (key, value) => {
      guard(key);
      values.set(key, value);
    },
    delete: async (key) => {
      guard(key);
      values.delete(key);
    },
    keys: async () => [...values.keys()].sort(),
    entries: () =>
      Object.fromEntries([...values.entries()].sort(([left], [right]) => left.localeCompare(right))),
    failWrites: (fail) => {
      failing = fail;
    },
  };
}
