import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0003-packs',
  statements: [
    'CREATE TABLE packs (pack TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, language TEXT, source TEXT NOT NULL, bytes INTEGER NOT NULL)',
    'CREATE TABLE pack_burritos (pack TEXT NOT NULL, publisher TEXT NOT NULL, resource TEXT NOT NULL, language TEXT NOT NULL, tag TEXT NOT NULL, commit_sha TEXT NOT NULL, released TEXT NOT NULL, resource_row TEXT NOT NULL, root TEXT NOT NULL, title TEXT NOT NULL, licence TEXT NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY (pack, publisher, resource))',
  ],
};

export default migration;
