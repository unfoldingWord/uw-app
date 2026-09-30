import type { Migration } from '@lib/ports';

const migration: Migration = {
  id: '0102-corpus-book-names',
  statements: ["ALTER TABLE corpus_burritos ADD COLUMN book_names TEXT NOT NULL DEFAULT '{}'"],
};

export default migration;
