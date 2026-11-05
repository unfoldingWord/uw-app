import { useCallback, useEffect, useRef, useState } from 'react';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';

export type AsyncValue<T> = {
  value: T | undefined;
  failure: FailureCode | undefined;
  loading: boolean;
  reload: () => void;
};

export type AsyncValueOptions<T> = { pollMs?: (value: T) => number | undefined };

export type AsyncState<T> = {
  readonly value: T | undefined;
  readonly failure: FailureCode | undefined;
  readonly requested: number;
  readonly settled: number;
};

export type AsyncOutcome<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown };

export const unsettled: AsyncState<never> = Object.freeze({
  value: undefined,
  failure: undefined,
  requested: 0,
  settled: 0,
});

export type ReadKind = 'shown' | 'quiet';

export function requestAsync<T>(
  state: AsyncState<T>,
  request: number,
  kind: ReadKind = 'shown',
): AsyncState<T> {
  return kind === 'quiet' || request <= state.requested ? state : { ...state, requested: request };
}

export function isLoading(state: AsyncState<unknown>): boolean {
  return state.requested > state.settled;
}

export function settleAsync<T>(
  state: AsyncState<T>,
  request: number,
  outcome: AsyncOutcome<T>,
): AsyncState<T> {
  if (request < state.settled) {
    return state;
  }
  return outcome.ok
    ? { value: outcome.value, failure: undefined, requested: state.requested, settled: request }
    : {
        value: state.value,
        failure: failureCodeOf(outcome.error),
        requested: state.requested,
        settled: request,
      };
}

export function useAsyncValue<T>(
  load: () => Promise<T>,
  keys: readonly unknown[],
  options: AsyncValueOptions<T> = {},
): AsyncValue<T> {
  const [state, setState] = useState<AsyncState<T>>(unsettled);
  const [tick, setTick] = useState(0);
  const issued = useRef(0);
  const current = useRef<AsyncState<T>>(unsettled);
  const loader = useRef(load);
  loader.current = load;
  const poll = useRef(options.pollMs);
  poll.current = options.pollMs;

  const nextKind = useRef<ReadKind>('shown');

  const reload = useCallback(() => setTick((count) => count + 1), []);
  const pollAgain = useCallback(() => {
    nextKind.current = 'quiet';
    setTick((count) => count + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    issued.current += 1;
    const request = issued.current;
    current.current = requestAsync(current.current, request, nextKind.current);
    nextKind.current = 'shown';
    setState(current.current);
    const settle = (outcome: AsyncOutcome<T>): boolean => {
      if (!active) {
        return false;
      }
      const next = settleAsync(current.current, request, outcome);
      if (next === current.current) {
        return false;
      }
      current.current = next;
      setState(next);
      return true;
    };
    loader.current().then(
      (next) => {
        if (!settle({ ok: true, value: next })) {
          return;
        }
        const wait = poll.current?.(next);
        if (wait !== undefined) {
          timer = setTimeout(pollAgain, wait);
        }
      },
      (error: unknown) => {
        settle({ ok: false, error });
      },
    );
    return () => {
      active = false;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [tick, pollAgain, ...keys]);

  return { value: state.value, failure: state.failure, loading: isLoading(state), reload };
}

export function useChanges(subscribe: (listener: () => void) => () => void): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((current) => current + 1)), [subscribe]);
  return version;
}
