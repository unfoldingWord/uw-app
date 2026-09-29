import { utf8 } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { bookByCode } from '@lib/domain/books';
import type { LocalBurrito } from './burritos';

const syllables = ['ka', 'lo', 'mi', 'sa', 'tu', 'ne', 'ra', 'vi', 'do', 'pe', 'go', 'shu', 'an', 'el', 'or'];
const hebrew = [
  'אֱלֹהִים',
  'בָּרָא',
  'הָאָרֶץ',
  'שָׁמַיִם',
  'וַיֹּאמֶר',
  'אוֹר',
  'יוֹם',
  'לַיְלָה',
  'מַיִם',
  'רוּחַ',
];

function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

export function alignedBook(code: string, versesPerChapter: number, wordsPerVerse: number, seed = 7): string {
  const book = bookByCode(code);
  if (book === undefined) {
    throw new Error(`${code} is not a book`);
  }
  const next = generator(seed);
  const word = (): string =>
    Array.from({ length: 1 + (next() % 3) }, () => syllables[next() % syllables.length] ?? 'ka').join('');
  const lines = [`\\id ${code}`, `\\h ${code}`];
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    lines.push(`\\c ${chapter}`, '\\p');
    for (let verse = 1; verse <= versesPerChapter; verse += 1) {
      const parts: string[] = [];
      for (let index = 0; index < wordsPerVerse; index += 1) {
        const content = hebrew[next() % hebrew.length] ?? 'אוֹר';
        parts.push(
          `\\zaln-s |x-strong="H${1000 + (next() % 8000)}" x-lemma="${content}" x-morph="He,Ncmpa" x-occurrence="1" x-occurrences="1" x-content="${content}"\\*\\w ${word()}|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*`,
        );
      }
      lines.push(`\\v ${verse} ${parts.join(' ')}.`);
    }
  }
  return lines.join('\n');
}

export function largeText(
  resource: string,
  language: string,
  books: readonly string[],
  versesPerChapter: number,
  wordsPerVerse: number,
): LocalBurrito {
  return {
    resource,
    language,
    abbreviation: 'ult',
    name: 'Literal text',
    flavorType: 'scripture',
    flavor: 'textTranslation',
    ingredients: books.map((code, index) => {
      const book = bookByCode(code);
      return {
        path: `${String(index + 1).padStart(2, '0')}-${code}.usfm`,
        bytes: utf8(alignedBook(code, versesPerChapter, wordsPerVerse, index + 3)),
        mimeType: mimeTypes.usfm,
        scope: { [code]: Array.from({ length: book?.chapters ?? 1 }, (_, chapter) => String(chapter + 1)) },
      };
    }),
  };
}
