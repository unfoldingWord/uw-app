import type { HelpsReference } from './tsv';
import type { Token, Verse, WordSpan } from './types';

const gaps = /\s*(?:…|\.\.\.|&)\s*/u;
const quoteSeparators = /[\s־]+/u;
const ignoredMarks = /[\p{P}\p{S}]/gu;
const allOccurrences = -1;

type SourceWord = { readonly word: string; readonly occurrence: number; readonly key: string };

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

function quoteParts(quote: string): string[][] {
  return quote
    .split(gaps)
    .map((part) =>
      part
        .split(quoteSeparators)
        .map(normalizeWord)
        .filter((word) => word !== ''),
    )
    .filter((part) => part.length > 0);
}

function keyOf(word: string, occurrence: number): string {
  return `${word}#${occurrence}`;
}

function sourceOrder(tokens: readonly Token[]): SourceWord[] {
  const seen = new Map<string, SourceWord>();
  for (const token of tokens) {
    if (token.kind !== 'word') {
      continue;
    }
    for (const original of token.original) {
      const word = normalizeWord(original.content);
      const key = keyOf(word, original.occurrence);
      if (word !== '' && !seen.has(key)) {
        seen.set(key, { word, occurrence: original.occurrence, key });
      }
    }
  }
  const ordered = [...seen.values()];
  const slots = new Map<string, number[]>();
  ordered.forEach((item, index) => slots.set(item.word, [...(slots.get(item.word) ?? []), index]));
  const placed: SourceWord[] = [...ordered];
  for (const [word, positions] of slots) {
    const sorted = ordered
      .filter((item) => item.word === word)
      .sort((left, right) => left.occurrence - right.occurrence);
    positions.forEach((position, index) => {
      const item = sorted[index];
      if (item !== undefined) {
        placed[position] = item;
      }
    });
  }
  return placed;
}

function matchPart(
  source: readonly SourceWord[],
  part: readonly string[],
  from: number,
  contiguous: boolean,
): number[] | undefined {
  const [first, ...rest] = part;
  for (let start = from; start < source.length; start += 1) {
    if (source[start]?.word !== first) {
      continue;
    }
    const found = [start];
    let at = start;
    for (const word of rest) {
      let next = at + 1;
      while (!contiguous && next < source.length && source[next]?.word !== word) {
        next += 1;
      }
      if (source[next]?.word !== word) {
        break;
      }
      found.push(next);
      at = next;
    }
    if (found.length === part.length) {
      return found;
    }
  }
  return undefined;
}

function matchesOf(
  source: readonly SourceWord[],
  parts: readonly (readonly string[])[],
  contiguous: boolean,
): number[][] {
  const matches: number[][] = [];
  for (let start = 0; start < source.length; start += 1) {
    const found: number[] = [];
    let from = start;
    for (const [index, part] of parts.entries()) {
      const matched = matchPart(source, part, from, contiguous);
      if (matched === undefined || (index === 0 && matched[0] !== start)) {
        found.length = 0;
        break;
      }
      found.push(...matched);
      from = (matched.at(-1) ?? from) + 1;
    }
    if (found.length > 0) {
      matches.push(found);
    }
  }
  return matches;
}

function chosenKeys(source: readonly SourceWord[], quote: string, occurrence: number): Set<string> {
  const parts = quoteParts(quote);
  if (parts.length === 0) {
    return new Set();
  }
  const words = new Set(parts.flat());
  if (occurrence === allOccurrences) {
    return new Set(source.filter((item) => words.has(item.word)).map((item) => item.key));
  }
  const exact = matchesOf(source, parts, true);
  const loose = exact.length >= occurrence ? exact : matchesOf(source, parts, false);
  const match = loose[occurrence - 1];
  return new Set((match ?? []).flatMap((index) => source[index]?.key ?? []));
}

export function attachQuote(
  quote: string,
  occurrence: number,
  reference: HelpsReference,
  verses: readonly Verse[],
): WordSpan[] {
  if (occurrence === 0 || quoteParts(quote).length === 0) {
    return [];
  }
  return verses.flatMap((verse) => {
    if (!coversVerse(reference, verse)) {
      return [];
    }
    const keys = chosenKeys(sourceOrder(verse.tokens), quote, occurrence);
    const tokens = verse.tokens.flatMap((token) =>
      token.kind === 'word' &&
      token.original.some((original) => keys.has(keyOf(normalizeWord(original.content), original.occurrence)))
        ? [token.index]
        : [],
    );
    return tokens.length === 0 ? [] : [{ chapter: verse.chapter, verse: verse.verse, tokens }];
  });
}
