import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0200-formation',
  statements: [
    'CREATE TABLE formation_groups (id TEXT PRIMARY KEY NOT NULL, ordinal INTEGER NOT NULL, name TEXT NOT NULL, track TEXT NOT NULL, session INTEGER NOT NULL, movement TEXT, started TEXT)',
    'CREATE TABLE formation_notes (group_id TEXT NOT NULL, track TEXT NOT NULL, session INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY (group_id, track, session))',
    'CREATE TABLE formation_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)',
  ],
};

export default migration;
