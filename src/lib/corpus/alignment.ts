import type { HelpsReference } from './tsv';
import type { Verse, WordSpan } from './types';

const quoteSeparators = /[\s&־]+/u;
const ignoredMarks = /[\p{P}\p{S}]/gu;
const allOccurrences = -1;

export function normalizeWord(text: string): string {
  return text.normalize('NFC').replace(ignoredMarks, '').toLowerCase();
}

export function coversVerse(reference: HelpsReference, verse: Verse): boolean {
  if (reference.kind === 'intro') {
    return false;
  }
  const first = verse.verse;
  const last = verse.through ?? verse.verse;
  return reference.ranges.some(({ start, end }) => {
    const afterStart =
      verse.chapter > start.chapter || (verse.chapter === start.chapter && last >= start.verse);
    const beforeEnd = verse.chapter < end.chapter || (verse.chapter === end.chapter && first <= end.verse);
    return afterStart && beforeEnd;
  });
}

export function attachQuote(
  quote: string,
  occurrence: number,
  reference: HelpsReference,
  verses: readonly Verse[],
): WordSpan[] {
  const wanted = new Set(
    quote
      .split(quoteSeparators)
      .map(normalizeWord)
      .filter((word) => word !== ''),
  );
  if (wanted.size === 0 || occurrence === 0) {
    return [];
  }
  return verses.flatMap((verse) => {
    if (!coversVerse(reference, verse)) {
      return [];
    }
    const tokens = verse.tokens.flatMap((token) =>
      token.kind === 'word' &&
      token.original.some(
        (original) =>
          wanted.has(normalizeWord(original.content)) &&
          (occurrence === allOccurrences || original.occurrence === occurrence),
      )
        ? [token.index]
        : [],
    );
    return tokens.length === 0 ? [] : [{ chapter: verse.chapter, verse: verse.verse, tokens }];
  });
}
