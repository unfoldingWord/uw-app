import { failureCodeOf, type FailureCode } from '@lib/domain/failures';
import type { Written } from '../../service';

export type WriteResult = Written<unknown> | undefined;

function failureOf(result: WriteResult): FailureCode | undefined {
  if (result === undefined) {
    return 'unexpected';
  }
  return result.ok ? undefined : result.code;
}

export async function settle(work: () => Promise<WriteResult>): Promise<FailureCode | undefined> {
  try {
    return failureOf(await work());
  } catch (error) {
    return failureCodeOf(error);
  }
}
