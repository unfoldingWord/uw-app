import type { FailureCode } from '@lib/domain/failures';

export type Failures = Readonly<Record<string, FailureCode>>;

export type Outcome = { ok: true } | { ok: false; code: FailureCode };

export function withOutcome(failures: Failures, key: string, outcome: Outcome): Failures {
  const rest = Object.fromEntries(Object.entries(failures).filter(([entry]) => entry !== key));
  return outcome.ok ? rest : { ...rest, [key]: outcome.code };
}
