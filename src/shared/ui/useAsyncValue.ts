import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncValue<T> = { value: T | undefined; reload: () => void };

export type AsyncValueOptions<T> = { pollMs?: (value: T) => number | undefined };

export function useAsyncValue<T>(
  load: () => Promise<T>,
  keys: readonly unknown[],
  options: AsyncValueOptions<T> = {},
): AsyncValue<T> {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const issued = useRef(0);
  const settled = useRef(0);
  const loader = useRef(load);
  loader.current = load;
  const poll = useRef(options.pollMs);
  poll.current = options.pollMs;

  const reload = useCallback(() => setTick((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    issued.current += 1;
    const request = issued.current;
    loader
      .current()
      .then((next) => {
        if (!active || request < settled.current) {
          return;
        }
        settled.current = request;
        setValue(next);
        const wait = poll.current?.(next);
        if (wait !== undefined) {
          timer = setTimeout(reload, wait);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [tick, reload, ...keys]);

  return { value, reload };
}

export function useChanges(subscribe: (listener: () => void) => () => void): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((current) => current + 1)), [subscribe]);
  return version;
}
