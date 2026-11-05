import { describe, expect, it } from 'vitest';
import { isLoading, requestAsync, settleAsync, unsettled, type AsyncState } from './useAsyncValue';

describe('an async value settles without losing what it knew', () => {
  it('keeps the known value and names the failure when a re-read rejects', () => {
    const known = settleAsync<number>(unsettled, 1, { ok: true, value: 7 });
    const failed = settleAsync(known, 2, {
      ok: false,
      error: Object.assign(new Error('refused'), { code: 'db.io' }),
    });
    expect(failed).toEqual({ value: 7, failure: 'db.io', requested: 0, settled: 2 });
  });

  it('clears the failure once a later read succeeds', () => {
    const failed: AsyncState<number> = { value: 7, failure: 'db.io', requested: 3, settled: 2 };
    expect(settleAsync(failed, 3, { ok: true, value: 8 })).toEqual({
      value: 8,
      failure: undefined,
      requested: 3,
      settled: 3,
    });
  });

  it('ignores an answer older than one already settled, success or failure', () => {
    const settled: AsyncState<number> = { value: 8, failure: undefined, requested: 3, settled: 3 };
    expect(settleAsync(settled, 2, { ok: true, value: 1 })).toBe(settled);
    expect(settleAsync(settled, 2, { ok: false, error: new Error('late') })).toBe(settled);
  });

  it('names an error without a code as unexpected', () => {
    expect(settleAsync<number>(unsettled, 1, { ok: false, error: new Error('boom') }).failure).toBe(
      'unexpected',
    );
  });

  it('is loading from each request until that request or a newer one settles, keeping the known value', () => {
    expect(isLoading(unsettled)).toBe(false);
    const first = requestAsync<number>(unsettled, 1);
    expect(isLoading(first)).toBe(true);
    const known = settleAsync(first, 1, { ok: true, value: 7 });
    expect(isLoading(known)).toBe(false);
    const again = requestAsync(known, 2);
    expect(again.value).toBe(7);
    expect(isLoading(again)).toBe(true);
    const newer = requestAsync(again, 3);
    const older = settleAsync(newer, 2, { ok: true, value: 8 });
    expect(older.value).toBe(8);
    expect(isLoading(older)).toBe(true);
    const failed = settleAsync(older, 3, { ok: false, error: new Error('refused') });
    expect(failed.value).toBe(8);
    expect(isLoading(failed)).toBe(false);
  });
});
