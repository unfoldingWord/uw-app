import type { FailureCode } from '@lib/domain/failures';
import type { PortError } from '@lib/ports';

const raised = new WeakSet<Error>();

export function portError(code: FailureCode, detail: string): PortError {
  const error = Object.assign(new Error(`${code}: ${detail}`), { code });
  raised.add(error);
  return error;
}

export function isPortError(error: unknown): error is PortError {
  return error instanceof Error && raised.has(error);
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
