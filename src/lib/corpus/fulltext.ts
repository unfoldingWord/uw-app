import { utf8 } from '../burrito/files';
import { formatReference } from '../domain/reference';
import type { Db, DbSession, Row } from '../ports';
import type { Library } from './library';
import { bookNotes, bookQuestions, stories, textBook } from './loaders';
import { blocksText, renderMarkdown } from './markdown';
import { assembleArticle } from './reading';
import { clearIndex, fullTextTable, type IndexRow } from './tables';
import type { FullTextHit, IndexCost, LinkTarget } from './types';

type IndexKind = LinkTarget['kind'];

type IndexEntry = {
  readonly root: string;
  readonly kind: IndexKind;
  readonly target: string;
  readonly body: string;
};

const hitLimit = 50;
const storageFactor = 3;
const entryOverheadBytes = 96;
const queryWord = /[\p{L}\p{M}\p{N}]+/gu;

function plainNote(text: string): string {
  return blocksText(
    renderMarkdown(text, { base: { resource: 'other', path: '' }, titleOf: () => undefined }),
  );
}

async function collect(library: Library, language: string): Promise<IndexEntry[]> {
  const found: IndexEntry[] = [];
  const add = (root: string, kind: IndexKind, target: string, body: string): void => {
    const trimmed = body.trim();
    if (trimmed !== '') {
      found.push({ root, kind, target, body: trimmed });
    }
  };
  for (const entry of library.of(language, ['literal', 'simplified', 'original'])) {
    for (const code of entry.books) {
      const book = await textBook(library, entry, code);
      for (const verses of book?.chapters.values() ?? []) {
        for (const verse of verses) {
          add(
            entry.root,
            'passage',
            formatReference({ book: code, start: { chapter: verse.chapter, verse: verse.verse } }),
            verse.text,
          );
        }
      }
    }
  }
  for (const entry of library.of(language, ['notes', 'questions'])) {
    for (const code of entry.books) {
      const rows =
        entry.kind === 'notes'
          ? (await bookNotes(library, entry, code)).map((row) => ({
              reference: row.reference,
              body: plainNote(row.note),
            }))
          : (await bookQuestions(library, entry, code)).map((row) => ({
              reference: row.reference,
              body: `${row.question}\n${row.response}`,
            }));
      for (const row of rows) {
        const range = row.reference.kind === 'verses' ? row.reference.ranges[0] : undefined;
        if (range !== undefined) {
          add(entry.root, 'passage', formatReference({ book: code, start: range.start }), row.body);
        }
      }
    }
  }
  for (const row of library.titles(language)) {
    if (row.kind === 'story') {
      continue;
    }
    const article = await assembleArticle(library, row.target, language);
    if (article !== undefined && article.provenance === library.byRoot(row.root)?.provenance) {
      add(row.root, 'article', row.target, `${article.title}\n${blocksText(article.blocks)}`);
    }
  }
  for (const entry of library.of(language, ['stories'])) {
    for (const story of (await stories(library, entry)).values()) {
      add(
        entry.root,
        'story',
        String(story.number),
        [story.title, ...story.frames.map((frame) => frame.text)].join('\n'),
      );
    }
  }
  return found;
}

export async function estimateIndex(library: Library, language: string): Promise<IndexCost> {
  const entries = await collect(library, language);
  const text = entries.reduce((sum, entry) => sum + utf8(entry.body).byteLength, 0);
  return { entries: entries.length, bytes: text * storageFactor + entries.length * entryOverheadBytes };
}

function number(row: Row | undefined): number {
  const value = row?.total;
  return typeof value === 'number' ? value : 0;
}

async function storedBytes(session: DbSession): Promise<number> {
  const data = await session.get(
    `SELECT COALESCE(SUM(LENGTH(block)), 0) AS total FROM ${fullTextTable}_data`,
  );
  const content = await session.get(
    `SELECT COALESCE(SUM(LENGTH(CAST(c0 AS BLOB)) + LENGTH(CAST(c1 AS BLOB)) + LENGTH(CAST(c2 AS BLOB)) + LENGTH(CAST(c3 AS BLOB)) + LENGTH(CAST(c4 AS BLOB))), 0) AS total FROM ${fullTextTable}_content`,
  );
  const sizes = await session.get(
    `SELECT COALESCE(SUM(LENGTH(sz)), 0) AS total FROM ${fullTextTable}_docsize`,
  );
  return number(data) + number(content) + number(sizes);
}

async function optimize(session: DbSession): Promise<void> {
  await session.run(`INSERT INTO ${fullTextTable} (${fullTextTable}) VALUES ('optimize')`);
}

export async function buildIndex(library: Library, db: Db, language: string): Promise<IndexRow> {
  const entries = await collect(library, language);
  return db.transaction(async (session) => {
    await clearIndex(session, language);
    await optimize(session);
    const before = await storedBytes(session);
    for (const entry of entries) {
      await session.run(
        `INSERT INTO ${fullTextTable} (body, language, root, kind, target) VALUES (?, ?, ?, ?, ?)`,
        [entry.body, language, entry.root, entry.kind, entry.target],
      );
    }
    await optimize(session);
    const bytes = Math.max(0, (await storedBytes(session)) - before);
    await session.run('INSERT INTO corpus_indexes (language, entries, bytes) VALUES (?, ?, ?)', [
      language,
      entries.length,
      bytes,
    ]);
    return { language, built: true, entries: entries.length, bytes };
  });
}

export function matchQuery(query: string): string | undefined {
  const words = [...query.matchAll(queryWord)].map((match) => `"${match[0]}"`);
  return words.length === 0 ? undefined : words.join(' ');
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

function text(row: Row, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : '';
}

export async function searchIndex(
  library: Library,
  db: Db,
  query: string,
  language: string,
): Promise<FullTextHit[]> {
  const match = matchQuery(query);
  if (match === undefined || !library.index(language).built) {
    return [];
  }
  const rows = await db.all(
    `SELECT root, kind, target, snippet(${fullTextTable}, 0, '', '', '…', 12) AS snippet FROM ${fullTextTable} WHERE ${fullTextTable} MATCH ? AND language = ? ORDER BY rank LIMIT ?`,
    [match, language, hitLimit * 2],
  );
  const seen = new Set<string>();
  const hits: FullTextHit[] = [];
  for (const row of rows) {
    const entry = library.byRoot(text(row, 'root'));
    const target = targetOf(text(row, 'kind'), text(row, 'target'));
    const key = `${text(row, 'kind')}:${text(row, 'target')}`;
    if (entry === undefined || target === undefined || seen.has(key)) {
      continue;
    }
    seen.add(key);
    hits.push({ target, snippet: text(row, 'snippet'), provenance: entry.provenance });
  }
  return hits.slice(0, hitLimit);
}
