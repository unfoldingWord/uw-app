import { describe, expect, it } from 'vitest';
import { pendingUntil, type Check } from './check.ts';
import { runChecks } from './run.ts';

const passing: Check = {
  name: 'passing',
  rule: 'always holds',
  run: () => ({ status: 'pass', summary: 'ok' }),
};
const failing: Check = {
  name: 'failing',
  rule: 'never holds',
  run: () => ({ status: 'fail', findings: ['src/example.ts'] }),
};

describe('runChecks', () => {
  it('passes when every check passes or is pending', async () => {
    const report = await runChecks([passing, pendingUntil('later', 'arrives later', 'src/lib/later', 'T9')]);
    expect(report.passed).toBe(true);
    expect(report.lines).toContain(
      'pending  later: arrives later. Awaiting T9; fails as soon as src/lib/later exists',
    );
  });

  it('fails a pending check once its subject exists', async () => {
    const report = await runChecks([pendingUntil('lib', 'the lib exists', 'src/lib', 'now')]);
    expect(report.passed).toBe(false);
  });

  it('fails when any check fails and lists its findings', async () => {
    const report = await runChecks([passing, failing]);
    expect(report.passed).toBe(false);
    expect(report.lines).toContain('         src/example.ts');
  });
});
