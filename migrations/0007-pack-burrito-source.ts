import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0007-pack-burrito-source',
  statements: [
    "ALTER TABLE pack_burritos ADD COLUMN source TEXT NOT NULL DEFAULT 'catalog'",
    'UPDATE pack_burritos SET source = (SELECT packs.source FROM packs WHERE packs.pack = pack_burritos.pack) WHERE EXISTS (SELECT 1 FROM packs WHERE packs.pack = pack_burritos.pack)',
  ],
};

export default migration;
