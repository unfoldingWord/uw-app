import type { Library } from './library';
import { academyPrefix, wordLinkArticle, wordsPrefix } from './links';
import {
  academyArticle,
  images,
  movements,
  stories,
  storyNoteRows,
  storyQuestionRows,
  storyWordLinkRows,
  wordArticle,
} from './loaders';
import { movementSectionOrder } from './layout';
import { renderMarkdown } from './markdown';
import { isStudyResource } from './readings';
import type { Entry } from './tables';
import type { HelpsReference } from './tsv';
import type {
  Article,
  Block,
  Frame,
  MovementSection,
  Movements,
  Story,
  StoryImage,
  StoryNote,
  StoryQuestion,
  StoryWordLink,
} from './types';

function frameOf(reference: HelpsReference, story: number): number | undefined {
  if (reference.kind === 'intro') {
    return undefined;
  }
  const range = reference.ranges[0];
  return range?.start.chapter === story ? range.start.verse : undefined;
}

export async function assembleArticle(
  library: Library,
  id: string,
  language: string,
): Promise<Article | undefined> {
  const prefix = id.split('/')[0];
  const kind = prefix === wordsPrefix ? 'word' : prefix === academyPrefix ? 'academy' : undefined;
  if (kind === undefined) {
    return undefined;
  }
  for (const entry of library.of(language, [kind === 'word' ? 'words' : 'academy'])) {
    const raw =
      kind === 'word' ? await wordArticle(library, entry, id) : await academyArticle(library, entry, id);
    if (raw === undefined) {
      continue;
    }
    const blocks = renderMarkdown(raw.body, {
      base: { resource: kind === 'word' ? 'tw' : 'ta', path: raw.path },
      titleOf: (target) => library.titleOf(language, target),
    });
    const article = {
      id,
      kind,
      title: raw.title,
      blocks,
      related: raw.related,
      provenance: entry.provenance,
    } as const;
    return raw.subtitle === undefined ? article : { ...article, subtitle: raw.subtitle };
  }
  return undefined;
}

async function imageFor(
  library: Library,
  storyEntry: Entry,
  name: string | undefined,
): Promise<StoryImage | undefined> {
  if (name === undefined) {
    return undefined;
  }
  const own = (await images(library, storyEntry)).get(name);
  if (own !== undefined) {
    return { name, path: own, provenance: storyEntry.provenance };
  }
  for (const entry of library.all().filter((item) => item.kind === 'images')) {
    const shared = (await images(library, entry)).get(name);
    if (shared !== undefined) {
      return { name, path: shared, provenance: entry.provenance };
    }
  }
  return undefined;
}

async function storyHelps(library: Library, language: string, story: number) {
  const notes: StoryNote[] = [];
  const questions: StoryQuestion[] = [];
  const wordLinks: StoryWordLink[] = [];
  const render = (text: string): Block[] =>
    renderMarkdown(text, {
      base: { resource: 'other', path: '' },
      titleOf: (target) => library.titleOf(language, target),
    });
  for (const entry of library.of(language, ['storyNotes'])) {
    for (const row of await storyNoteRows(library, entry)) {
      const frame = frameOf(row.reference, story);
      if (frame !== undefined) {
        notes.push({
          id: row.id,
          study: isStudyResource(entry.provenance.resource, entry.language),
          frame,
          quote: row.quote,
          blocks: render(row.note),
          provenance: entry.provenance,
        });
      }
    }
  }
  for (const entry of library.of(language, ['storyQuestions'])) {
    for (const row of await storyQuestionRows(library, entry)) {
      const frame = frameOf(row.reference, story);
      if (frame !== undefined) {
        questions.push({
          id: row.id,
          study: isStudyResource(entry.provenance.resource, entry.language),
          frame,
          question: row.question,
          response: row.response,
          provenance: entry.provenance,
        });
      }
    }
  }
  for (const entry of library.of(language, ['storyWordLinks'])) {
    for (const row of await storyWordLinkRows(library, entry)) {
      const frame = frameOf(row.reference, story);
      const article = wordLinkArticle(row.link);
      if (frame !== undefined && article !== undefined) {
        const title = library.titleOf(language, { kind: 'article', id: article });
        const link = {
          id: row.id,
          frame,
          words: row.original,
          article,
          provenance: entry.provenance,
        };
        wordLinks.push(title === undefined ? link : { ...link, title });
      }
    }
  }
  return { notes, questions, wordLinks };
}

export async function assembleStory(
  library: Library,
  number: number,
  language: string,
): Promise<Story | undefined> {
  for (const entry of library.of(language, ['stories'])) {
    const parsed = (await stories(library, entry)).get(number);
    if (parsed === undefined) {
      continue;
    }
    const frames: Frame[] = [];
    for (const frame of parsed.frames) {
      const image = await imageFor(library, entry, frame.imageName);
      const base = { number: frame.number, text: frame.text, provenance: entry.provenance };
      const named = frame.imageName === undefined ? base : { ...base, imageName: frame.imageName };
      frames.push(image === undefined ? named : { ...named, image });
    }
    return {
      number,
      language,
      title: parsed.title,
      direction: entry.direction,
      frames,
      bibleReference: parsed.bibleReference,
      references: parsed.references,
      ...(await storyHelps(library, language, number)),
      provenance: entry.provenance,
    };
  }
  return undefined;
}

function sectionOf(
  id: MovementSection['id'],
  markdown: string,
  language: string,
  library: Library,
): MovementSection {
  const blocks = renderMarkdown(markdown, {
    base: { resource: 'other', path: '' },
    titleOf: (target) => library.titleOf(language, target),
  });
  const [first, ...rest] = blocks;
  if (first?.kind === 'heading') {
    const title = first.children.map((inline) => (inline.kind === 'text' ? inline.text : '')).join('');
    return { id, title, blocks: rest };
  }
  return { id, title: id, blocks };
}

export async function assembleMovements(
  library: Library,
  story: number,
  language: string,
): Promise<Movements | undefined> {
  for (const entry of library.of(language, ['movements'])) {
    const raw = await movements(library, entry, story);
    if (raw === undefined) {
      continue;
    }
    const sections = movementSectionOrder.flatMap((id) => {
      const markdown = raw.get(id);
      return markdown === undefined ? [] : [sectionOf(id, markdown, language, library)];
    });
    return { story, language, sections, provenance: entry.provenance };
  }
  return undefined;
}
