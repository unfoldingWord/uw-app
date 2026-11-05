import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { createLoader, type LoaderState } from './loader';

export type Loaded<T> = {
  readonly value: T | undefined;
  readonly loading: boolean;
  readonly reload: () => Promise<void>;
};

export function useLoaded<T>(
  load: () => Promise<T>,
  subscribe?: (listener: () => void) => () => void,
): Loaded<T> {
  const [state, setState] = useState<LoaderState<T>>({ value: undefined, loading: false });
  const [loader] = useState(() => createLoader<T>(setState));
  const reload = useCallback(() => loader.reload(load), [loader, load]);
  useFocusEffect(
    useCallback(() => {
      void loader.reload(load, 'quiet');
      return () => {
        loader.cancel();
      };
    }, [loader, load]),
  );
  useEffect(
    () =>
      subscribe?.(() => {
        void reload();
      }),
    [subscribe, reload],
  );
  return { value: state.value, loading: state.loading, reload };
}
