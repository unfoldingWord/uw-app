import type { IngredientEntry } from './metadata';

export type RowId =
  | 'text'
  | 'notes'
  | 'wordLinks'
  | 'questions'
  | 'articles'
  | 'stories'
  | 'storyHelps'
  | 'formation'
  | 'audio'
  | 'images';

type RowStatus = 'pinned' | 'provisional';

export type ListedIngredient = {
  readonly key: string;
  readonly path: string;
  readonly entry: IngredientEntry;
};

type RowMismatch = { readonly path: string; readonly message: string };

export type ContractRow = {
  readonly id: RowId;
  readonly status: RowStatus;
  readonly resource: string;
  readonly flavorType: string;
  readonly flavors: readonly string[];
  readonly appliesTo: (ingredients: readonly ListedIngredient[]) => boolean;
  readonly check: (ingredients: readonly ListedIngredient[]) => RowMismatch | undefined;
};

export const mimeTypes = {
  usfm: 'text/x-usfm',
  tsv: 'text/tab-separated-values',
  markdown: 'text/markdown',
  yaml: 'text/yaml',
  mp3: 'audio/mpeg',
  jpeg: 'image/jpeg',
} as const;

export const provisionalFlavors = {
  formation: { flavorType: 'parascriptural', flavor: 'x-obsMovements' },
  audio: { flavorType: 'scripture', flavor: 'audioTranslation' },
  images: { flavorType: 'peripheral', flavor: 'x-obsImages' },
} as const;

export const storyImagesDirectory = 'images/';

export const requiredFormationSections = [
  'key-idea',
  'creedal-verse',
  'summary',
  'observation',
  'translation',
  'discourse',
  'theological',
  'journal',
] as const;

const optionalFormationSections = ['drafting', 'checking', 'conclusion'] as const;

const formationSections: readonly string[] = [...requiredFormationSections, ...optionalFormationSections];

const bookCode = /^[A-Z0-9]{3}$/;
const storyFile = /^content\/(\d{2})\.md$/;
const formationFile = /^(\d{2})\/([a-z-]+)\.md$/;
const firstStory = 1;
const lastStory = 50;

const always = (): boolean => true;

function scopedBooks(entry: IngredientEntry): string[] {
  return Object.keys(entry.scope ?? {});
}

function ofType(ingredients: readonly ListedIngredient[], mimeType: string): ListedIngredient[] {
  return ingredients.filter((ingredient) => ingredient.entry.mimeType === mimeType);
}

function ofMimePrefix(ingredients: readonly ListedIngredient[], prefix: string): ListedIngredient[] {
  return ingredients.filter((ingredient) => ingredient.entry.mimeType.startsWith(prefix));
}

function isStoryNumber(value: string): boolean {
  const story = Number(value);
  return story >= firstStory && story <= lastStory;
}

function oneBookEach(
  ingredients: readonly ListedIngredient[],
  mimeType: string,
  kind: string,
): RowMismatch | undefined {
  const files = ofType(ingredients, mimeType);
  if (files.length === 0) {
    return { path: 'ingredients', message: `no ${kind} ingredient (${mimeType})` };
  }
  for (const file of files) {
    const books = scopedBooks(file.entry);
    if (books.length !== 1 || !books.every((book) => bookCode.test(book))) {
      return { path: file.key, message: `a ${kind} ingredient has a scope naming exactly one book` };
    }
  }
  return undefined;
}

function bookScopedTsv(ingredients: readonly ListedIngredient[]): boolean {
  return ofType(ingredients, mimeTypes.tsv).some((ingredient) => scopedBooks(ingredient.entry).length > 0);
}

function oneStoryTsv(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  const files = ofType(ingredients, mimeTypes.tsv);
  if (files.length !== 1) {
    return { path: 'ingredients', message: `story helps carry one TSV, found ${files.length}` };
  }
  return undefined;
}

function storyFiles(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  const stories = ingredients.flatMap((ingredient) => {
    const match = storyFile.exec(ingredient.path);
    return match?.[1] ? [{ path: ingredient.key, number: match[1] }] : [];
  });
  if (stories.length === 0) {
    return { path: 'ingredients/content', message: 'no story ingredient content/01.md to content/50.md' };
  }
  const outside = stories.find((story) => !isStoryNumber(story.number));
  if (outside) {
    return { path: outside.path, message: 'stories are numbered 01 to 50' };
  }
  return undefined;
}

function markdownTree(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  if (ofType(ingredients, mimeTypes.markdown).length === 0) {
    return { path: 'ingredients', message: 'no Markdown article ingredient' };
  }
  return undefined;
}

function movementsPerStory(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  const sections = new Map<string, Set<string>>();
  for (const ingredient of ofType(ingredients, mimeTypes.markdown)) {
    const match = formationFile.exec(ingredient.path);
    if (!match?.[1] || !match[2]) {
      continue;
    }
    if (!isStoryNumber(match[1]) || !formationSections.includes(match[2])) {
      return { path: ingredient.key, message: 'formation sections are NN/<section>.md for stories 01 to 50' };
    }
    const found = sections.get(match[1]) ?? new Set<string>();
    found.add(match[2]);
    sections.set(match[1], found);
  }
  if (sections.size === 0) {
    return { path: 'ingredients', message: 'no formation section NN/<section>.md' };
  }
  for (const [story, found] of sections) {
    const missing = requiredFormationSections.find((section) => !found.has(section));
    if (missing) {
      return { path: `ingredients/${story}/${missing}.md`, message: `story ${story} lacks ${missing}` };
    }
  }
  return undefined;
}

function scopedAudio(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  const files = ofMimePrefix(ingredients, 'audio/');
  if (files.length === 0) {
    return { path: 'ingredients', message: 'no audio ingredient' };
  }
  const unscoped = files.find((file) => scopedBooks(file.entry).length === 0);
  if (unscoped) {
    return { path: unscoped.key, message: 'an audio ingredient has a scope naming its book' };
  }
  return undefined;
}

function storyImages(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  const files = ofMimePrefix(ingredients, 'image/');
  if (files.length === 0) {
    return { path: 'ingredients', message: 'no image ingredient' };
  }
  const misplaced = files.find((file) => !file.path.startsWith(storyImagesDirectory));
  if (misplaced) {
    return { path: misplaced.key, message: `images live under ingredients/${storyImagesDirectory}` };
  }
  return undefined;
}

export const pinnedRows: readonly ContractRow[] = [
  {
    id: 'text',
    status: 'pinned',
    resource: 'Literal text, Simplified text, Hebrew, Greek',
    flavorType: 'scripture',
    flavors: ['textTranslation'],
    appliesTo: always,
    check: (ingredients) => oneBookEach(ingredients, mimeTypes.usfm, 'USFM'),
  },
  {
    id: 'storyHelps',
    status: 'pinned',
    resource: 'Story helps',
    flavorType: 'parascriptural',
    flavors: ['x-bcvnotes', 'x-bcvquestions', 'x-bcvarticles'],
    appliesTo: (ingredients) => !bookScopedTsv(ingredients),
    check: oneStoryTsv,
  },
  {
    id: 'notes',
    status: 'pinned',
    resource: 'Notes',
    flavorType: 'parascriptural',
    flavors: ['x-bcvnotes'],
    appliesTo: always,
    check: (ingredients) => oneBookEach(ingredients, mimeTypes.tsv, 'TSV'),
  },
  {
    id: 'wordLinks',
    status: 'pinned',
    resource: 'Word Links',
    flavorType: 'parascriptural',
    flavors: ['x-bcvarticles'],
    appliesTo: always,
    check: (ingredients) => oneBookEach(ingredients, mimeTypes.tsv, 'TSV'),
  },
  {
    id: 'questions',
    status: 'pinned',
    resource: 'Questions',
    flavorType: 'parascriptural',
    flavors: ['x-bcvquestions'],
    appliesTo: always,
    check: (ingredients) => oneBookEach(ingredients, mimeTypes.tsv, 'TSV'),
  },
  {
    id: 'articles',
    status: 'pinned',
    resource: 'Words, Academy',
    flavorType: 'peripheral',
    flavors: ['x-peripheralArticles'],
    appliesTo: always,
    check: markdownTree,
  },
  {
    id: 'stories',
    status: 'pinned',
    resource: 'Open Bible Stories',
    flavorType: 'gloss',
    flavors: ['textStories'],
    appliesTo: always,
    check: storyFiles,
  },
];

const provisionalRows: readonly ContractRow[] = [
  {
    id: 'formation',
    status: 'provisional',
    resource: 'Theological formation',
    flavorType: provisionalFlavors.formation.flavorType,
    flavors: [provisionalFlavors.formation.flavor],
    appliesTo: always,
    check: movementsPerStory,
  },
  {
    id: 'audio',
    status: 'provisional',
    resource: 'Audio',
    flavorType: provisionalFlavors.audio.flavorType,
    flavors: [provisionalFlavors.audio.flavor],
    appliesTo: always,
    check: scopedAudio,
  },
  {
    id: 'images',
    status: 'provisional',
    resource: 'Story images',
    flavorType: provisionalFlavors.images.flavorType,
    flavors: [provisionalFlavors.images.flavor],
    appliesTo: always,
    check: storyImages,
  },
];

export const admittedRows: readonly ContractRow[] = [...pinnedRows, ...provisionalRows];

export function rowFor(
  rows: readonly ContractRow[],
  flavorType: string,
  flavor: string,
  ingredients: readonly ListedIngredient[],
): ContractRow | undefined {
  return rows.find(
    (row) => row.flavorType === flavorType && row.flavors.includes(flavor) && row.appliesTo(ingredients),
  );
}
