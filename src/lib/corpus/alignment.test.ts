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

function greekVerse(originals: readonly [string, string, number][]): Verse {
  return {
    chapter: 1,
    verse: 1,
    text: originals.map(([text]) => text).join(' '),
    tokens: originals.map(([text, content, occurrence], index) =>
      word(index, text, [{ content, lemma: content, strong: '', occurrence, occurrences: 3 }]),
    ),
  };
}

describe('attachQuote with repeated words', () => {
  const repeated = greekVerse([
    ['and', 'καὶ', 1],
    ['says', 'λέγει', 1],
    ['and', 'καὶ', 2],
  ]);

  it('attaches every word of a quote that repeats a word, and the parts around a gap', () => {
    expect(attachQuote('καὶ λέγει καὶ', 1, reference('1:1'), [repeated])).toEqual([
      { chapter: 1, verse: 1, tokens: [0, 1, 2] },
    ]);
    expect(attachQuote('καὶ … καὶ', 1, reference('1:1'), [repeated])).toEqual([
      { chapter: 1, verse: 1, tokens: [0, 2] },
    ]);
    expect(attachQuote('καὶ & καὶ', 1, reference('1:1'), [repeated])).toEqual([
      { chapter: 1, verse: 1, tokens: [0, 2] },
    ]);
  });

  it('finds the nth occurrence of the whole quote, past a word it shares with the verse', () => {
    const verse = greekVerse([
      ['and', 'καὶ', 1],
      ['another', 'ἄλλος', 1],
      ['and', 'καὶ', 2],
      ['says', 'λέγει', 1],
      ['and', 'καὶ', 3],
      ['says', 'λέγει', 2],
    ]);
    expect(attachQuote('καὶ λέγει', 1, reference('1:1'), [verse])).toEqual([
      { chapter: 1, verse: 1, tokens: [2, 3] },
    ]);
    expect(attachQuote('καὶ λέγει', 2, reference('1:1'), [verse])).toEqual([
      { chapter: 1, verse: 1, tokens: [4, 5] },
    ]);
    expect(attachQuote('καὶ λέγει καὶ', 1, reference('1:1'), [verse])).toEqual([
      { chapter: 1, verse: 1, tokens: [2, 3, 4] },
    ]);
  });
});

describe('attachQuote when the target reorders the original words', () => {
  const day: Verse = {
    chapter: 1,
    verse: 5,
    text: 'one day',
    tokens: [
      word(0, 'one', [{ content: 'אֶחָד', lemma: 'אֶחָד', strong: '', occurrence: 1, occurrences: 1 }]),
      { kind: 'text', text: ' ' },
      word(1, 'day', [{ content: 'יוֹם', lemma: 'יוֹם', strong: '', occurrence: 1, occurrences: 1 }]),
    ],
  };

  it('attaches a quote in original order to target words in another order', () => {
    expect(attachQuote('יוֹם אֶחָד', 1, reference('1:5'), [day])).toEqual([
      { chapter: 1, verse: 5, tokens: [0, 1] },
    ]);
  });

  const walk = greekVerse([
    ['your', 'σου', 1],
    ['truth', 'ἀληθείᾳ', 1],
    ['even', 'καθὼς', 1],
    ['you', 'σὺ', 1],
    ['walk', 'περιπατεῖς', 1],
    ['in', 'ἐν', 1],
    ['truth', 'ἀληθείᾳ', 2],
  ]);

  it('picks the occurrence of a repeated word that sits with the rest of the quote', () => {
    expect(attachQuote('σὺ ἐν ἀληθείᾳ περιπατεῖς', 1, reference('1:3'), [{ ...walk, verse: 3 }])).toEqual([
      { chapter: 1, verse: 3, tokens: [3, 4, 5, 6] },
    ]);
    expect(attachQuote('ἐν ἀληθείᾳ & περιπατεῖς', 1, reference('1:3'), [{ ...walk, verse: 3 }])).toEqual([
      { chapter: 1, verse: 3, tokens: [4, 5, 6] },
    ]);
  });

  it('finds the nth occurrence of a reordered quote and nothing past the last', () => {
    const repeated = greekVerse([
      ['Lord', 'κύριος', 1],
      ['the', 'ὁ', 1],
      ['God', 'θεὸς', 1],
      ['and', 'καὶ', 1],
      ['Lord', 'κύριος', 2],
      ['the', 'ὁ', 2],
      ['God', 'θεὸς', 2],
    ]);
    expect(attachQuote('ὁ θεὸς κύριος', 2, reference('1:1'), [repeated])).toEqual([
      { chapter: 1, verse: 1, tokens: [4, 5, 6] },
    ]);
    expect(attachQuote('ὁ θεὸς κύριος', 3, reference('1:1'), [repeated])).toEqual([]);
    expect(attachQuote('θεὸς θεὸς θεὸς', 1, reference('1:1'), [repeated])).toEqual([]);
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
