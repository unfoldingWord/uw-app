import { pendingCheck } from './check.ts';

export default pendingCheck(
  'provenance',
  'Every content value rendered from every fixture carries provenance with its licence',
  'T3 (fixture burritos) and T5 (Corpus)',
);
