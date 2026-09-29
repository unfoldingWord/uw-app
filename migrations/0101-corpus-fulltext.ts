import type { Migration } from '@lib/ports';

const columns =
  'body, language UNINDEXED, generation UNINDEXED, root UNINDEXED, kind UNINDEXED, target UNINDEXED';

const migration: Migration = {
  id: '0101-corpus-fulltext',
  statements: [
    'CREATE TABLE corpus_index_wanted (language TEXT PRIMARY KEY NOT NULL)',
    'INSERT INTO corpus_index_wanted (language) SELECT language FROM corpus_indexes',
    'DELETE FROM corpus_indexes',
    "ALTER TABLE corpus_indexes ADD COLUMN tokenizer TEXT NOT NULL DEFAULT 'words'",
    'ALTER TABLE corpus_indexes ADD COLUMN generation INTEGER NOT NULL DEFAULT 0',
    'DROP TABLE corpus_fulltext',
    `CREATE VIRTUAL TABLE corpus_fulltext USING fts5(${columns}, tokenize = 'unicode61 remove_diacritics 2')`,
    `CREATE VIRTUAL TABLE corpus_fulltext_trigram USING fts5(${columns}, tokenize = 'trigram remove_diacritics 1')`,
  ],
};

export default migration;
