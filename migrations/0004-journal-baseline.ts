import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0004-journal-baseline',
  statements: ['CREATE TABLE journal_baseline (module TEXT PRIMARY KEY NOT NULL, state TEXT NOT NULL)'],
};

export default migration;
