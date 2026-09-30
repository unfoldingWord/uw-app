import { formatReference, type Reference } from '../domain/reference';
import { attachQuote, coversVerse } from './alignment';
import type { Library } from './library';
import { resolveLink, wordLinkArticle, type LinkBase } from './links';
import { audioClips, bookNotes, bookQuestions, bookWordLinks, textBook } from './loaders';
import { renderMarkdown } from './markdown';
import { isPairText, isStudyResource, readingOfKind } from './readings';
import type { Entry } from './tables';
import type { HelpsReference, NoteRow } from './tsv';
import type { UsfmBook } from './usfm';
import type {
  AudioClip,
  ChapterTitle,
  CorpusKind,
  Introduction,
  Note,
  Passage,
  PassageOptions,
  Question,
  Reading,
  TextChoice,
  Verse,
  WordLink,
} from './types';

const textKinds: readonly Reading[] = ['literal', 'simplified', 'original'];
const choices: readonly TextChoice[] = ['literal', 'simplified'];
const endOfChapter = Number.MAX_SAFE_INTEGER;

function withinReference(reference: Reference, verse: Verse): boolean {
  const { start } = reference;
  const end = reference.end ?? (start.verse === undefined ? { chapter: start.chapter } : start);
  const range: HelpsReference = {
    kind: 'verses',
    ranges: [
      {
        start: { chapter: start.chapter, verse: start.verse ?? 1 },
        end: { chapter: end.chapter, verse: end.verse ?? endOfChapter },
      },
    ],
  };
  return coversVerse(range, verse);
}

function chaptersOf(reference: Reference): number[] {
  const last = reference.end?.chapter ?? reference.start.chapter;
  return Array.from(
    { length: last - reference.start.chapter + 1 },
    (_, index) => reference.start.chapter + index,
  );
}

function helpsReferenceText(book: string, reference: HelpsReference): string {
  if (reference.kind === 'intro') {
    return reference.chapter === undefined
      ? book
      : formatReference({ book, start: { chapter: reference.chapter } });
  }
  const [first] = reference.ranges;
  const last = reference.ranges.at(-1);
  if (first === undefined || last === undefined) {
    return book;
  }
  const same = first.start.chapter === last.end.chapter && first.start.verse === last.end.verse;
  return formatReference(same ? { book, start: first.start } : { book, start: first.start, end: last.end });
}

function chapterTitles(book: UsfmBook, verses: readonly Verse[]): ChapterTitle[] {
  return verses.flatMap((verse) => {
    const text = verse.verse === 1 ? book.titles.get(verse.chapter) : undefined;
    return text === undefined ? [] : [{ chapter: verse.chapter, text }];
  });
}

function helpsCover(reference: HelpsReference, verses: readonly Verse[]): boolean {
  return verses.some((verse) => coversVerse(reference, verse));
}

function isChoice(kind: CorpusKind): kind is TextChoice {
  return kind === 'literal' || kind === 'simplified';
}

function pairPublisher(texts: readonly Entry[]): string | undefined {
  return texts.find(
    (entry) => isChoice(entry.kind) && isPairText(entry.provenance.resource, entry.language, entry.kind),
  )?.provenance.publisher;
}

export function readingTexts(library: Library, language: string, book: string): readonly Entry[] {
  const texts = library.of(language, textKinds).filter((entry) => entry.books.includes(book));
  const publisher = pairPublisher(texts);
  if (publisher === undefined) {
    return texts;
  }
  const paired = (entry: Entry): number =>
    isChoice(entry.kind) && isPairText(entry.provenance.resource, entry.language, entry.kind) ? 0 : 1;
  return texts
    .filter((entry) => entry.kind === 'original' || entry.provenance.publisher === publisher)
    .map((entry, order) => ({ entry, order }))
    .sort((left, right) => paired(left.entry) - paired(right.entry) || left.order - right.order)
    .map(({ entry }) => entry);
}

export function defaultText(texts: readonly Entry[], wanted?: Reading): Entry | undefined {
  const pick = (kind: Reading): Entry | undefined => texts.find((entry) => entry.kind === kind);
  return wanted === undefined ? (pick('literal') ?? pick('simplified') ?? pick('original')) : pick(wanted);
}

function chosenText(
  library: Library,
  reference: Reference,
  options: PassageOptions,
): { entry: Entry | undefined; texts: readonly Entry[] } {
  const texts = readingTexts(library, options.language, reference.book);
  return { entry: defaultText(texts, options.text), texts };
}

function padded(value: number): string {
  return String(value).padStart(2, '0');
}

function noteBase(book: string, reference: HelpsReference): LinkBase {
  const folder = book.toLowerCase();
  if (reference.kind === 'intro') {
    const chapter = reference.chapter === undefined ? 'front' : padded(reference.chapter);
    return { resource: 'other', path: `${folder}/${chapter}/intro.md` };
  }
  const start = reference.ranges[0]?.start;
  return {
    resource: 'other',
    path:
      start === undefined
        ? `${folder}/front/intro.md`
        : `${folder}/${padded(start.chapter)}/${padded(start.verse)}.md`,
  };
}

function noteBlocks(library: Library, language: string, book: string, row: NoteRow) {
  return renderMarkdown(row.note, {
    base: noteBase(book, row.reference),
    titleOf: (target) => library.titleOf(language, target),
  });
}

function opensChapter(verses: readonly Verse[], chapter: number): boolean {
  return verses.some((verse) => verse.chapter === chapter && verse.verse <= 1);
}

function introCovers(reference: HelpsReference, verses: readonly Verse[]): boolean {
  if (reference.kind !== 'intro') {
    return false;
  }
  return opensChapter(verses, reference.chapter ?? 1);
}

async function introsFor(
  library: Library,
  language: string,
  book: string,
  verses: readonly Verse[],
): Promise<Introduction[]> {
  const intros: Introduction[] = [];
  for (const entry of library.of(language, ['notes']).filter((item) => item.books.includes(book))) {
    for (const row of await bookNotes(library, entry, book)) {
      if (row.reference.kind !== 'intro' || !introCovers(row.reference, verses)) {
        continue;
      }
      const intro = {
        id: row.id,
        study: isStudyResource(entry.provenance.resource, entry.language),
        blocks: noteBlocks(library, language, book, row),
        provenance: entry.provenance,
      };
      intros.push(row.reference.chapter === undefined ? intro : { ...intro, chapter: row.reference.chapter });
    }
  }
  return intros.sort((left, right) => (left.chapter ?? 0) - (right.chapter ?? 0));
}

async function notesFor(
  library: Library,
  language: string,
  book: string,
  verses: readonly Verse[],
): Promise<Note[]> {
  const notes: Note[] = [];
  for (const entry of library.of(language, ['notes']).filter((item) => item.books.includes(book))) {
    for (const row of await bookNotes(library, entry, book)) {
      if (!helpsCover(row.reference, verses)) {
        continue;
      }
      const base = noteBase(book, row.reference);
      const support = row.support === '' ? undefined : resolveLink(row.support, base);
      const note = {
        id: row.id,
        study: isStudyResource(entry.provenance.resource, entry.language),
        reference: helpsReferenceText(book, row.reference),
        quote: row.quote,
        occurrence: row.occurrence,
        blocks: noteBlocks(library, language, book, row),
        words: attachQuote(row.quote, row.occurrence, row.reference, verses),
        provenance: entry.provenance,
      };
      notes.push(support === undefined ? note : { ...note, support });
    }
  }
  return notes;
}

async function wordLinksFor(
  library: Library,
  language: string,
  book: string,
  verses: readonly Verse[],
): Promise<WordLink[]> {
  const links: WordLink[] = [];
  for (const entry of library.of(language, ['wordLinks']).filter((item) => item.books.includes(book))) {
    for (const row of await bookWordLinks(library, entry, book)) {
      const article = wordLinkArticle(row.link);
      if (article === undefined || !helpsCover(row.reference, verses)) {
        continue;
      }
      const title = library.titleOf(language, { kind: 'article', id: article });
      const link = {
        id: row.id,
        reference: helpsReferenceText(book, row.reference),
        original: row.original,
        occurrence: row.occurrence,
        article,
        words: attachQuote(row.original, row.occurrence, row.reference, verses),
        provenance: entry.provenance,
      };
      links.push(title === undefined ? link : { ...link, title });
    }
  }
  return links;
}

async function questionsFor(
  library: Library,
  language: string,
  book: string,
  verses: readonly Verse[],
): Promise<Question[]> {
  const questions: Question[] = [];
  for (const entry of library.of(language, ['questions']).filter((item) => item.books.includes(book))) {
    for (const row of await bookQuestions(library, entry, book)) {
      if (helpsCover(row.reference, verses)) {
        questions.push({
          id: row.id,
          study: isStudyResource(entry.provenance.resource, entry.language),
          reference: helpsReferenceText(book, row.reference),
          question: row.question,
          response: row.response,
          provenance: entry.provenance,
        });
      }
    }
  }
  return questions;
}

async function audioFor(library: Library, language: string, reference: Reference): Promise<AudioClip[]> {
  const chapters = chaptersOf(reference);
  const clips: AudioClip[] = [];
  for (const entry of library.of(language, ['audio']).filter((item) => item.books.includes(reference.book))) {
    for (const clip of await audioClips(library, entry)) {
      if (clip.book === reference.book && chapters.includes(clip.chapter)) {
        clips.push({
          book: clip.book,
          chapter: clip.chapter,
          path: clip.path,
          mimeType: clip.mimeType,
          provenance: entry.provenance,
        });
      }
    }
  }
  return clips;
}

export async function assemblePassage(
  library: Library,
  reference: Reference,
  options: PassageOptions,
): Promise<Passage | undefined> {
  const { entry, texts } = chosenText(library, reference, options);
  if (entry === undefined) {
    return undefined;
  }
  const book = await textBook(library, entry, reference.book);
  if (book === undefined) {
    return undefined;
  }
  const verses = chaptersOf(reference).flatMap((chapter) =>
    (book.chapters.get(chapter) ?? []).filter((verse) => withinReference(reference, verse)),
  );
  if (verses.length === 0) {
    return undefined;
  }
  const available = choices.filter((choice) => texts.some((text) => text.kind === choice));
  const language = options.language;
  return {
    reference: formatReference(reference),
    language,
    text: {
      reading: readingOfKind(entry.kind),
      book: reference.book,
      bookName: book.name,
      direction: entry.direction,
      titles: chapterTitles(book, verses),
      verses,
      provenance: entry.provenance,
    },
    availableTexts: available.length === choices.length ? available : [],
    intros: await introsFor(library, language, reference.book, verses),
    notes: await notesFor(library, language, reference.book, verses),
    wordLinks: await wordLinksFor(library, language, reference.book, verses),
    questions: await questionsFor(library, language, reference.book, verses),
    audio: await audioFor(library, language, reference),
  };
}
