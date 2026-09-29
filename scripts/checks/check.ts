export type CheckOutcome =
  | { status: 'pass'; summary: string }
  | { status: 'fail'; findings: string[] }
  | { status: 'pending'; awaiting: string };

export type Check = {
  name: string;
  rule: string;
  run: () => CheckOutcome | Promise<CheckOutcome>;
};

export function pendingCheck(name: string, rule: string, awaiting: string): Check {
  return { name, rule, run: () => ({ status: 'pending', awaiting }) };
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
