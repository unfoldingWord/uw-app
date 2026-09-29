import { pendingCheck } from './check.ts';

export default pendingCheck(
  'tokens',
  'src/shared/theme agrees with design-system/tokens/*.css by name and value',
  'T9 (src/shared/theme)',
);
