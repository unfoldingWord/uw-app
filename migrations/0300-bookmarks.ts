import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0300-bookmarks',
  statements: [
    'CREATE TABLE bookmarks (id TEXT PRIMARY KEY NOT NULL, ordinal INTEGER NOT NULL, target TEXT NOT NULL, reference TEXT, article TEXT, story INTEGER, language TEXT NOT NULL)',
  ],
};

export default migration;
