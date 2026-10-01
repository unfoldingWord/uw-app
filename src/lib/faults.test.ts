import { describe, expect, it } from 'vitest';
import { createStartFaults, startFaultLimit, startFaultOf } from './faults';

function fail(error: unknown): () => never {
  return () => {
    throw error;
  };
}

describe('start faults', () => {
  it('reads the code and the step a platform fault carries, and nothing else', () => {
    const error = Object.assign(new Error('files.io: /private/var/mobile still included'), {
      code: 'files.io',
      step: 'backup',
    });
    expect(startFaultOf(error)).toEqual({ code: 'files.io', step: 'backup' });
  });

  it('names an unknown step start and an unknown code unexpected', () => {
    expect(startFaultOf(Object.assign(new Error('x'), { code: 'db.io', step: 'somewhere' }))).toEqual({
      code: 'db.io',
      step: 'start',
    });
    expect(startFaultOf(new Error('Cannot read property of undefined'))).toEqual({
      code: 'unexpected',
      step: 'start',
    });
  });

  it('keeps the latest faults up to its limit and rethrows each one', () => {
    const faults = createStartFaults();
    for (let attempt = 0; attempt < startFaultLimit + 3; attempt += 1) {
      expect(() => faults.capture(fail(Object.assign(new Error('x'), { code: 'files.io' })))).toThrow('x');
    }
    expect(faults.pending()).toHaveLength(startFaultLimit);
    faults.clear();
    expect(faults.pending()).toEqual([]);
  });
});
