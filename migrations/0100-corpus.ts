import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0100-corpus',
  statements: [
    'CREATE TABLE corpus_burritos (root TEXT PRIMARY KEY NOT NULL, pack TEXT NOT NULL, row TEXT NOT NULL, kind TEXT NOT NULL, language TEXT NOT NULL, direction TEXT NOT NULL, provenance TEXT NOT NULL, books TEXT NOT NULL, items INTEGER NOT NULL, bytes INTEGER NOT NULL)',
    'CREATE INDEX corpus_burritos_pack ON corpus_burritos (pack)',
    'CREATE TABLE corpus_titles (root TEXT NOT NULL, language TEXT NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL, title TEXT NOT NULL, PRIMARY KEY (root, target))',
    'CREATE TABLE corpus_indexes (language TEXT PRIMARY KEY NOT NULL, entries INTEGER NOT NULL, bytes INTEGER NOT NULL)',
    "CREATE VIRTUAL TABLE corpus_fulltext USING fts5(body, language UNINDEXED, root UNINDEXED, kind UNINDEXED, target UNINDEXED, tokenize = 'unicode61 remove_diacritics 2')",
  ],
};

export default migration;
