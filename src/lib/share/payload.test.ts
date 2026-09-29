import { describe, expect, it } from 'vitest';
import type { AudioClip, Passage, Story } from '../corpus/types';
import type { Provenance } from '../domain/provenance';
import { tables } from '../strings/locales/index';
import { createStrings } from '../strings/strings';
import {
  audioPayload,
  diagnosticsDocument,
  getTheAppLink,
  journalPayload,
  passagePayload,
  storyPayload,
} from './payload';

const words = createStrings(tables);

const provenance: Provenance = {
  publisher: 'unfoldingWord',
  resource: 'qaa_ult',
  language: 'qaa',
  tag: 'v1',
  commit: 'abc',
  licence: 'CC BY-SA 4.0',
  title: 'Fixture Literal Text',
};

const passage: Passage = {
  reference: 'RUT 1:16-17',
  language: 'qaa',
  text: {
    provenance,
    reading: 'literal',
    book: 'RUT',
    bookName: 'Ruth',
    direction: 'ltr',
    titles: [],
    verses: [
      { chapter: 1, verse: 16, text: 'Where you go I will go.', tokens: [] },
      { chapter: 1, verse: 17, through: 18, text: 'Where you die I will die.', tokens: [] },
    ],
  },
  availableTexts: [],
  notes: [],
  wordLinks: [],
  questions: [],
  audio: [],
};

describe('share payloads (SH-4, SH-5)', () => {
  it('words a passage with its reference, verses, attribution and the link', () => {
    const payload = passagePayload(words, 'en', passage);
    expect(payload).toEqual({
      title: 'Ruth 1:16-17',
      text: [
        'Ruth 1:16-17',
        '16 Where you go I will go. 17-18 Where you die I will die.',
        'Fixture Literal Text by unfoldingWord, v1, CC BY-SA 4.0.',
        `Get the app: ${getTheAppLink}`,
      ].join('\n\n'),
      provenance: [provenance],
    });
  });

  it('keeps the link on unfoldingword.org while the short link domain is open', () => {
    expect(new URL(getTheAppLink).hostname).toBe('unfoldingword.org');
  });

  it('words a story frame by frame and an audio clip with its file', () => {
    const story: Story = {
      provenance,
      number: 1,
      language: 'qaa',
      title: 'The Creation',
      direction: 'ltr',
      frames: [
        { provenance, number: 1, text: 'In the beginning.' },
        { provenance, number: 2, text: '' },
      ],
      bibleReference: 'Genesis 1-2',
      references: [],
      notes: [],
      questions: [],
      wordLinks: [],
    };
    expect(storyPayload(words, 'en', story).text.split('\n\n')).toEqual([
      'The Creation',
      'In the beginning.',
      'Genesis 1-2',
      'Fixture Literal Text by unfoldingWord, v1, CC BY-SA 4.0.',
      `Get the app: ${getTheAppLink}`,
    ]);
    const clip: AudioClip = {
      provenance,
      book: 'RUT',
      chapter: 1,
      path: 'packs/a.mp3',
      mimeType: 'audio/mpeg',
    };
    expect(audioPayload(words, 'en', clip)).toMatchObject({
      title: 'Fixture Literal Text · RUT 1',
      file: { path: 'packs/a.mp3', mimeType: 'audio/mpeg' },
      provenance: [provenance],
    });
  });

  it('describes the journal file in one sentence and writes a journal export with the snapshot beside it', () => {
    expect(journalPayload(words, 'en')).toMatchObject({
      title: 'Share diagnostics',
      file: { path: 'diagnostics/journal.json', mimeType: 'application/json' },
      provenance: [],
    });
    const document = JSON.parse(
      diagnosticsDocument({
        journal: {
          format: 'unfoldingword-journal',
          version: 2,
          limit: 10,
          dropped: 0,
          baseline: {},
          events: [],
        },
        snapshot: {
          version: 1,
          journal: { limit: 10, size: 0, dropped: 0, lastSeq: 0, unpersisted: 0, tail: [] },
          modules: {},
        },
      }),
    ) as Record<string, unknown>;
    expect(Object.keys(document).sort()).toEqual([
      'baseline',
      'dropped',
      'events',
      'format',
      'limit',
      'snapshot',
      'version',
    ]);
  });
});
