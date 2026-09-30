import type { Check, CheckOutcome } from './check.ts';

export type ChecksReport = { passed: boolean; lines: string[] };

function describe(check: Check, outcome: CheckOutcome): string[] {
  switch (outcome.status) {
    case 'pass':
      return [`pass     ${check.name}: ${outcome.summary}`];
    case 'pending':
      return [`pending  ${check.name}: ${check.rule}. Awaiting ${outcome.awaiting}`];
    case 'fail':
      return [
        `FAIL     ${check.name}: ${check.rule}`,
        ...outcome.findings.map((finding) => `         ${finding}`),
      ];
  }
}

export async function runChecks(checks: Check[]): Promise<ChecksReport> {
  const lines: string[] = [];
  const statuses: CheckOutcome['status'][] = [];
  for (const check of checks) {
    const outcome = await check.run();
    statuses.push(outcome.status);
    lines.push(...describe(check, outcome));
  }
  const passed = !statuses.includes('fail');
  const pending = statuses.filter((status) => status === 'pending').length;
  lines.push(`${checks.length} checks, ${pending} pending, ${passed ? 'none failed' : 'some failed'}`);
  return { passed, lines };
}
