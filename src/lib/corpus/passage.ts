import { formatReference, type Reference } from '../domain/reference';
import { attachQuote, coversVerse } from './alignment';
import type { Library } from './library';
import { resolveLink } from './links';
import { audioClips, bookNotes, bookQuestions, bookWordLinks, textBook } from './loaders';
import { renderMarkdown } from './markdown';
import type { Entry } from './tables';
import type { HelpsReference } from './tsv';
import type {
  AudioClip,
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
    return book;
  }
  const [first] = reference.ranges;
  const last = reference.ranges.at(-1);
  if (first === undefined || last === undefined) {
    return book;
  }
  const same = first.start.chapter === last.end.chapter && first.start.verse === last.end.verse;
  return formatReference(same ? { book, start: first.start } : { book, start: first.start, end: last.end });
}

function helpsCover(reference: HelpsReference, verses: readonly Verse[]): boolean {
  return verses.some((verse) => coversVerse(reference, verse));
}

function chosenText(
  library: Library,
  reference: Reference,
  options: PassageOptions,
): { entry: Entry | undefined; texts: readonly Entry[] } {
  const texts = library
    .of(options.language, textKinds)
    .filter((entry) => entry.books.includes(reference.book));
  const wanted = options.text;
  const pick = (kind: Reading): Entry | undefined => texts.find((entry) => entry.kind === kind);
  const entry =
    wanted === undefined ? (pick('literal') ?? pick('simplified') ?? pick('original')) : pick(wanted);
  return { entry, texts };
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
      const support =
        row.support === '' ? undefined : resolveLink(row.support, { resource: 'other', path: '' });
      const blocks = renderMarkdown(row.note, {
        base: { resource: 'other', path: '' },
        titleOf: (target) => library.titleOf(language, target),
      });
      const note = {
        id: row.id,
        reference: helpsReferenceText(book, row.reference),
        quote: row.quote,
        occurrence: row.occurrence,
        blocks,
        words: attachQuote(row.quote, row.occurrence, row.reference, verses),
        provenance: entry.provenance,
      };
      notes.push(support === undefined ? note : { ...note, support });
    }
  }
  return notes;
}

function articleOfLink(link: string): string | undefined {
  const target = resolveLink(link, { resource: 'other', path: '' });
  return target?.kind === 'article' ? target.id : undefined;
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
      const article = articleOfLink(row.link);
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
      reading: entry.kind === 'simplified' || entry.kind === 'original' ? entry.kind : 'literal',
      book: reference.book,
      bookName: book.name,
      direction: entry.direction,
      verses,
      provenance: entry.provenance,
    },
    availableTexts: available.length === choices.length ? available : [],
    notes: await notesFor(library, language, reference.book, verses),
    wordLinks: await wordLinksFor(library, language, reference.book, verses),
    questions: await questionsFor(library, language, reference.book, verses),
    audio: await audioFor(library, language, reference),
  };
}
