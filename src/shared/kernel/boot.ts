export type BootState<Booted> =
  | { status: 'booting'; attempt: number }
  | { status: 'ready'; attempt: number; booted: Booted }
  | { status: 'failed'; attempt: number };

export type Boot<Booted> = {
  state(): BootState<Booted>;
  start(): Promise<BootState<Booted>>;
  retry(): Promise<BootState<Booted>>;
  subscribe(listener: (state: BootState<Booted>) => void): () => void;
};

export function createBoot<Booted>(open: () => Promise<Booted>): Boot<Booted> {
  let current: BootState<Booted> = { status: 'booting', attempt: 0 };
  let running: Promise<BootState<Booted>> | undefined;
  const listeners = new Set<(state: BootState<Booted>) => void>();

  function settle(next: BootState<Booted>): BootState<Booted> {
    current = next;
    for (const listener of [...listeners]) {
      listener(next);
    }
    return next;
  }

  function attempt(): Promise<BootState<Booted>> {
    const number = current.attempt + 1;
    settle({ status: 'booting', attempt: number });
    running = Promise.resolve()
      .then(open)
      .then(
        (booted) => settle({ status: 'ready', attempt: number, booted }),
        () => settle({ status: 'failed', attempt: number }),
      )
      .finally(() => {
        running = undefined;
      });
    return running;
  }

  return {
    state: () => current,
    start() {
      if (running !== undefined) {
        return running;
      }
      return current.status === 'booting' && current.attempt === 0 ? attempt() : Promise.resolve(current);
    },
    retry() {
      if (running !== undefined) {
        return running;
      }
      return current.status === 'failed' ? attempt() : Promise.resolve(current);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
