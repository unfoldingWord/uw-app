import type { HttpCancel } from './ports';

export type Cancellation = { token: HttpCancel; cancel(): void };

export function createCancellation(): Cancellation {
  const listeners: (() => void)[] = [];
  let cancelled = false;
  return {
    token: {
      get cancelled() {
        return cancelled;
      },
      onCancel(listener) {
        if (cancelled) {
          listener();
          return;
        }
        listeners.push(listener);
      },
    },
    cancel() {
      if (cancelled) {
        return;
      }
      cancelled = true;
      for (const listener of listeners.splice(0)) {
        listener();
      }
    },
  };
}
