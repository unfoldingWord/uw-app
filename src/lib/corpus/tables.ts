import type { RowId } from '../burrito/flavors';
import { isProvenance, type Provenance } from '../domain/provenance';
import type { Db, DbSession, Row } from '../ports';
import type { CorpusKind, Direction, IndexStatus, TitleKind } from './types';

export const fullTextTable = 'corpus_fulltext';

export const corpusTables: readonly string[] = [
  'corpus_burritos',
  'corpus_titles',
  'corpus_indexes',
  fullTextTable,
  ...['data', 'idx', 'content', 'docsize', 'config'].map((shadow) => `${fullTextTable}_${shadow}`),
];

export type Entry = {
  readonly root: string;
  readonly pack: string;
  readonly rowId: RowId;
  readonly kind: CorpusKind;
  readonly language: string;
  readonly direction: Direction;
  readonly provenance: Provenance;
  readonly books: readonly string[];
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

export type IndexRow = IndexStatus & { readonly language: string };

function text(row: Row, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : '';
}

function count(row: Row, column: string): number {
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

function entryOf(row: Row): Entry | undefined {
  const provenance = parsed(text(row, 'provenance'));
  const books = parsed(text(row, 'books'));
  if (!isProvenance(provenance) || !Array.isArray(books)) {
    return undefined;
  }
  return {
    root: text(row, 'root'),
    pack: text(row, 'pack'),
    rowId: text(row, 'row') as RowId,
    kind: text(row, 'kind') as CorpusKind,
    language: text(row, 'language'),
    direction: text(row, 'direction') === 'rtl' ? 'rtl' : 'ltr',
    provenance,
    books: books.filter((book): book is string => typeof book === 'string'),
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
  const rows = await db.all('SELECT language, entries, bytes FROM corpus_indexes ORDER BY language');
  return rows.map((row) => ({
    language: text(row, 'language'),
    built: true,
    entries: count(row, 'entries'),
    bytes: count(row, 'bytes'),
  }));
}

export async function removeRoot(session: DbSession, root: string): Promise<void> {
  await session.run('DELETE FROM corpus_burritos WHERE root = ?', [root]);
  await session.run('DELETE FROM corpus_titles WHERE root = ?', [root]);
}

export async function saveEntry(
  session: DbSession,
  entry: Entry,
  titles: readonly TitleRow[],
): Promise<void> {
  await removeRoot(session, entry.root);
  await session.run(
    'INSERT INTO corpus_burritos (root, pack, row, kind, language, direction, provenance, books, items, bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      entry.root,
      entry.pack,
      entry.rowId,
      entry.kind,
      entry.language,
      entry.direction,
      JSON.stringify(entry.provenance),
      JSON.stringify(entry.books),
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

export async function clearIndex(session: DbSession, language: string): Promise<void> {
  await session.run(`DELETE FROM ${fullTextTable} WHERE language = ?`, [language]);
  await session.run('DELETE FROM corpus_indexes WHERE language = ?', [language]);
}
