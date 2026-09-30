import type { FailureCode } from '@lib/domain/failures';
import type { PickedFile, Picker } from '@lib/ports';
import { portError } from './errors';

export type ScriptedPick =
  { kind: 'file'; uri: string } | { kind: 'cancel' } | { kind: 'fail'; code: FailureCode };

export type MemoryPicker = Picker & {
  script(...picks: readonly ScriptedPick[]): void;
  opened(): number;
};

export function createMemoryPicker(): MemoryPicker {
  const queue: ScriptedPick[] = [];
  let opened = 0;
  return {
    pickArchive: async (): Promise<PickedFile | undefined> => {
      opened += 1;
      const next = queue.shift() ?? { kind: 'cancel' };
      switch (next.kind) {
        case 'file':
          return { uri: next.uri };
        case 'cancel':
          return undefined;
        case 'fail':
          throw portError(next.code, 'the scripted picker failed');
      }
    },
    script: (...picks) => {
      queue.push(...picks);
    },
    opened: () => opened,
  };
}
