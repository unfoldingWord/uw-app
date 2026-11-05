import { describe, expect, it } from 'vitest';
import { createLoader, type LoaderState } from './loader';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('a loaded value shows progress on every reload and keeps what it knew', () => {
  it('flips loading on at the start of each reload and off when it settles, keeping the stale value', async () => {
    const seen: LoaderState<number>[] = [];
    const loader = createLoader<number>((state) => seen.push(state));
    const first = deferred<number>();
    const opening = loader.reload(() => first.promise);
    expect(loader.state()).toEqual({ value: undefined, loading: true });
    first.resolve(1);
    await opening;
    expect(loader.state()).toEqual({ value: 1, loading: false });
    const second = deferred<number>();
    const again = loader.reload(() => second.promise);
    expect(loader.state()).toEqual({ value: 1, loading: true });
    second.resolve(2);
    await again;
    expect(seen).toEqual([
      { value: undefined, loading: true },
      { value: 1, loading: false },
      { value: 1, loading: true },
      { value: 2, loading: false },
    ]);
  });

  it('stays loading while a newer reload is in flight and ignores the older answer', async () => {
    const loader = createLoader<string>(() => undefined);
    const older = deferred<string>();
    const newer = deferred<string>();
    const olderRun = loader.reload(() => older.promise);
    const newerRun = loader.reload(() => newer.promise);
    older.resolve('old');
    await olderRun;
    expect(loader.state()).toEqual({ value: undefined, loading: true });
    newer.resolve('new');
    await newerRun;
    expect(loader.state()).toEqual({ value: 'new', loading: false });
  });

  it('stops loading when the current reload fails and keeps the known value', async () => {
    const loader = createLoader<number>(() => undefined);
    await loader.reload(() => Promise.resolve(3));
    const failing = deferred<number>();
    const run = loader.reload(() => failing.promise);
    failing.reject(new Error('refused'));
    await expect(run).rejects.toThrow('refused');
    expect(loader.state()).toEqual({ value: 3, loading: false });
  });

  it('stops loading when cancelled, and a late answer then changes nothing', async () => {
    const loader = createLoader<number>(() => undefined);
    await loader.reload(() => Promise.resolve(4));
    const late = deferred<number>();
    const run = loader.reload(() => late.promise);
    loader.cancel();
    expect(loader.state()).toEqual({ value: 4, loading: false });
    late.resolve(5);
    await run;
    expect(loader.state()).toEqual({ value: 4, loading: false });
  });
});
