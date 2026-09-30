import { describe, expect, it } from 'vitest';
import { settleAsync, unsettled, type AsyncState } from './useAsyncValue';

describe('an async value settles without losing what it knew', () => {
  it('keeps the known value and names the failure when a re-read rejects', () => {
    const known = settleAsync<number>(unsettled, 1, { ok: true, value: 7 });
    const failed = settleAsync(known, 2, {
      ok: false,
      error: Object.assign(new Error('refused'), { code: 'db.io' }),
    });
    expect(failed).toEqual({ value: 7, failure: 'db.io', settled: 2 });
  });

  it('clears the failure once a later read succeeds', () => {
    const failed: AsyncState<number> = { value: 7, failure: 'db.io', settled: 2 };
    expect(settleAsync(failed, 3, { ok: true, value: 8 })).toEqual({
      value: 8,
      failure: undefined,
      settled: 3,
    });
  });

  it('ignores an answer older than one already settled, success or failure', () => {
    const settled: AsyncState<number> = { value: 8, failure: undefined, settled: 3 };
    expect(settleAsync(settled, 2, { ok: true, value: 1 })).toBe(settled);
    expect(settleAsync(settled, 2, { ok: false, error: new Error('late') })).toBe(settled);
  });

  it('names an error without a code as unexpected', () => {
    expect(settleAsync<number>(unsettled, 1, { ok: false, error: new Error('boom') }).failure).toBe(
      'unexpected',
    );
  });
});
