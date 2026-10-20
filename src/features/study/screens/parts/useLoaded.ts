import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Loaded<T> = {
  readonly value: T | undefined;
  readonly reload: () => Promise<void>;
};

export function useLoaded<T>(
  load: () => Promise<T>,
  subscribe?: (listener: () => void) => () => void,
): Loaded<T> {
  const [value, setValue] = useState<T | undefined>(undefined);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    generation.current += 1;
    const mine = generation.current;
    const next = await load();
    if (mine === generation.current) {
      setValue(next);
    }
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        generation.current += 1;
      };
    }, [reload]),
  );
  useEffect(
    () =>
      subscribe?.(() => {
        void reload();
      }),
    [subscribe, reload],
  );
  return { value, reload };
}
