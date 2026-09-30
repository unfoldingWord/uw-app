import type { HelpsReference } from './tsv';
import type { Token, Verse, WordSpan } from './types';

const gaps = /\s*(?:…|\.\.\.|&)\s*/u;
const quoteSeparators = /[\s־]+/u;
const ignoredMarks = /[\p{P}\p{S}]/gu;
const allOccurrences = -1;

type SourceWord = {
  readonly word: string;
  readonly occurrence: number;
  readonly key: string;
  readonly position: number;
};

function normalizeWord(text: string): string {
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
        seen.set(key, { word, occurrence: original.occurrence, key, position: token.index });
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
): number[] | undefined {
  for (let start = from; start < source.length; start += 1) {
    if (part.every((word, offset) => source[start + offset]?.word === word)) {
      return part.map((_, offset) => start + offset);
    }
  }
  return undefined;
}

function matchesOf(source: readonly SourceWord[], parts: readonly (readonly string[])[]): number[][] {
  const matches: number[][] = [];
  for (let start = 0; start < source.length; start += 1) {
    const found: number[] = [];
    let from = start;
    for (const [index, part] of parts.entries()) {
      const matched = matchPart(source, part, from);
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

function countsOf(words: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

function instancesOf(source: readonly SourceWord[], word: string): SourceWord[] {
  return source
    .filter((item) => item.word === word)
    .sort((left, right) => left.occurrence - right.occurrence);
}

function meanPosition(items: readonly SourceWord[]): number {
  return items.reduce((sum, item) => sum + item.position, 0) / Math.max(items.length, 1);
}

function nearest(instances: readonly SourceWord[], anchor: number, count: number): SourceWord[] {
  return [...instances]
    .sort(
      (left, right) =>
        Math.abs(left.position - anchor) - Math.abs(right.position - anchor) ||
        left.occurrence - right.occurrence,
    )
    .slice(0, count);
}

function unorderedKeys(
  source: readonly SourceWord[],
  words: readonly string[],
  occurrence: number,
): Set<string> {
  const counts = countsOf(words);
  const instances = new Map([...counts.keys()].map((word) => [word, instancesOf(source, word)]));
  const scarcity = (word: string): number => (instances.get(word)?.length ?? 0) / (counts.get(word) ?? 1);
  if ([...counts].some(([word, count]) => (instances.get(word)?.length ?? 0) < count)) {
    return new Set();
  }
  const [rarest] = [...counts.keys()].sort((left, right) => scarcity(left) - scarcity(right));
  const rareCount = rarest === undefined ? 0 : (counts.get(rarest) ?? 0);
  const rareInstances = rarest === undefined ? [] : (instances.get(rarest) ?? []);
  if (rarest === undefined || rareInstances.length < occurrence * rareCount) {
    return new Set();
  }
  const block = rareInstances.slice((occurrence - 1) * rareCount, occurrence * rareCount);
  const settled =
    occurrence === 1
      ? [...counts].flatMap(([word, count]) => {
          const found = instances.get(word) ?? [];
          return word !== rarest && found.length === count ? found : [];
        })
      : [];
  const anchor = meanPosition([...block, ...settled]);
  const chosen = [...counts].flatMap(([word, count]) =>
    word === rarest ? block : nearest(instances.get(word) ?? [], anchor, count),
  );
  return new Set(chosen.map((item) => item.key));
}

function chosenKeys(source: readonly SourceWord[], quote: string, occurrence: number): Set<string> {
  const parts = quoteParts(quote);
  if (parts.length === 0) {
    return new Set();
  }
  const words = parts.flat();
  if (occurrence === allOccurrences) {
    const wanted = new Set(words);
    return new Set(source.filter((item) => wanted.has(item.word)).map((item) => item.key));
  }
  const exact = matchesOf(source, parts)[occurrence - 1];
  if (exact !== undefined) {
    return new Set(exact.flatMap((index) => source[index]?.key ?? []));
  }
  return unorderedKeys(source, words, occurrence);
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
