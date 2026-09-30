import { isTsv, mimeTypes, storyImagesDirectory, type ListedIngredient } from '../burrito/flavors';
import { bookByCode, books } from '../domain/books';
import { academyArticleId, wordsArticleId } from './links';
import { storyNumberOf } from './stories';
import type { BurritoReader } from './source';
import type { MovementSectionId } from './types';

export type AcademyEntry = {
  readonly id: string;
  readonly manual: string;
  readonly slug: string;
  readonly titleKey: string;
  readonly subtitleKey?: string;
  readonly bodyKeys: readonly string[];
};

export type AudioEntry = {
  readonly book: string;
  readonly chapter: number;
  readonly key: string;
  readonly mimeType: string;
};

export const movementSectionOrder: readonly MovementSectionId[] = [
  'key-idea',
  'creedal-verse',
  'summary',
  'observation',
  'translation',
  'discourse',
  'theological',
  'journal',
  'drafting',
  'checking',
  'conclusion',
];

const licenceOrReadme = /^(licen[cs]e|readme)(\.[a-z]+)?$/i;
const numberedPage = /^(\d{2})\.md$/;
const movementPath = /^(\d{2})\/([a-z-]+)\.md$/;
const chapterInFile = /_(\d{1,3})\.[a-z0-9]+$/i;

function ofMime(reader: BurritoReader, mimeType: string): ListedIngredient[] {
  return reader.ingredients.filter((ingredient) => ingredient.entry.mimeType === mimeType);
}

function isContent(ingredient: ListedIngredient): boolean {
  return !licenceOrReadme.test(ingredient.path.split('/').at(-1) ?? '');
}

export function bookKeys(
  reader: BurritoReader,
  kind: (ingredient: ListedIngredient) => boolean,
): ReadonlyMap<string, string> {
  const found = new Map<string, string>();
  for (const ingredient of reader.ingredients.filter(kind)) {
    const [book] = Object.keys(ingredient.entry.scope ?? {});
    if (book !== undefined && bookByCode(book) !== undefined && !found.has(book)) {
      found.set(book, ingredient.key);
    }
  }
  return new Map(
    books.filter((book) => found.has(book.code)).map((book) => [book.code, found.get(book.code) ?? '']),
  );
}

export function storyHelpsKey(reader: BurritoReader): string | undefined {
  return reader.ingredients.find(isTsv)?.key;
}

export function wordKeys(reader: BurritoReader): ReadonlyMap<string, ListedIngredient> {
  const found = new Map<string, ListedIngredient>();
  for (const ingredient of ofMime(reader, mimeTypes.markdown).filter(isContent)) {
    const id = wordsArticleId(ingredient.path);
    if (id !== undefined) {
      found.set(id, ingredient);
    }
  }
  return found;
}

export function isAcademy(reader: BurritoReader): boolean {
  return reader.ingredients.some((ingredient) => /^[^/]+\/[^/]+\/title\.md$/.test(ingredient.path));
}

export function academyEntries(reader: BurritoReader): ReadonlyMap<string, AcademyEntry> {
  const byFolder = new Map<string, ListedIngredient[]>();
  for (const ingredient of reader.ingredients) {
    const parts = ingredient.path.split('/');
    if (parts.length === 3) {
      const folder = `${parts[0]}/${parts[1]}`;
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), ingredient]);
    }
  }
  const found = new Map<string, AcademyEntry>();
  for (const [folder, ingredients] of byFolder) {
    const [manual = '', slug = ''] = folder.split('/');
    const named = (name: string) => ingredients.find((ingredient) => ingredient.path.endsWith(`/${name}`));
    const title = named('title.md');
    const id = academyArticleId(manual, slug);
    if (title === undefined || id === undefined) {
      continue;
    }
    const subtitle = named('sub-title.md');
    const bodyKeys = ingredients
      .filter((ingredient) => numberedPage.test(ingredient.path.split('/').at(-1) ?? ''))
      .map((ingredient) => ingredient.key)
      .sort();
    found.set(
      id,
      subtitle === undefined
        ? { id, manual, slug, titleKey: title.key, bodyKeys }
        : { id, manual, slug, titleKey: title.key, subtitleKey: subtitle.key, bodyKeys },
    );
  }
  return found;
}

export function academyFile(reader: BurritoReader, manual: string, name: string): string | undefined {
  return reader.ingredients.find((ingredient) => ingredient.path === `${manual}/${name}`)?.key;
}

export function storyKeys(reader: BurritoReader): ReadonlyMap<number, string> {
  const found = new Map<number, string>();
  for (const ingredient of reader.ingredients) {
    const story = storyNumberOf(ingredient.path);
    if (story !== undefined) {
      found.set(story, ingredient.key);
    }
  }
  return new Map([...found.entries()].sort(([left], [right]) => left - right));
}

export function imageKeys(reader: BurritoReader): ReadonlyMap<string, string> {
  const found = new Map<string, string>();
  for (const ingredient of reader.ingredients) {
    if (ingredient.entry.mimeType.startsWith('image/') && ingredient.path.startsWith(storyImagesDirectory)) {
      found.set(ingredient.path.slice(storyImagesDirectory.length), ingredient.key);
    }
  }
  return found;
}

export function movementKeys(
  reader: BurritoReader,
): ReadonlyMap<number, ReadonlyMap<MovementSectionId, string>> {
  const found = new Map<number, Map<MovementSectionId, string>>();
  for (const ingredient of ofMime(reader, mimeTypes.markdown)) {
    const match = movementPath.exec(ingredient.path);
    const section = movementSectionOrder.find((candidate) => candidate === match?.[2]);
    const story = Number(match?.[1]);
    if (section === undefined || !(story >= 1 && story <= 50)) {
      continue;
    }
    const sections = found.get(story) ?? new Map<MovementSectionId, string>();
    sections.set(section, ingredient.key);
    found.set(story, sections);
  }
  return new Map([...found.entries()].sort(([left], [right]) => left - right));
}

export function audioEntries(reader: BurritoReader): readonly AudioEntry[] {
  return reader.ingredients.flatMap((ingredient) => {
    if (!ingredient.entry.mimeType.startsWith('audio/')) {
      return [];
    }
    const scope = ingredient.entry.scope ?? {};
    const [book] = Object.keys(scope);
    if (book === undefined || bookByCode(book) === undefined) {
      return [];
    }
    const chapters = (scope[book] ?? [])
      .map(Number)
      .filter((chapter) => Number.isInteger(chapter) && chapter > 0);
    const fromName = Number(chapterInFile.exec(ingredient.path)?.[1]);
    const chapter =
      chapters.length === 1 ? chapters[0] : Number.isInteger(fromName) && fromName > 0 ? fromName : undefined;
    return chapter === undefined
      ? []
      : [{ book, chapter, key: ingredient.key, mimeType: ingredient.entry.mimeType }];
  });
}

export const storyHelpsFlavors = {
  notes: ['x-bcvnotes', 'x-obsnotes'],
  questions: ['x-bcvquestions', 'x-obsquestions'],
  wordLinks: ['x-bcvarticles'],
} as const satisfies Readonly<Record<string, readonly string[]>>;
