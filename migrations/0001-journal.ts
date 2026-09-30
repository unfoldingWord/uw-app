import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0001-journal',
  statements: [
    'CREATE TABLE journal (seq INTEGER PRIMARY KEY NOT NULL, type TEXT NOT NULL, at INTEGER NOT NULL, payload TEXT NOT NULL)',
    'CREATE TABLE journal_state (key TEXT PRIMARY KEY NOT NULL, value INTEGER NOT NULL)',
  ],
};

export default migration;
