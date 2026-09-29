import { pendingCheck } from './check.ts';

export default pendingCheck(
  'strings',
  'No punctuated literal in app/ or src/features/ that the string table does not hold, and every locale has every key',
  'T7 (Strings module and locale files) and T8 (feature strings.ts)',
);
