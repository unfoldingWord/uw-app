import { isTsv, isUsfm } from '../burrito/flavors';
import { bookByCode } from '../domain/books';
import { formatReference } from '../domain/reference';
import type { Db, DbTransaction, DbRow, SqlValue } from '../ports';
import { bookKeys } from './layout';
import type { Library } from './library';
import { stories } from './loaders';
import { blocksText, renderMarkdown } from './markdown';
import { assembleArticle } from './reading';
import { fullTextTables, type Entry, type IndexRow, type Tokenizer } from './tables';
import { noteRows, questionRows } from './tsv';
import type { CorpusKind, FullTextHit, IndexCost, LinkTarget } from './types';
import { parseUsfm } from './usfm';

type IndexKind = LinkTarget['kind'];

type IndexEntry = {
  readonly root: string;
  readonly kind: IndexKind;
  readonly target: string;
  readonly body: string;
};

export const indexedKinds: readonly CorpusKind[] = [
  'literal',
  'simplified',
  'original',
  'notes',
  'questions',
  'words',
  'academy',
  'stories',
];

const textKinds: readonly CorpusKind[] = ['literal', 'simplified', 'original'];
const hitLimit = 50;
const batchRows = 100;
const entryOverheadBytes = 96;
const averageVersesPerChapter = 26;
const longestVerseBytes = 400;
const shortestVerseBytes = 120;
const storageFactors: Readonly<Record<Tokenizer, number>> = { words: 3, trigram: 6 };
const shortestTrigram = 3;
const snippetCharacters = 48;
const queryWord = /[\p{L}\p{M}\p{N}]+/gu;
const letter = /[\p{L}\p{M}]/gu;
const space = /\s/gu;
const spacelessLanguages: readonly string[] = [
  'zh',
  'cmn',
  'yue',
  'wuu',
  'hak',
  'nan',
  'gan',
  'hsn',
  'cjy',
  'ja',
  'th',
  'lo',
  'km',
  'my',
  'bo',
  'dz',
  'ii',
  'shn',
  'blt',
];

function plainNote(text: string): string {
  return blocksText(
    renderMarkdown(text, { base: { resource: 'other', path: '' }, titleOf: () => undefined }),
  );
}

function entryOf(root: string, kind: IndexKind, target: string, body: string): IndexEntry[] {
  const trimmed = body.trim();
  return trimmed === '' ? [] : [{ root, kind, target, body: trimmed }];
}

async function* textEntries(library: Library, entry: Entry): AsyncGenerator<IndexEntry> {
  const reader = await library.reader(entry);
  const keys = bookKeys(reader, isUsfm);
  for (const code of entry.books) {
    const key = keys.get(code);
    if (key === undefined) {
      continue;
    }
    const book = parseUsfm(await reader.read(key));
    for (const verses of book.chapters.values()) {
      for (const verse of verses) {
        yield* entryOf(
          entry.root,
          'passage',
          formatReference({ book: code, start: { chapter: verse.chapter, verse: verse.verse } }),
          verse.text,
        );
      }
    }
  }
}

async function* helpsEntries(library: Library, entry: Entry): AsyncGenerator<IndexEntry> {
  const reader = await library.reader(entry);
  const keys = bookKeys(reader, isTsv);
  for (const code of entry.books) {
    const key = keys.get(code);
    if (key === undefined) {
      continue;
    }
    const text = await reader.read(key);
    const rows =
      entry.kind === 'notes'
        ? noteRows(text).map((row) => ({ reference: row.reference, body: plainNote(row.note) }))
        : questionRows(text).map((row) => ({
            reference: row.reference,
            body: `${row.question}\n${row.response}`,
          }));
    for (const row of rows) {
      const range = row.reference.kind === 'verses' ? row.reference.ranges[0] : undefined;
      if (range !== undefined) {
        yield* entryOf(entry.root, 'passage', formatReference({ book: code, start: range.start }), row.body);
      }
    }
  }
}

async function* collect(library: Library, language: string): AsyncGenerator<IndexEntry> {
  for (const entry of library.of(language, textKinds)) {
    yield* textEntries(library, entry);
  }
  for (const entry of library.of(language, ['notes', 'questions'])) {
    yield* helpsEntries(library, entry);
  }
  for (const row of library.titles(language)) {
    if (row.kind === 'story') {
      continue;
    }
    const article = await assembleArticle(library, row.target, language);
    if (article !== undefined && article.provenance === library.byRoot(row.root)?.provenance) {
      yield* entryOf(row.root, 'article', row.target, `${article.title}\n${blocksText(article.blocks)}`);
    }
  }
  for (const entry of library.of(language, ['stories'])) {
    for (const story of (await stories(library, entry)).values()) {
      yield* entryOf(
        entry.root,
        'story',
        String(story.number),
        [story.title, ...story.frames.map((frame) => frame.text)].join('\n'),
      );
    }
  }
}

function baseOf(language: string): string {
  return language.toLowerCase().split('-')[0] ?? language;
}

export function tokenizerFor(language: string, sample: readonly string[] = []): Tokenizer {
  if (spacelessLanguages.includes(baseOf(language))) {
    return 'trigram';
  }
  const text = sample.join(' ');
  const letters = text.match(letter)?.length ?? 0;
  const spaces = text.match(space)?.length ?? 0;
  return letters >= 200 && spaces * 50 < letters ? 'trigram' : 'words';
}

export function hasIndexedText(library: Library, language: string): boolean {
  return library.of(language, indexedKinds).length > 0;
}

export function estimateIndex(library: Library, language: string): IndexCost {
  let entries = 0;
  let text = 0;
  for (const entry of library.of(language, indexedKinds)) {
    if (textKinds.includes(entry.kind)) {
      const inScope = entry.books.reduce(
        (sum, code) => sum + (bookByCode(code)?.chapters ?? 0) * averageVersesPerChapter,
        0,
      );
      const verses = Math.max(1, Math.min(inScope, Math.ceil(entry.bytes / shortestVerseBytes)));
      entries += verses;
      text += Math.min(entry.bytes, verses * longestVerseBytes);
    } else {
      entries += entry.items;
      text += entry.bytes;
    }
  }
  const factor = storageFactors[tokenizerFor(language)];
  return { entries, bytes: text * factor + entries * entryOverheadBytes };
}

function number(row: DbRow | undefined): number {
  const value = row?.total;
  return typeof value === 'number' ? value : 0;
}

async function storedBytes(transaction: DbTransaction, table: string): Promise<number> {
  const data = await transaction.get(`SELECT COALESCE(SUM(LENGTH(block)), 0) AS total FROM ${table}_data`);
  const columns = [0, 1, 2, 3, 4, 5].map((column) => `LENGTH(CAST(c${column} AS BLOB))`).join(' + ');
  const content = await transaction.get(`SELECT COALESCE(SUM(${columns}), 0) AS total FROM ${table}_content`);
  const sizes = await transaction.get(`SELECT COALESCE(SUM(LENGTH(sz)), 0) AS total FROM ${table}_docsize`);
  return number(data) + number(content) + number(sizes);
}

async function optimize(transaction: DbTransaction, table: string): Promise<void> {
  await transaction.run(`INSERT INTO ${table} (${table}) VALUES ('optimize')`);
}

async function insertBatch(
  db: Db,
  table: string,
  language: string,
  generation: number,
  batch: readonly IndexEntry[],
): Promise<void> {
  if (batch.length === 0) {
    return;
  }
  const values = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const params: SqlValue[] = batch.flatMap((entry) => [
    entry.body,
    language,
    generation,
    entry.root,
    entry.kind,
    entry.target,
  ]);
  await db.transaction((transaction) =>
    transaction.run(
      `INSERT INTO ${table} (body, language, generation, root, kind, target) VALUES ${values}`,
      params,
    ),
  );
}

async function removeGenerations(
  transaction: DbTransaction,
  language: string,
  keep: number | undefined,
): Promise<void> {
  for (const table of Object.values(fullTextTables)) {
    await transaction.run(`DELETE FROM ${table} WHERE language = ? AND generation != ?`, [
      language,
      keep ?? -1,
    ]);
  }
}

export async function buildIndex(
  library: Library,
  db: Db,
  language: string,
  previous: IndexRow | undefined,
): Promise<IndexRow> {
  const generation = (previous?.generation ?? 0) + 1;
  const entries = collect(library, language);
  const first: IndexEntry[] = [];
  let next = await entries.next();
  while (next.done !== true && first.length < batchRows) {
    first.push(next.value);
    next = await entries.next();
  }
  const tokenizer = tokenizerFor(
    language,
    first.map((entry) => entry.body),
  );
  const table = fullTextTables[tokenizer];
  const before = await db.transaction(async (transaction) => {
    await removeGenerations(transaction, language, previous?.generation);
    await optimize(transaction, table);
    return storedBytes(transaction, table);
  });
  let count = first.length;
  await insertBatch(db, table, language, generation, first);
  let batch: IndexEntry[] = [];
  while (next.done !== true) {
    batch.push(next.value);
    count += 1;
    if (batch.length === batchRows) {
      await insertBatch(db, table, language, generation, batch);
      batch = [];
    }
    next = await entries.next();
  }
  await insertBatch(db, table, language, generation, batch);
  const kept = previous !== undefined && previous.tokenizer === tokenizer ? previous.bytes : 0;
  return db.transaction(async (transaction) => {
    await removeGenerations(transaction, language, generation);
    await optimize(transaction, table);
    const bytes = Math.max(0, (await storedBytes(transaction, table)) - before + kept);
    await transaction.run('DELETE FROM corpus_indexes WHERE language = ?', [language]);
    await transaction.run(
      'INSERT INTO corpus_indexes (language, entries, bytes, tokenizer, generation) VALUES (?, ?, ?, ?, ?)',
      [language, count, bytes, tokenizer, generation],
    );
    return { language, built: true, entries: count, bytes, tokenizer, generation };
  });
}

export function matchTerms(query: string): string[] {
  return [...query.matchAll(queryWord)].map((match) => match[0]);
}

function quoted(terms: readonly string[]): string {
  return terms.map((term) => `"${term}"`).join(' ');
}

function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function targetOf(kind: string, target: string): LinkTarget | undefined {
  switch (kind) {
    case 'passage':
      return { kind: 'passage', reference: target };
    case 'article':
      return { kind: 'article', id: target };
    case 'story':
      return { kind: 'story', story: Number(target) };
    default:
      return undefined;
  }
}

function text(row: DbRow, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : '';
}

function around(body: string, terms: readonly string[]): string {
  const characters = [...body];
  const found = terms.map((term) => body.indexOf(term)).filter((index) => index >= 0);
  const at = found.length === 0 ? 0 : Math.min(...found);
  const start = Math.max(0, [...body.slice(0, at)].length - snippetCharacters / 2);
  const shown = characters.slice(start, start + snippetCharacters).join('');
  return `${start > 0 ? '…' : ''}${shown}${start + snippetCharacters < characters.length ? '…' : ''}`;
}

async function matchingRows(db: Db, row: IndexRow, terms: readonly string[]): Promise<readonly DbRow[]> {
  const table = fullTextTables[row.tokenizer];
  const short = row.tokenizer === 'trigram' ? terms.filter((term) => [...term].length < shortestTrigram) : [];
  const long = terms.filter((term) => !short.includes(term));
  const filters = ['language = ?', 'generation = ?', ...short.map(() => "body LIKE ? ESCAPE '\\'")];
  const params: SqlValue[] = [row.language, row.generation, ...short.map(likePattern)];
  if (long.length > 0) {
    return db.all(
      `SELECT root, kind, target, body, snippet(${table}, 0, '', '', '…', 12) AS snippet FROM ${table} WHERE ${table} MATCH ? AND ${filters.join(' AND ')} ORDER BY rank LIMIT ?`,
      [quoted(long), ...params, hitLimit * 2],
    );
  }
  return db.all(
    `SELECT root, kind, target, body FROM ${table} WHERE ${filters.join(' AND ')} ORDER BY rowid LIMIT ?`,
    [...params, hitLimit * 2],
  );
}

export async function searchIndex(
  library: Library,
  db: Db,
  query: string,
  language: string,
): Promise<FullTextHit[]> {
  const terms = matchTerms(query);
  const row = library.indexRow(language);
  if (terms.length === 0 || row === undefined) {
    return [];
  }
  const rows = await matchingRows(db, row, terms);
  const seen = new Set<string>();
  const hits: FullTextHit[] = [];
  for (const found of rows) {
    const entry = library.byRoot(text(found, 'root'));
    const target = targetOf(text(found, 'kind'), text(found, 'target'));
    const key = `${text(found, 'kind')}:${text(found, 'target')}`;
    if (entry === undefined || target === undefined || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const snippet = text(found, 'snippet');
    hits.push({
      target,
      snippet: snippet === '' ? around(text(found, 'body'), terms) : snippet,
      provenance: entry.provenance,
    });
  }
  return hits.slice(0, hitLimit);
}
