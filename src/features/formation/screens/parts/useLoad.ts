import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';

export type Loaded<T> = {
  readonly value: T | undefined;
  readonly loading: boolean;
  readonly failure: FailureCode | undefined;
  reload(): Promise<void>;
};

export function useLoad<T>(load: () => Promise<T>): Loaded<T> {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  const latest = useRef(0);
  const reload = useCallback(async () => {
    latest.current += 1;
    const request = latest.current;
    try {
      const next = await load();
      if (request === latest.current) {
        setValue(next);
        setFailure(undefined);
      }
    } catch (error) {
      if (request === latest.current) {
        setFailure(failureCodeOf(error));
      }
    } finally {
      if (request === latest.current) {
        setLoading(false);
      }
    }
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        latest.current += 1;
      };
    }, [reload]),
  );
  return { value, loading, failure, reload };
}
