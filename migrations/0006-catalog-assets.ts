import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0006-catalog-assets',
  statements: ["ALTER TABLE catalog_releases ADD COLUMN assets TEXT NOT NULL DEFAULT '[]'"],
};

export default migration;
