import { pendingUntil } from './check.ts';

export default pendingUntil(
  'provenance',
  'Every content value rendered from every fixture carries provenance with its licence',
  'src/lib/corpus',
  'T5 (Corpus)',
);
