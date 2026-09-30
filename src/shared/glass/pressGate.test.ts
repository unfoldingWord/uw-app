import { describe, expect, it } from 'vitest';
import { createPressGate, minimumTouchTarget, slopFor, touchSlop } from './pressGate';

describe('press gate (AGENTS.md section 10: busy before the first await)', () => {
  it('goes inert synchronously when a handler returns a promise, and wakes when it settles', async () => {
    const changes: boolean[] = [];
    const gate = createPressGate((busy) => changes.push(busy));
    let finish = (): void => undefined;
    let calls = 0;
    const run = () => {
      calls += 1;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    };
    expect(gate.press(run)).toBe(true);
    expect(gate.busy()).toBe(true);
    expect(gate.press(run)).toBe(false);
    expect(calls).toBe(1);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(gate.busy()).toBe(false);
    expect(changes).toEqual([true, false]);
    expect(gate.press(run)).toBe(true);
    expect(calls).toBe(2);
  });

  it('wakes after a rejected handler too, and never goes busy for a plain one', async () => {
    const gate = createPressGate(() => undefined);
    gate.press(() => Promise.reject(new Error('x')));
    await Promise.resolve();
    await Promise.resolve();
    expect(gate.busy()).toBe(false);
    expect(gate.press(() => undefined)).toBe(true);
    expect(gate.busy()).toBe(false);
  });

  it('extends a small control to the minimum touch target', () => {
    expect(slopFor(28)).toBe(8);
    expect(28 + 2 * slopFor(28)).toBeGreaterThanOrEqual(minimumTouchTarget);
    expect(slopFor(52)).toBe(0);
  });

  it('names the slop on both axes, and exposes it to the shots audit', () => {
    expect(touchSlop(30, 60)).toEqual({
      hitSlop: { top: 7, bottom: 7, left: 0, right: 0 },
      dataSet: { touchSlopV: 7, touchSlopH: 0 },
    });
    expect(touchSlop(20).hitSlop).toEqual({ top: 12, bottom: 12, left: 0, right: 0 });
  });
});
