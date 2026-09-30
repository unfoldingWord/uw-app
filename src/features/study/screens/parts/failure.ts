import type { FailureCode } from '@lib/domain/failures';
import type { StudyWords } from '../../strings';

export function failureText(words: StudyWords, code: FailureCode): string {
  return words.t(`failure.${code}`);
}
