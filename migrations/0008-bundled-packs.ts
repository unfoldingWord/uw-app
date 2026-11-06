import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0008-bundled-packs',
  statements: ['CREATE TABLE bundled_packs (pack TEXT PRIMARY KEY NOT NULL)'],
};

export default migration;
