import { unzipSync, zipSync, type Zippable } from 'fflate';
import { md5Hex } from '@lib/burrito/files';

const bibleBooks: readonly string[] = [
  'GEN',
  'EXO',
  'LEV',
  'NUM',
  'DEU',
  'JOS',
  'JDG',
  'RUT',
  '1SA',
  '2SA',
  '1KI',
  '2KI',
  '1CH',
  '2CH',
  'EZR',
  'NEH',
  'EST',
  'JOB',
  'PSA',
  'PRO',
  'ECC',
  'SNG',
  'ISA',
  'JER',
  'LAM',
  'EZK',
  'DAN',
  'HOS',
  'JOL',
  'AMO',
  'OBA',
  'JON',
  'MIC',
  'NAM',
  'HAB',
  'ZEP',
  'HAG',
  'ZEC',
  'MAL',
  'MAT',
  'MRK',
  'LUK',
  'JHN',
  'ACT',
  'ROM',
  '1CO',
  '2CO',
  'GAL',
  'EPH',
  'PHP',
  'COL',
  '1TH',
  '2TH',
  '1TI',
  '2TI',
  'TIT',
  'PHM',
  'HEB',
  'JAS',
  '1PE',
  '2PE',
  '1JN',
  '2JN',
  '3JN',
  'JUD',
  'REV',
];

export type ScaleTarget = { readonly bytes: number; readonly articles?: number };

export const englishTargets: Readonly<Record<string, ScaleTarget>> = {
  ult: { bytes: 76_900_000 },
  ust: { bytes: 89_400_000 },
  tn: { bytes: 32_900_000 },
  twl: { bytes: 7_700_000, articles: 1000 },
  tw: { bytes: 9_200_000, articles: 1000 },
  tq: { bytes: 4_000_000 },
  ta: { bytes: 3_000_000, articles: 700 },
};

type IngredientEntry = {
  checksum: { md5: string };
  mimeType: string;
  size: number;
  scope?: Record<string, string[]>;
};

type Metadata = {
  ingredients: Record<string, IngredientEntry>;
  type: { flavorType: { currentScope?: Record<string, string[]> } };
} & Record<string, unknown>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function scaledUsfm(template: string, book: string, perBook: number): { text: string; chapters: string[] } {
  const first = template.indexOf('\\c ');
  const header = (first < 0 ? template : template.slice(0, first)).replace(/\\id \S+/, `\\id ${book}`);
  const rest = first < 0 ? '' : template.slice(first);
  const second = rest.indexOf('\\c ', 3);
  const chapterBody = (second < 0 ? rest : rest.slice(0, second)).replace(/^\\c \d+\s*/, '');
  const parts: string[] = [header];
  const chapters: string[] = [];
  let size = header.length;
  let chapter = 0;
  while (size < perBook && chapterBody.length > 0) {
    chapter += 1;
    const block = `\\c ${chapter}\n${chapterBody}`;
    parts.push(block);
    chapters.push(String(chapter));
    size += block.length;
  }
  return { text: parts.join(''), chapters };
}

let minted = 0;

function mintId(): string {
  minted += 1;
  const base = minted.toString(36).padStart(3, '0');
  return `x${base.slice(-3)}`;
}

function scaledTsv(template: string, perBook: number): string {
  const lines = template.split('\n').filter((line) => line.length > 0);
  const [header, ...rows] = lines;
  const verseRows = rows.filter((row) => /^\d+:\d+\t/.test(row));
  const source = verseRows.length > 0 ? verseRows : rows;
  const out: string[] = [header ?? ''];
  let size = (header ?? '').length;
  let chapter = 1;
  while (size < perBook && source.length > 0) {
    for (const row of source) {
      const cells = row.split('\t');
      cells[0] = (cells[0] ?? '1:1').replace(/^\d+/, String(chapter));
      cells[1] = mintId();
      const line = cells.join('\t');
      out.push(line);
      size += line.length + 1;
    }
    chapter += 1;
  }
  return `${out.join('\n')}\n`;
}

function bookOf(name: string): string | undefined {
  const match = /([1-3A-Z]{3})\.(usfm|tsv)$/.exec(name);
  const code = match?.[1];
  return code !== undefined && bibleBooks.includes(code) ? code : undefined;
}

export function scaleArchive(archive: Uint8Array, target: ScaleTarget): Uint8Array {
  const files = unzipSync(archive);
  const names = Object.keys(files);
  const root = names[0]?.split('/')[0] ?? '';
  const prefix = `${root}/`;
  const metadataKey = `${prefix}metadata.json`;
  const metadata = JSON.parse(decoder.decode(files[metadataKey])) as Metadata;
  const output: Record<string, Uint8Array> = {};
  const ingredients: Record<string, IngredientEntry> = {};
  const scope: Record<string, string[]> = {};
  const books = names.filter(
    (name) => bookOf(name) !== undefined && name.startsWith(`${prefix}ingredients/`),
  );
  const perBook = Math.ceil(target.bytes / bibleBooks.length);
  const templateOf = (extension: string): string | undefined => {
    const found = books
      .filter((name) => name.endsWith(extension))
      .sort((a, b) => (files[b]?.length ?? 0) - (files[a]?.length ?? 0))[0];
    return found === undefined ? undefined : decoder.decode(files[found]);
  };
  const add = (path: string, bytes: Uint8Array, entry: Omit<IngredientEntry, 'checksum' | 'size'>): void => {
    output[`${prefix}${path}`] = bytes;
    ingredients[path] = { checksum: { md5: md5Hex(bytes) }, size: bytes.length, ...entry };
  };
  const usfm = templateOf('.usfm');
  const tsv = templateOf('.tsv');
  const usfmEntry = books.find((name) => name.endsWith('.usfm'));
  const tsvEntry = books.find((name) => name.endsWith('.tsv'));
  for (const book of bibleBooks) {
    if (usfm !== undefined && usfmEntry !== undefined) {
      const scaled = scaledUsfm(usfm, book, perBook);
      const mimeType = metadata.ingredients[usfmEntry.slice(prefix.length)]?.mimeType ?? 'text/x-usfm';
      add(`ingredients/${book}.usfm`, encoder.encode(scaled.text), {
        mimeType,
        scope: { [book]: scaled.chapters },
      });
      scope[book] = scaled.chapters;
    }
    if (tsv !== undefined && tsvEntry !== undefined) {
      const path = tsvEntry.slice(prefix.length).replace(/[1-3A-Z]{3}\.tsv$/, `${book}.tsv`);
      const mimeType =
        metadata.ingredients[tsvEntry.slice(prefix.length)]?.mimeType ?? 'text/tab-separated-values';
      add(path, encoder.encode(scaledTsv(tsv, perBook)), { mimeType, scope: { [book]: [] } });
      scope[book] = [];
    }
  }
  const articles = names.filter(
    (name) =>
      name.startsWith(`${prefix}ingredients/`) && name.endsWith('.md') && !name.endsWith('LICENSE.md'),
  );
  const copies =
    target.articles === undefined || articles.length === 0 ? 1 : Math.ceil(target.articles / articles.length);
  for (const name of names) {
    const path = name.slice(prefix.length);
    const bytes = files[name];
    if (bytes === undefined || name.endsWith('/') || name === metadataKey) {
      continue;
    }
    if (books.includes(name)) {
      continue;
    }
    const entry = metadata.ingredients[path];
    if (entry === undefined) {
      output[name] = bytes;
      continue;
    }
    const rest = { mimeType: entry.mimeType, ...(entry.scope ? { scope: entry.scope } : {}) };
    add(path, bytes, rest);
    if (articles.includes(name)) {
      for (let copy = 1; copy < copies; copy += 1) {
        const copied = path.replace(/\/([^/]+)\/([^/]+)$/, `/$1-x${copy}/$2`);
        add(copied, bytes, rest);
      }
    }
  }
  metadata.ingredients = ingredients;
  if (Object.keys(scope).length > 0) {
    metadata.type.flavorType.currentScope = scope;
  }
  output[metadataKey] = encoder.encode(`${JSON.stringify(metadata, null, 2)}\n`);
  const zippable: Zippable = {};
  for (const name of Object.keys(output).sort()) {
    const bytes = output[name];
    if (bytes !== undefined) {
      zippable[name] = [bytes, { level: 6 }];
    }
  }
  return zipSync(zippable);
}
