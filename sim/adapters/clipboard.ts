import type { FailureCode } from '@lib/domain/failures';
import type { Clipboard } from '@lib/ports';
import { portError } from './errors';

export type MemoryClipboard = Clipboard & {
  text(): string | undefined;
  failNext(code: FailureCode): void;
};

export function createMemoryClipboard(): MemoryClipboard {
  let held: string | undefined;
  let failure: FailureCode | undefined;
  return {
    copy: async (text) => {
      const refused = failure;
      failure = undefined;
      if (refused !== undefined) {
        throw portError(refused, 'the scripted clipboard refused the text');
      }
      held = text;
    },
    text: () => held,
    failNext: (code) => {
      failure = code;
    },
  };
}
