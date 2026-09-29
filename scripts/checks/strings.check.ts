import { pendingUntil } from './check.ts';

export default pendingUntil(
  'strings',
  'No punctuated literal in app/ or src/features/ that the string table does not hold, and every locale has every key',
  'src/lib/strings',
  'T7 (Strings module and locale files) and T8 (feature strings.ts)',
);
