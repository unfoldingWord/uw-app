import { describe, expect, it } from 'vitest';
import type { Provenance } from '@lib/domain/provenance';
import type { Note, WordLink, WordSpan } from '../../service';
import { focusedSpans, helpKey, placementOf, type VerseHelps } from './passage';

function provenance(resource: string): Provenance {
  return {
    publisher: 'unfoldingWord',
    resource,
    language: 'en',
    tag: 'v1',
    commit: 'abc',
    licence: 'CC BY-SA 4.0',
    title: resource,
  };
}

function note(id: string, resource: string, quote: string, words: readonly WordSpan[]): Note {
  return {
    id,
    study: resource.endsWith('_sn'),
    reference: 'RUT 1:16',
    quote,
    occurrence: 1,
    blocks: [],
    words,
    provenance: provenance(resource),
  };
}

function link(id: string, words: readonly WordSpan[]): WordLink {
  return {
    id,
    reference: 'RUT 1:16',
    original: 'אֱלֹהָי',
    occurrence: 1,
    article: 'tw/bible/kt/god',
    words,
    provenance: provenance('en_twl'),
  };
}

const at = { chapter: 1, verse: 16 };
const first = note('a1', 'en_tn', 'וֵאלֹהַיִךְ', [{ chapter: 1, verse: 16, tokens: [0, 1] }]);
const second = note('a2', 'en_tn', 'אֱלֹהָי', [{ chapter: 1, verse: 16, tokens: [3] }]);
const shared = note('a1', 'en_sn', 'אֱלֹהָי', [{ chapter: 1, verse: 16, tokens: [2, 3] }]);
const unplaced = note('a3', 'en_tn', 'λόγος', []);
const helps: VerseHelps = {
  intros: [],
  notes: [first, second, shared, unplaced],
  wordLinks: [link('a1', [{ chapter: 1, verse: 16, tokens: [2] }])],
  questions: [],
  footnotes: [],
};

describe('ST-2 a tapped help highlights its own words (issue #91)', () => {
  it('names each help by its resource and its id', () => {
    expect(helpKey(first)).not.toBe(helpKey(shared));
    expect(helpKey(first)).toBe(helpKey(note('a1', 'en_tn', '', [])));
  });

  it('highlights the focused note, the second as well as the first', () => {
    expect(focusedSpans(helps, helpKey(first))).toEqual(first.words);
    expect(focusedSpans(helps, helpKey(second))).toEqual(second.words);
  });

  it('tells two notes with one id apart by their resource, and a word link from both', () => {
    expect(focusedSpans(helps, helpKey(shared))).toEqual(shared.words);
    expect(focusedSpans(helps, helpKey(helps.wordLinks[0] ?? link('x', [])))).toEqual([
      { chapter: 1, verse: 16, tokens: [2] },
    ]);
  });

  it('highlights nothing until a help is focused, never the first note by default', () => {
    expect(focusedSpans(helps, undefined)).toEqual([]);
    expect(focusedSpans(helps, 'en_tn/missing')).toEqual([]);
  });

  it('says when a quote could not be placed in this text', () => {
    expect(placementOf(first, at)).toBe('placed');
    expect(placementOf(unplaced, at)).toBe('not-found');
    expect(placementOf(note('a4', 'en_tn', '', []), at)).toBe('unquoted');
    expect(placementOf(note('a5', 'en_tn', 'λόγος', [{ chapter: 1, verse: 17, tokens: [0] }]), at)).toBe(
      'not-found',
    );
  });
});
