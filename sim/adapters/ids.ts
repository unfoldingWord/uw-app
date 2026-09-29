import type { Ids } from '@lib/ports';

export type MemoryIds = Ids & { issued(): readonly string[] };

export function createMemoryIds(prefix = 'id'): MemoryIds {
  const issued: string[] = [];
  return {
    next() {
      const id = `${prefix}-${String(issued.length + 1).padStart(6, '0')}`;
      issued.push(id);
      return id;
    },
    issued: () => issued.slice(),
  };
}
