import { describe, expect, it } from 'vitest';
import type { Passage, Verse } from '../corpus/types';
import type { Provenance } from '../domain/provenance';
import { tables } from '../strings/locales/index';
import { createStrings } from '../strings/strings';
import { copiedText } from './copy';

const words = createStrings(tables);

const provenance: Provenance = {
  publisher: 'unfoldingWord',
  resource: 'en_ult',
  language: 'en',
  tag: 'v86',
  commit: 'abc',
  licence: 'CC BY-SA 4.0',
  title: 'unfoldingWord Literal Text',
};

const verse = (chapter: number, number: number, text: string, through?: number): Verse => ({
  chapter,
  verse: number,
  ...(through === undefined ? {} : { through }),
  text,
  tokens: [],
});

const passage: Passage = {
  reference: 'RUT 1',
  language: 'en',
  text: {
    reading: 'literal',
    book: 'RUT',
    bookName: 'Ruth',
    bookAbbreviation: 'Rut',
    direction: 'ltr',
    titles: [],
    verses: [
      verse(1, 1, 'One.'),
      verse(1, 2, 'Two and three.', 3),
      verse(1, 4, 'Four.'),
      verse(1, 16, 'Sixteen.'),
    ],
    provenance,
  },
  availableTexts: ['literal'],
  intros: [],
  notes: [],
  wordLinks: [],
  questions: [],
  audio: [],
};

const attribution = 'unfoldingWord Literal Text by unfoldingWord, v86, CC BY-SA 4.0.';

const at = (from: number, to = from) => ({
  from: { chapter: 1, verse: from },
  to: { chapter: 1, verse: to },
});

describe('copiedText', () => {
  it('puts the short reference before one verse, and the attribution last', () => {
    expect(copiedText(words, 'en', passage, at(16), 'before-short')).toEqual({
      text: ['Rut 1:16', 'Sixteen.', attribution].join('\n'),
      reference: 'RUT 1:16',
      label: 'Ruth 1:16',
    });
  });

  it('numbers each verse of a range, keeps a bridge whole and puts the full reference after', () => {
    expect(copiedText(words, 'en', passage, at(4, 1), 'after-full')?.text).toBe(
      ['1 One. 2-3 Two and three. 4 Four.', 'Ruth 1:1-4', attribution].join('\n'),
    );
  });

  it('takes a bridged verse when the range starts inside it', () => {
    expect(copiedText(words, 'en', passage, at(3, 4), 'before-full')?.reference).toBe('RUT 1:2-4');
  });

  it('leaves the reference out on request and keeps the attribution', () => {
    expect(copiedText(words, 'en', passage, at(1), 'none')?.text).toBe(['One.', attribution].join('\n'));
    expect(copiedText(words, 'en', passage, at(4), 'after-short')?.text).toBe(
      ['Four.', 'Rut 1:4', attribution].join('\n'),
    );
  });

  it('copies nothing for a range with no verse in the passage', () => {
    expect(copiedText(words, 'en', passage, at(10, 12), 'before-short')).toBeUndefined();
  });
});
