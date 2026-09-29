import type { DeviceSnapshot } from '../compose';
import type { AudioClip, Passage, Story, Verse } from '../corpus/types';
import type { Provenance } from '../domain/provenance';
import type { JournalExport } from '../journal/export';
import type { SharePayload } from '../ports';
import type { Locale } from '../strings/locales';
import type { StringsApi } from '../strings/strings';

export const getTheAppLink = 'https://unfoldingword.org';

export const diagnosticsDirectory = 'diagnostics';

export const diagnosticsPath = `${diagnosticsDirectory}/journal.json`;

const diagnosticsMimeType = 'application/json';

export type JournalReport = { journal: JournalExport; snapshot: DeviceSnapshot };

type Words = Pick<StringsApi, 't'>;

function attributionOf(words: Words, locale: Locale, provenance: Provenance): string {
  return words.t('share.payload.attribution', locale, {
    resource: provenance.title,
    publisher: provenance.publisher,
    version: provenance.tag,
    licence: provenance.licence,
  });
}

function closing(words: Words, locale: Locale, provenance: Provenance): string[] {
  return [
    attributionOf(words, locale, provenance),
    words.t('share.payload.link', locale, { link: getTheAppLink }),
  ];
}

function verseText(verse: Verse): string {
  const number = verse.through === undefined ? `${verse.verse}` : `${verse.verse}-${verse.through}`;
  return `${number} ${verse.text}`;
}

function passageTitle(passage: Passage): string {
  const space = passage.reference.indexOf(' ');
  const place = space === -1 ? '' : passage.reference.slice(space);
  return `${passage.text.bookName}${place}`;
}

export function passagePayload(words: Words, locale: Locale, passage: Passage): SharePayload {
  const { provenance } = passage.text;
  const title = passageTitle(passage);
  const verses = passage.text.verses.map(verseText).join(' ');
  return {
    title,
    text: [title, verses, ...closing(words, locale, provenance)].join('\n\n'),
    provenance: [provenance],
  };
}

export function storyPayload(words: Words, locale: Locale, story: Story): SharePayload {
  const frames = story.frames.map((frame) => frame.text).filter((text) => text !== '');
  const reference = story.bibleReference === '' ? [] : [story.bibleReference];
  return {
    title: story.title,
    text: [story.title, ...frames, ...reference, ...closing(words, locale, story.provenance)].join('\n\n'),
    provenance: [story.provenance],
  };
}

export function audioPayload(words: Words, locale: Locale, clip: AudioClip): SharePayload {
  const title = words.t('common.joined', locale, {
    first: clip.provenance.title,
    second: `${clip.book} ${clip.chapter}`,
  });
  return {
    title,
    text: [title, ...closing(words, locale, clip.provenance)].join('\n\n'),
    file: { path: clip.path, mimeType: clip.mimeType },
    provenance: [clip.provenance],
  };
}

export function journalPayload(words: Words, locale: Locale): SharePayload {
  return {
    title: words.t('diagnostics.title', locale),
    text: words.t('diagnostics.body', locale),
    file: { path: diagnosticsPath, mimeType: diagnosticsMimeType },
    provenance: [],
  };
}

export function diagnosticsDocument(report: JournalReport): string {
  return `${JSON.stringify({ ...report.journal, snapshot: report.snapshot }, null, 2)}\n`;
}
