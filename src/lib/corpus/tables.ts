import { resourceRows, type PackId, type ResourceRow } from '../domain/pack';
import { isProvenance, type Provenance } from '../domain/provenance';
import type { Db, DbTransaction, DbRow } from '../ports';
import type { CorpusKind, Direction, IndexStatus, TitleKind } from './types';

const tokenizers = ['words', 'trigram'] as const;

export type Tokenizer = (typeof tokenizers)[number];

export const fullTextTables: Readonly<Record<Tokenizer, string>> = {
  words: 'corpus_fulltext',
  trigram: 'corpus_fulltext_trigram',
};

const shadowTables = ['data', 'idx', 'content', 'docsize', 'config'];

export const corpusTables: readonly string[] = [
  'corpus_burritos',
  'corpus_titles',
  'corpus_indexes',
  'corpus_index_wanted',
  ...Object.values(fullTextTables).flatMap((table) => [
    table,
    ...shadowTables.map((shadow) => `${table}_${shadow}`),
  ]),
];

export type Entry = {
  readonly root: string;
  readonly pack: PackId;
  readonly rowId: ResourceRow;
  readonly kind: CorpusKind;
  readonly language: string;
  readonly direction: Direction;
  readonly provenance: Provenance;
  readonly books: readonly string[];
  readonly bookNames: Readonly<Record<string, string>>;
  readonly items: number;
  readonly bytes: number;
};

export type TitleRow = {
  readonly root: string;
  readonly language: string;
  readonly kind: TitleKind;
  readonly target: string;
  readonly title: string;
};

export type IndexRow = IndexStatus & {
  readonly language: string;
  readonly tokenizer: Tokenizer;
  readonly generation: number;
};

function text(row: DbRow, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : '';
}

function count(row: DbRow, column: string): number {
  const value = row[column];
  return typeof value === 'number' ? value : 0;
}

function parsed(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function namesOf(json: string): Record<string, string> {
  const value = parsed(json);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((pair): pair is [string, string] => typeof pair[1] === 'string'),
  );
}

function entryOf(row: DbRow): Entry | undefined {
  const provenance = parsed(text(row, 'provenance'));
  const books = parsed(text(row, 'books'));
  const rowId = resourceRows.find((candidate) => candidate === text(row, 'row'));
  if (!isProvenance(provenance) || !Array.isArray(books) || rowId === undefined) {
    return undefined;
  }
  return {
    root: text(row, 'root'),
    pack: text(row, 'pack'),
    rowId,
    kind: text(row, 'kind') as CorpusKind,
    language: text(row, 'language'),
    direction: text(row, 'direction') === 'rtl' ? 'rtl' : 'ltr',
    provenance,
    books: books.filter((book): book is string => typeof book === 'string'),
    bookNames: namesOf(text(row, 'book_names')),
    items: count(row, 'items'),
    bytes: count(row, 'bytes'),
  };
}

export async function loadEntries(db: Db): Promise<Entry[]> {
  const rows = await db.all('SELECT * FROM corpus_burritos ORDER BY root');
  return rows.flatMap((row) => entryOf(row) ?? []);
}

export async function loadTitles(db: Db): Promise<TitleRow[]> {
  const rows = await db.all(
    'SELECT root, language, kind, target, title FROM corpus_titles ORDER BY root, target',
  );
  return rows.map((row) => ({
    root: text(row, 'root'),
    language: text(row, 'language'),
    kind: text(row, 'kind') as TitleKind,
    target: text(row, 'target'),
    title: text(row, 'title'),
  }));
}

export async function loadIndexes(db: Db): Promise<IndexRow[]> {
  const rows = await db.all(
    'SELECT language, entries, bytes, tokenizer, generation FROM corpus_indexes ORDER BY language',
  );
  return rows.map((row) => ({
    language: text(row, 'language'),
    built: true,
    entries: count(row, 'entries'),
    bytes: count(row, 'bytes'),
    tokenizer: tokenizers.find((item) => item === text(row, 'tokenizer')) ?? 'words',
    generation: count(row, 'generation'),
  }));
}

export async function loadWanted(db: Db): Promise<string[]> {
  const rows = await db.all('SELECT language FROM corpus_index_wanted ORDER BY language');
  return rows.map((row) => text(row, 'language'));
}

export async function setWanted(session: DbTransaction, language: string, wanted: boolean): Promise<void> {
  await session.run('DELETE FROM corpus_index_wanted WHERE language = ?', [language]);
  if (wanted) {
    await session.run('INSERT INTO corpus_index_wanted (language) VALUES (?)', [language]);
  }
}

export async function removeRoot(session: DbTransaction, root: string): Promise<void> {
  await session.run('DELETE FROM corpus_burritos WHERE root = ?', [root]);
  await session.run('DELETE FROM corpus_titles WHERE root = ?', [root]);
}

export async function saveEntry(
  session: DbTransaction,
  entry: Entry,
  titles: readonly TitleRow[],
): Promise<void> {
  await removeRoot(session, entry.root);
  await session.run(
    'INSERT INTO corpus_burritos (root, pack, row, kind, language, direction, provenance, books, book_names, items, bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      entry.root,
      entry.pack,
      entry.rowId,
      entry.kind,
      entry.language,
      entry.direction,
      JSON.stringify(entry.provenance),
      JSON.stringify(entry.books),
      JSON.stringify(entry.bookNames),
      entry.items,
      entry.bytes,
    ],
  );
  for (const title of titles) {
    await session.run(
      'INSERT INTO corpus_titles (root, language, kind, target, title) VALUES (?, ?, ?, ?, ?)',
      [title.root, title.language, title.kind, title.target, title.title],
    );
  }
}

export async function clearIndex(session: DbTransaction, language: string): Promise<void> {
  for (const table of Object.values(fullTextTables)) {
    await session.run(`DELETE FROM ${table} WHERE language = ?`, [language]);
  }
  await session.run('DELETE FROM corpus_indexes WHERE language = ?', [language]);
}
