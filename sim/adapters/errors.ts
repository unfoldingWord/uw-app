import type { FailureCode } from '@lib/domain/failures';
import type { PortError } from '@lib/ports';

export function portError(code: FailureCode, detail: string): PortError {
  return Object.assign(new Error(`${code}: ${detail}`), { code });
}
