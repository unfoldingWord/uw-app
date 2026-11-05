export type LoaderState<T> = { readonly value: T | undefined; readonly loading: boolean };

export type ReadKind = 'shown' | 'quiet';

export type Loader<T> = {
  readonly reload: (load: () => Promise<T>, kind?: ReadKind) => Promise<void>;
  readonly cancel: () => void;
  readonly state: () => LoaderState<T>;
};

export function createLoader<T>(publish: (state: LoaderState<T>) => void): Loader<T> {
  let generation = 0;
  let current: LoaderState<T> = { value: undefined, loading: false };
  const update = (next: LoaderState<T>) => {
    if (next.value === current.value && next.loading === current.loading) {
      return;
    }
    current = next;
    publish(next);
  };
  return {
    reload: async (load, kind = 'shown') => {
      generation += 1;
      const mine = generation;
      update({ value: current.value, loading: kind === 'shown' || current.loading });
      try {
        const next = await load();
        if (mine === generation) {
          update({ value: next, loading: false });
        }
      } catch (error) {
        if (mine === generation) {
          update({ value: current.value, loading: false });
        }
        throw error;
      }
    },
    cancel: () => {
      generation += 1;
      update({ value: current.value, loading: false });
    },
    state: () => current,
  };
}
