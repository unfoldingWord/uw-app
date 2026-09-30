export type Testament = 'old' | 'new';

export type Book = {
  code: string;
  name: string;
  testament: Testament;
  order: number;
  chapters: number;
  aliases: readonly string[];
};

const oldTestament: readonly (readonly [string, string, number, ...string[]])[] = [
  ['GEN', 'Genesis', 50],
  ['EXO', 'Exodus', 40],
  ['LEV', 'Leviticus', 27],
  ['NUM', 'Numbers', 36],
  ['DEU', 'Deuteronomy', 34],
  ['JOS', 'Joshua', 24],
  ['JDG', 'Judges', 21],
  ['RUT', 'Ruth', 4],
  ['1SA', '1 Samuel', 31],
  ['2SA', '2 Samuel', 24],
  ['1KI', '1 Kings', 22],
  ['2KI', '2 Kings', 25],
  ['1CH', '1 Chronicles', 29],
  ['2CH', '2 Chronicles', 36],
  ['EZR', 'Ezra', 10],
  ['NEH', 'Nehemiah', 13],
  ['EST', 'Esther', 10],
  ['JOB', 'Job', 42],
  ['PSA', 'Psalms', 150, 'Psalm'],
  ['PRO', 'Proverbs', 31],
  ['ECC', 'Ecclesiastes', 12],
  ['SNG', 'Song of Songs', 8, 'Song of Solomon'],
  ['ISA', 'Isaiah', 66],
  ['JER', 'Jeremiah', 52],
  ['LAM', 'Lamentations', 5],
  ['EZK', 'Ezekiel', 48],
  ['DAN', 'Daniel', 12],
  ['HOS', 'Hosea', 14],
  ['JOL', 'Joel', 3],
  ['AMO', 'Amos', 9],
  ['OBA', 'Obadiah', 1],
  ['JON', 'Jonah', 4],
  ['MIC', 'Micah', 7],
  ['NAM', 'Nahum', 3],
  ['HAB', 'Habakkuk', 3],
  ['ZEP', 'Zephaniah', 3],
  ['HAG', 'Haggai', 2],
  ['ZEC', 'Zechariah', 14],
  ['MAL', 'Malachi', 4],
];

const newTestament: readonly (readonly [string, string, number, ...string[]])[] = [
  ['MAT', 'Matthew', 28],
  ['MRK', 'Mark', 16],
  ['LUK', 'Luke', 24],
  ['JHN', 'John', 21],
  ['ACT', 'Acts', 28],
  ['ROM', 'Romans', 16],
  ['1CO', '1 Corinthians', 16],
  ['2CO', '2 Corinthians', 13],
  ['GAL', 'Galatians', 6],
  ['EPH', 'Ephesians', 6],
  ['PHP', 'Philippians', 4],
  ['COL', 'Colossians', 4],
  ['1TH', '1 Thessalonians', 5],
  ['2TH', '2 Thessalonians', 3],
  ['1TI', '1 Timothy', 6],
  ['2TI', '2 Timothy', 4],
  ['TIT', 'Titus', 3],
  ['PHM', 'Philemon', 1],
  ['HEB', 'Hebrews', 13],
  ['JAS', 'James', 5],
  ['1PE', '1 Peter', 5],
  ['2PE', '2 Peter', 3],
  ['1JN', '1 John', 5],
  ['2JN', '2 John', 1],
  ['3JN', '3 John', 1],
  ['JUD', 'Jude', 1],
  ['REV', 'Revelation', 22],
];

function toBooks(
  rows: readonly (readonly [string, string, number, ...string[]])[],
  testament: Testament,
  offset: number,
): Book[] {
  return rows.map(([code, name, chapters, ...aliases], index) =>
    Object.freeze({ code, name, testament, order: offset + index + 1, chapters, aliases }),
  );
}

export const books: readonly Book[] = Object.freeze([
  ...toBooks(oldTestament, 'old', 0),
  ...toBooks(newTestament, 'new', oldTestament.length),
]);

const byCode = new Map(books.map((book) => [book.code, book]));

function squeeze(text: string): string {
  return text.toLowerCase().replace(/[\s.]+/g, '');
}

const byName = new Map(
  books.flatMap((book) => [book.name, ...book.aliases].map((name) => [squeeze(name), book] as const)),
);

export function bookByCode(code: string): Book | undefined {
  return byCode.get(code.toUpperCase());
}

export function findBook(text: string): Book | undefined {
  const key = squeeze(text);
  if (key.length === 0) {
    return undefined;
  }
  const exact = bookByCode(key) ?? byName.get(key);
  if (exact !== undefined) {
    return exact;
  }
  if (key.length < 3) {
    return undefined;
  }
  const candidates = new Set(
    [...byName.entries()].filter(([name]) => name.startsWith(key)).map(([, book]) => book),
  );
  return candidates.size === 1 ? [...candidates][0] : undefined;
}
