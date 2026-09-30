import type { ShareOutcome, SharePayload, ShareSheet } from '@lib/ports';

export type MemoryShareSheet = ShareSheet & {
  shared(): readonly SharePayload[];
  respondWith(outcome: ShareOutcome): void;
};

export function createMemoryShareSheet(): MemoryShareSheet {
  const payloads: SharePayload[] = [];
  let outcome: ShareOutcome = 'shared';
  return {
    share: async (payload) => {
      payloads.push(payload);
      return outcome;
    },
    shared: () => payloads.slice(),
    respondWith: (next) => {
      outcome = next;
    },
  };
}
