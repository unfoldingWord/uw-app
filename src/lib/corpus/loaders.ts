import { parse as parseYaml } from 'yaml';
import { isTsv, isUsfm } from '../burrito/flavors';
import {
  academyEntries,
  academyFile,
  audioEntries,
  bookKeys,
  imageKeys,
  movementKeys,
  storyHelpsKey,
  storyKeys,
  wordKeys,
  type AcademyEntry,
  type AudioEntry,
} from './layout';
import type { Library } from './library';
import { academyArticleId } from './links';
import { parseStory, type ParsedStory } from './stories';
import type { Entry } from './tables';
import {
  noteRows,
  questionRows,
  wordLinkRows,
  type NoteRow,
  type QuestionRow,
  type WordLinkRow,
} from './tsv';
import { parseUsfm, type UsfmBook } from './usfm';
import type { MovementSectionId } from './types';

export type RawArticle = {
  readonly path: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly body: string;
  readonly related: readonly string[];
};

export type RawMovements = ReadonlyMap<MovementSectionId, string>;

export function textBook(library: Library, entry: Entry, book: string): Promise<UsfmBook | undefined> {
  return library.cached(entry, `usfm:${book}`, async (reader) => {
    const key = bookKeys(reader, isUsfm).get(book);
    return key === undefined ? undefined : parseUsfm(await reader.read(key));
  });
}

async function helpsText(library: Library, entry: Entry, book: string): Promise<string | undefined> {
  const reader = await library.reader(entry);
  const key = bookKeys(reader, isTsv).get(book);
  return key === undefined ? undefined : reader.read(key);
}

export function bookNotes(library: Library, entry: Entry, book: string): Promise<readonly NoteRow[]> {
  return library.cached(entry, `notes:${book}`, async () =>
    noteRows((await helpsText(library, entry, book)) ?? ''),
  );
}

export function bookWordLinks(library: Library, entry: Entry, book: string): Promise<readonly WordLinkRow[]> {
  return library.cached(entry, `links:${book}`, async () =>
    wordLinkRows((await helpsText(library, entry, book)) ?? ''),
  );
}

export function bookQuestions(library: Library, entry: Entry, book: string): Promise<readonly QuestionRow[]> {
  return library.cached(entry, `questions:${book}`, async () =>
    questionRows((await helpsText(library, entry, book)) ?? ''),
  );
}

async function storyHelpsText(library: Library, entry: Entry): Promise<string> {
  const reader = await library.reader(entry);
  const key = storyHelpsKey(reader);
  return key === undefined ? '' : reader.read(key);
}

export function storyNoteRows(library: Library, entry: Entry): Promise<readonly NoteRow[]> {
  return library.cached(entry, 'story-notes', async () => noteRows(await storyHelpsText(library, entry)));
}

export function storyQuestionRows(library: Library, entry: Entry): Promise<readonly QuestionRow[]> {
  return library.cached(entry, 'story-questions', async () =>
    questionRows(await storyHelpsText(library, entry)),
  );
}

export function storyWordLinkRows(library: Library, entry: Entry): Promise<readonly WordLinkRow[]> {
  return library.cached(entry, 'story-links', async () => wordLinkRows(await storyHelpsText(library, entry)));
}

export function wordArticle(library: Library, entry: Entry, id: string): Promise<RawArticle | undefined> {
  return library.cached(entry, `word:${id}`, async (reader) => {
    const ingredient = wordKeys(reader).get(id);
    if (ingredient === undefined) {
      return undefined;
    }
    const text = await reader.read(ingredient.key);
    const heading = /^#\s+(.+)$/m.exec(text);
    const title = heading?.[1]?.trim() ?? id.split('/').at(-1) ?? id;
    return { path: ingredient.path, title, body: text, related: [] };
  });
}

type AcademyConfig = Readonly<Record<string, readonly string[]>>;

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function academyConfig(library: Library, entry: Entry, manual: string): Promise<AcademyConfig> {
  return library.cached(entry, `config:${manual}`, async (reader) => {
    const key = academyFile(reader, manual, 'config.yaml');
    if (key === undefined) {
      return {};
    }
    let parsed: unknown;
    try {
      parsed = parseYaml(await reader.read(key));
    } catch {
      return {};
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([slug, value]) => {
        const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
        return [slug, [...stringList(record.dependencies), ...stringList(record.recommended)]];
      }),
    );
  });
}

function academyEntry(library: Library, entry: Entry, id: string): Promise<AcademyEntry | undefined> {
  return library.cached(entry, `academy-entry:${id}`, async (reader) => academyEntries(reader).get(id));
}

export async function academyArticle(
  library: Library,
  entry: Entry,
  id: string,
): Promise<RawArticle | undefined> {
  const found = await academyEntry(library, entry, id);
  if (found === undefined) {
    return undefined;
  }
  const reader = await library.reader(entry);
  const config = await academyConfig(library, entry, found.manual);
  const pages = await Promise.all(found.bodyKeys.map((key) => reader.read(key)));
  const subtitle =
    found.subtitleKey === undefined ? undefined : (await reader.read(found.subtitleKey)).trim();
  const related = [...new Set(config[found.slug] ?? [])].flatMap(
    (slug) => academyArticleId(found.manual, slug) ?? [],
  );
  const article = {
    path: `${found.manual}/${found.slug}/01.md`,
    title: (await reader.read(found.titleKey)).trim(),
    body: pages.join('\n\n'),
    related,
  };
  return subtitle === undefined || subtitle === '' ? article : { ...article, subtitle };
}

export function academyOrder(library: Library, entry: Entry): Promise<readonly string[]> {
  return library.cached(entry, 'academy-order', async (reader) => {
    const manuals = [...new Set([...academyEntries(reader).values()].map((item) => item.manual))];
    const ordered: string[] = [];
    for (const manual of manuals) {
      const key = academyFile(reader, manual, 'toc.yaml');
      let toc: unknown;
      try {
        toc = key === undefined ? undefined : parseYaml(await reader.read(key));
      } catch {
        toc = undefined;
      }
      const walk = (node: unknown): void => {
        if (typeof node !== 'object' || node === null) {
          return;
        }
        const record = node as Record<string, unknown>;
        const id = typeof record.link === 'string' ? academyArticleId(manual, record.link) : undefined;
        if (id !== undefined) {
          ordered.push(id);
        }
        if (Array.isArray(record.sections)) {
          record.sections.forEach(walk);
        }
      };
      walk(toc);
    }
    const rest = [...academyEntries(reader).keys()].filter((id) => !ordered.includes(id)).sort();
    return [...ordered, ...rest];
  });
}

export function stories(library: Library, entry: Entry): Promise<ReadonlyMap<number, ParsedStory>> {
  return library.cached(entry, 'stories', async (reader) => {
    const parsed = new Map<number, ParsedStory>();
    for (const [story, key] of storyKeys(reader)) {
      parsed.set(story, parseStory(story, await reader.read(key)));
    }
    return parsed;
  });
}

export function images(library: Library, entry: Entry): Promise<ReadonlyMap<string, string>> {
  return library.cached(entry, 'images', async (reader) => {
    const found = new Map<string, string>();
    for (const [name, key] of imageKeys(reader)) {
      found.set(name, reader.pathOf(key));
    }
    return found;
  });
}

export function audioClips(
  library: Library,
  entry: Entry,
): Promise<readonly (AudioEntry & { path: string })[]> {
  return library.cached(entry, 'audio', async (reader) =>
    audioEntries(reader).map((clip) => ({ ...clip, path: reader.pathOf(clip.key) })),
  );
}

export function movements(library: Library, entry: Entry, story: number): Promise<RawMovements | undefined> {
  return library.cached(entry, `movements:${story}`, async (reader) => {
    const keys = movementKeys(reader).get(story);
    if (keys === undefined) {
      return undefined;
    }
    const sections = new Map<MovementSectionId, string>();
    for (const [section, key] of keys) {
      sections.set(section, await reader.read(key));
    }
    return sections;
  });
}

export function movementStories(library: Library, entry: Entry): Promise<readonly number[]> {
  return library.cached(entry, 'movement-stories', async (reader) => [...movementKeys(reader).keys()]);
}
