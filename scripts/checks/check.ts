import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type CheckOutcome =
  | { status: 'pass'; summary: string }
  | { status: 'fail'; findings: string[] }
  | { status: 'pending'; awaiting: string };

export type Check = {
  name: string;
  rule: string;
  run: () => CheckOutcome | Promise<CheckOutcome>;
};

const repositoryRoot = join(import.meta.dirname, '..', '..');

export function pendingUntil(name: string, rule: string, subject: string, awaiting: string): Check {
  return {
    name,
    rule,
    run: () =>
      existsSync(join(repositoryRoot, ...subject.split('/')))
        ? {
            status: 'fail',
            findings: [
              `${subject} exists, so this check must now run for real: replace scripts/checks/${name}.check.ts with the check itself (${awaiting})`,
            ],
          }
        : { status: 'pending', awaiting: `${awaiting}; fails as soon as ${subject} exists` },
  };
}

export function isCheck(value: unknown): value is Check {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.rule === 'string' &&
    typeof candidate.run === 'function'
  );
}
