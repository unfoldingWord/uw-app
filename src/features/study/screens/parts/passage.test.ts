import { describe, expect, it } from 'vitest';
import type { Provenance } from '@lib/domain/provenance';
import type { Note, Verse, WordLink, WordSpan } from '../../service';
import {
  focusedSpans,
  helpKey,
  inSpan,
  indexNear,
  middleOf,
  placementOf,
  requestedVerse,
  scrollMove,
  scrollPlan,
  type ListPlace,
  type VerseHelps,
} from './passage';

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

describe('ST-2 a verse opened from a link is selected, so its helps open', () => {
  it('selects the verse a request names', () => {
    expect(requestedVerse('RUT 1:16')).toEqual({ chapter: 1, verse: 16 });
  });

  it('selects the first verse of a requested range', () => {
    expect(requestedVerse('RUT 1:16-17')).toEqual({ chapter: 1, verse: 16 });
  });

  it('selects nothing for a chapter, no request or an unreadable one', () => {
    expect(requestedVerse('RUT 1')).toBeUndefined();
    expect(requestedVerse(undefined)).toBeUndefined();
    expect(requestedVerse('not a reference')).toBeUndefined();
  });
});

function verse(chapter: number, number: number, through?: number): Verse {
  return through === undefined
    ? { chapter, verse: number, text: '', tokens: [] }
    : { chapter, verse: number, through, text: '', tokens: [] };
}

const literal = [1, 2, 3, 4, 5, 6].map((number) => verse(1, number));
const everyday = [verse(1, 1), verse(1, 2, 3), verse(1, 4), verse(1, 6)];

function place(overrides: Partial<ListPlace> = {}): ListPlace {
  return {
    chapter: 'RUT 1',
    reading: 'literal',
    landing: { chapter: 1, verse: 1 },
    selected: undefined,
    ...overrides,
  };
}

describe('ST-2 the chapter arrows open a chapter at its first verse (issue #83)', () => {
  it('moves to the landing when the chapter changes, with nothing selected', () => {
    expect(
      scrollMove(place(), place({ chapter: 'RUT 2', landing: { chapter: 2, verse: 1 } }), undefined),
    ).toEqual({
      verse: { chapter: 2, verse: 1 },
      position: 'near-top',
    });
  });

  it('puts the first verse at the very top, never where the last chapter was scrolled', () => {
    expect(scrollPlan({ verse: { chapter: 1, verse: 1 }, position: 'near-top' }, literal)).toEqual({
      kind: 'top',
    });
  });

  it('moves to a selected verse when one is tapped, and stays put when the selection clears', () => {
    const tapped = place({ selected: { chapter: 1, verse: 4 } });
    expect(scrollMove(place(), tapped, undefined)).toEqual({
      verse: { chapter: 1, verse: 4 },
      position: 'near-top',
    });
    expect(scrollMove(tapped, place(), { chapter: 1, verse: 4 })).toBeUndefined();
    expect(scrollMove(place(), place(), { chapter: 1, verse: 4 })).toBeUndefined();
  });
});

describe('ST-3 switching the reading keeps the verse in view, centred (issue #101)', () => {
  it('keeps the verse in the middle of the pane when nothing is selected, both directions', () => {
    const inView = { chapter: 1, verse: 4 };
    expect(scrollMove(place(), place({ reading: 'simplified' }), inView)).toEqual({
      verse: inView,
      position: 'centre',
    });
    expect(scrollMove(place({ reading: 'simplified' }), place(), inView)).toEqual({
      verse: inView,
      position: 'centre',
    });
  });

  it('centres the verse in view even when the last-read verse moved the landing', () => {
    const inView = { chapter: 1, verse: 4 };
    expect(
      scrollMove(place(), place({ reading: 'simplified', landing: { chapter: 1, verse: 2 } }), inView),
    ).toEqual({ verse: inView, position: 'centre' });
  });

  it('keeps the selected verse over the one in view, even when the new reading has no row for it', () => {
    const selected = { chapter: 1, verse: 3 };
    expect(
      scrollMove(place({ selected }), place({ reading: 'simplified' }), { chapter: 1, verse: 5 }),
    ).toEqual({ verse: selected, position: 'centre' });
  });

  it('centres the row for the kept verse, a bridged row when the verses are joined', () => {
    expect(scrollPlan({ verse: { chapter: 1, verse: 3 }, position: 'centre' }, everyday)).toEqual({
      kind: 'index',
      index: 1,
      viewPosition: 0.5,
    });
    expect(scrollPlan({ verse: { chapter: 1, verse: 4 }, position: 'centre' }, literal)).toEqual({
      kind: 'index',
      index: 3,
      viewPosition: 0.5,
    });
  });

  it('falls back to the nearest verse the other reading has', () => {
    expect(indexNear(everyday, { chapter: 1, verse: 5 })).toBe(2);
    expect(indexNear(everyday, { chapter: 1, verse: 9 })).toBe(3);
    expect(indexNear(everyday, { chapter: 2, verse: 1 })).toBe(3);
    expect(indexNear([], { chapter: 1, verse: 1 })).toBe(-1);
  });

  it('keeps the first verse at the top and the last verse at the end of the list', () => {
    expect(scrollPlan({ verse: { chapter: 1, verse: 1 }, position: 'centre' }, everyday)).toEqual({
      kind: 'top',
    });
    expect(scrollPlan({ verse: { chapter: 1, verse: 6 }, position: 'centre' }, everyday)).toEqual({
      kind: 'end',
    });
    expect(scrollPlan({ verse: { chapter: 1, verse: 6 }, position: 'near-top' }, literal)).toEqual({
      kind: 'index',
      index: 5,
      viewPosition: 0.2,
    });
    expect(scrollPlan({ verse: { chapter: 1, verse: 1 }, position: 'centre' }, [])).toBeUndefined();
  });

  it('takes the middle of the rows on screen as the verse in view', () => {
    expect(middleOf([])).toBeUndefined();
    expect(middleOf([{ chapter: 1, verse: 1 }])).toEqual({ chapter: 1, verse: 1 });
    expect(
      middleOf([
        { chapter: 1, verse: 3 },
        { chapter: 1, verse: 4 },
        { chapter: 1, verse: 5 },
        { chapter: 1, verse: 6 },
      ]),
    ).toEqual({ chapter: 1, verse: 5 });
  });
});

describe('the verses a copy covers', () => {
  const row = (number: number, through?: number): Verse => ({
    chapter: 1,
    verse: number,
    ...(through === undefined ? {} : { through }),
    text: '',
    tokens: [],
  });

  it('is the selected verse alone until another is pressed and held', () => {
    expect(
      [row(1), row(2), row(3)].map((verse) => inSpan(verse, { chapter: 1, verse: 2 }, undefined)),
    ).toEqual([false, true, false]);
  });

  it('runs either way between the two verses and takes a bridge it touches', () => {
    const rows = [row(1), row(2, 3), row(4), row(5)];
    expect(rows.map((verse) => inSpan(verse, { chapter: 1, verse: 4 }, { chapter: 1, verse: 3 }))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});
