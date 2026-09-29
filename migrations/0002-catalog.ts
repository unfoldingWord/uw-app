import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0002-catalog',
  statements: [
    'CREATE TABLE catalog_releases (publisher TEXT NOT NULL, resource TEXT NOT NULL, language TEXT NOT NULL, tag TEXT NOT NULL, commit_sha TEXT NOT NULL, title TEXT NOT NULL, subject TEXT NOT NULL, archive_url TEXT NOT NULL, published TEXT NOT NULL, resource_row TEXT, pack_kind TEXT, pack TEXT, bytes INTEGER, autonym TEXT NOT NULL, direction TEXT NOT NULL, position INTEGER NOT NULL, PRIMARY KEY (publisher, resource))',
  ],
};

export default migration;
