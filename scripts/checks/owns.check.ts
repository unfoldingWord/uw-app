import { pendingCheck } from './check.ts';

export default pendingCheck(
  'owns',
  'One writer per durable value: every table, directory and preference key is claimed by exactly one owns export',
  'T8 (feature store.ts owns exports); kernel modules are checked for one owner per table and directory in sim/kernel.test.ts',
);
