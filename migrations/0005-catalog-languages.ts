import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0005-catalog-languages',
  statements: [
    'CREATE TABLE catalog_languages (language TEXT NOT NULL PRIMARY KEY, english_name TEXT NOT NULL, autonym TEXT NOT NULL, direction TEXT NOT NULL)',
  ],
};

export default migration;
