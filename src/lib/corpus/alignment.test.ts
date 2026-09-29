import { describe, expect, it } from 'vitest';
import { attachQuote, coversVerse } from './alignment';
import { parseHelpsReference, type HelpsReference } from './tsv';
import type { OriginalWord, Token, Verse } from './types';

function original(content: string, occurrence = 1): OriginalWord {
  return { content, lemma: content, strong: '', occurrence, occurrences: 2 };
}

function word(index: number, text: string, originals: readonly OriginalWord[]): Token {
  return { kind: 'word', index, text, original: originals };
}

function reference(text: string): HelpsReference {
  const parsed = parseHelpsReference(text);
  if (parsed === undefined) {
    throw new Error(text);
  }
  return parsed;
}

const verse: Verse = {
  chapter: 1,
  verse: 16,
  text: 'your God my God',
  tokens: [
    word(0, 'your', [original('וֵאלֹהַיִךְ')]),
    { kind: 'text', text: ' ' },
    word(1, 'God', [original('וֵאלֹהַיִךְ')]),
    { kind: 'text', text: ' ' },
    word(2, 'my', [original('אֱלֹהָי')]),
    { kind: 'text', text: ' ' },
    word(3, 'God', [original('אֱלֹהָי', 2)]),
  ],
};

describe('attachQuote', () => {
  it('attaches a quote to the target words aligned to its original words', () => {
    expect(attachQuote('וֵאלֹהַיִךְ', 1, reference('1:16'), [verse])).toEqual([
      { chapter: 1, verse: 16, tokens: [0, 1] },
    ]);
    expect(attachQuote('וֵאלֹהַיִךְ & אֱלֹהָי', 1, reference('1:16'), [verse])).toEqual([
      { chapter: 1, verse: 16, tokens: [0, 1, 2] },
    ]);
  });

  it('respects the occurrence, and -1 for every occurrence', () => {
    expect(attachQuote('אֱלֹהָי', 2, reference('1:16'), [verse])).toEqual([
      { chapter: 1, verse: 16, tokens: [3] },
    ]);
    expect(attachQuote('אֱלֹהָי', -1, reference('1:16'), [verse])).toEqual([
      { chapter: 1, verse: 16, tokens: [2, 3] },
    ]);
  });

  it('attaches nothing when the quote is empty, not aligned, or on another verse', () => {
    expect(attachQuote('', 1, reference('1:16'), [verse])).toEqual([]);
    expect(attachQuote('λόγος', 1, reference('1:16'), [verse])).toEqual([]);
    expect(attachQuote('אֱלֹהָי', 1, reference('1:15'), [verse])).toEqual([]);
    expect(attachQuote('אֱלֹהָי', 0, reference('1:16'), [verse])).toEqual([]);
  });
});

describe('coversVerse', () => {
  it('covers ranges across chapters and verse bridges, never introductions', () => {
    expect(coversVerse(reference('1:10-2:2'), { ...verse, chapter: 2, verse: 1 })).toBe(true);
    expect(coversVerse(reference('1:10-2:2'), { ...verse, chapter: 2, verse: 3 })).toBe(false);
    expect(coversVerse(reference('1:17'), { ...verse, verse: 16, through: 17 })).toBe(true);
    expect(coversVerse({ kind: 'intro' }, verse)).toBe(false);
  });
});
