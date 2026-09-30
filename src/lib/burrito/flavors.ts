import { bookByCode } from '../domain/books';
import type { ResourceRow } from '../domain/pack';
import { repositoryCode, type IngredientEntry } from './metadata';

export type RowId = ResourceRow;

type RowStatus = 'pinned' | 'provisional';

export type ListedIngredient = {
  readonly key: string;
  readonly path: string;
  readonly entry: IngredientEntry;
};

type RowMismatch = { readonly path: string; readonly message: string };

export type RowContext = { readonly repository: string | undefined };

export type RowForm = {
  readonly resource: string;
  readonly flavorType: string;
  readonly flavors: readonly string[];
  readonly appliesTo: (ingredients: readonly ListedIngredient[], context: RowContext) => boolean;
  readonly check: (ingredients: readonly ListedIngredient[]) => RowMismatch | undefined;
};

export type ContractRow = {
  readonly id: RowId;
  readonly status: RowStatus;
  readonly resource: string;
  readonly forms: readonly RowForm[];
};

export type MatchedRow = { readonly row: ContractRow; readonly form: RowForm };

export const mimeTypes = {
  usfm: 'text/plain',
  tsv: 'text/tab-separated-values',
  markdown: 'text/markdown',
  yaml: 'text/yaml',
  mp3: 'audio/mpeg',
  jpeg: 'image/jpeg',
} as const;

const usfmMimeTypes: ReadonlySet<string> = new Set([mimeTypes.usfm, 'text/x-usfm', 'text/usfm']);

const usfmExtension = /\.u?sfm$/i;

const wordsPayloadDirectory = 'payload/';

const wordsRepositoryCode = 'tw';

const storiesScope = 'OBS';

export function isUsfm(ingredient: Pick<ListedIngredient, 'path' | 'entry'>): boolean {
  return usfmExtension.test(ingredient.path) && usfmMimeTypes.has(ingredient.entry.mimeType);
}

export function isTsv(ingredient: Pick<ListedIngredient, 'entry'>): boolean {
  return ingredient.entry.mimeType === mimeTypes.tsv;
}

export const provisionalFlavors = {
  formation: { flavorType: 'peripheral', flavor: 'x-OBSTheologicalFormation' },
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

type IngredientKind = { readonly name: string; readonly test: (ingredient: ListedIngredient) => boolean };

const usfmKind: IngredientKind = { name: 'USFM (.usfm, text/plain)', test: isUsfm };

const tsvKind: IngredientKind = { name: `TSV (${mimeTypes.tsv})`, test: isTsv };

function ofMimePrefix(ingredients: readonly ListedIngredient[], prefix: string): ListedIngredient[] {
  return ingredients.filter((ingredient) => ingredient.entry.mimeType.startsWith(prefix));
}

function isStoryNumber(value: string): boolean {
  const story = Number(value);
  return story >= firstStory && story <= lastStory;
}

function oneBookEach(
  ingredients: readonly ListedIngredient[],
  kind: IngredientKind,
): RowMismatch | undefined {
  const files = ingredients.filter(kind.test);
  if (files.length === 0) {
    return { path: 'ingredients', message: `no ${kind.name} ingredient` };
  }
  for (const file of files) {
    const books = scopedBooks(file.entry);
    if (books.length !== 1 || !books.every((book) => bookCode.test(book) && book !== storiesScope)) {
      return { path: file.key, message: `a ${kind.name} ingredient has a scope naming exactly one book` };
    }
  }
  return undefined;
}

const peripheralUsfmBooks: ReadonlySet<string> = new Set([
  'FRT',
  'BAK',
  'OTH',
  'INT',
  'CNC',
  'GLO',
  'TDX',
  'NDX',
  'TOB',
  'JDT',
  'ESG',
  'WIS',
  'SIR',
  'BAR',
  'LJE',
  'S3Y',
  'SUS',
  'BEL',
  '1MA',
  '2MA',
  '3MA',
  '4MA',
  '1ES',
  '2ES',
  'MAN',
  'PS2',
  'ODA',
  'PSS',
  'EZA',
  '5EZ',
  '6EZ',
  'DAG',
  'PS3',
  '2BA',
  'LBA',
  'JUB',
  'ENO',
  '1MQ',
  '2MQ',
  '3MQ',
  'REP',
  '4BA',
  'LAO',
  'XXA',
  'XXB',
  'XXC',
  'XXD',
  'XXE',
  'XXF',
  'XXG',
]);

const usfmFileBook = /(?:^|[-_/])([A-Za-z0-9]{3})\.u?sfm$/i;

function isUsfmBook(book: string): boolean {
  return bookByCode(book) !== undefined || peripheralUsfmBooks.has(book);
}

function isPeripheralFile(file: ListedIngredient): boolean {
  const book = usfmFileBook.exec(file.path)?.[1]?.toUpperCase();
  return book !== undefined && peripheralUsfmBooks.has(book);
}

function scriptureBooks(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  const files = ingredients.filter(usfmKind.test);
  for (const file of files) {
    const books = scopedBooks(file.entry);
    const unscopedPeripheral = books.length === 0 && isPeripheralFile(file);
    if (!unscopedPeripheral && (books.length !== 1 || !books.every(isUsfmBook))) {
      return {
        path: file.key,
        message: `a ${usfmKind.name} ingredient has a scope naming exactly one USFM book, or is unscoped front, back or other matter`,
      };
    }
  }
  const canonical = files.some((file) =>
    scopedBooks(file.entry).some((book) => bookByCode(book) !== undefined),
  );
  if (!canonical) {
    return { path: 'ingredients', message: `no ${usfmKind.name} ingredient scoped to a book of the Bible` };
  }
  return undefined;
}

function storyScopedTsv(ingredients: readonly ListedIngredient[]): boolean {
  return !ofType(ingredients, mimeTypes.tsv).some((ingredient) =>
    scopedBooks(ingredient.entry).some((book) => book !== storiesScope),
  );
}

function payloadArticles(ingredients: readonly ListedIngredient[]): ListedIngredient[] {
  return ofType(ingredients, mimeTypes.markdown).filter((ingredient) =>
    ingredient.path.startsWith(wordsPayloadDirectory),
  );
}

function carriesWords(ingredients: readonly ListedIngredient[], context: RowContext): boolean {
  return (
    repositoryCode(context.repository) === wordsRepositoryCode && payloadArticles(ingredients).length > 0
  );
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

const academyArticle = /^([^/]+)\/[^/]+\/01\.md$/;

const configFile = 'config.yaml';

function configsOf(ingredients: readonly ListedIngredient[]): ListedIngredient[] | RowMismatch {
  const configs = ingredients.filter(
    (ingredient) => ingredient.path === configFile || ingredient.path.endsWith(`/${configFile}`),
  );
  const misnamed = configs.find((config) => config.entry.mimeType !== mimeTypes.yaml);
  if (misnamed) {
    return { path: misnamed.key, message: `${configFile} is listed as ${mimeTypes.yaml}` };
  }
  return configs;
}

function payloadTree(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  if (payloadArticles(ingredients).length === 0) {
    return { path: `ingredients/${wordsPayloadDirectory}`, message: 'no Markdown article under payload/' };
  }
  const configs = configsOf(ingredients);
  return Array.isArray(configs) ? undefined : configs;
}

function articleTree(ingredients: readonly ListedIngredient[]): RowMismatch | undefined {
  if (ofType(ingredients, mimeTypes.markdown).length === 0) {
    return { path: 'ingredients', message: 'no Markdown article ingredient' };
  }
  const configs = configsOf(ingredients);
  if (!Array.isArray(configs)) {
    return configs;
  }
  const listed = new Set(configs.map((config) => config.path));
  for (const ingredient of ofType(ingredients, mimeTypes.markdown)) {
    const section = academyArticle.exec(ingredient.path)?.[1];
    if (section !== undefined && !listed.has(`${section}/${configFile}`)) {
      return {
        path: `ingredients/${section}/${configFile}`,
        message: `the Academy section ${section} has no ${configFile}`,
      };
    }
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
    forms: [
      {
        resource: 'Literal text, Simplified text, Hebrew, Greek',
        flavorType: 'scripture',
        flavors: ['textTranslation'],
        appliesTo: always,
        check: scriptureBooks,
      },
    ],
  },
  {
    id: 'storyHelps',
    status: 'pinned',
    resource: 'Story helps',
    forms: [
      {
        resource: 'Story helps',
        flavorType: 'parascriptural',
        flavors: ['x-bcvnotes', 'x-bcvquestions', 'x-bcvarticles'],
        appliesTo: storyScopedTsv,
        check: oneStoryTsv,
      },
      {
        resource: 'Story helps',
        flavorType: 'peripheral',
        flavors: ['x-obsnotes', 'x-obsquestions'],
        appliesTo: always,
        check: oneStoryTsv,
      },
    ],
  },
  {
    id: 'notes',
    status: 'pinned',
    resource: 'Notes',
    forms: [
      {
        resource: 'Notes',
        flavorType: 'parascriptural',
        flavors: ['x-bcvnotes'],
        appliesTo: always,
        check: (ingredients) => oneBookEach(ingredients, tsvKind),
      },
    ],
  },
  {
    id: 'articles',
    status: 'pinned',
    resource: 'Words, Academy',
    forms: [
      {
        resource: 'Words',
        flavorType: 'parascriptural',
        flavors: ['x-bcvarticles'],
        appliesTo: carriesWords,
        check: payloadTree,
      },
      {
        resource: 'Words, Academy',
        flavorType: 'peripheral',
        flavors: ['x-peripheralArticles'],
        appliesTo: always,
        check: articleTree,
      },
    ],
  },
  {
    id: 'wordLinks',
    status: 'pinned',
    resource: 'Word Links',
    forms: [
      {
        resource: 'Word Links',
        flavorType: 'parascriptural',
        flavors: ['x-bcvarticles'],
        appliesTo: always,
        check: (ingredients) => oneBookEach(ingredients, tsvKind),
      },
    ],
  },
  {
    id: 'questions',
    status: 'pinned',
    resource: 'Questions',
    forms: [
      {
        resource: 'Questions',
        flavorType: 'parascriptural',
        flavors: ['x-bcvquestions'],
        appliesTo: always,
        check: (ingredients) => oneBookEach(ingredients, tsvKind),
      },
    ],
  },
  {
    id: 'stories',
    status: 'pinned',
    resource: 'Open Bible Stories',
    forms: [
      {
        resource: 'Open Bible Stories',
        flavorType: 'gloss',
        flavors: ['textStories'],
        appliesTo: always,
        check: storyFiles,
      },
    ],
  },
];

function provisional(id: RowId, resource: string, form: Omit<RowForm, 'resource'>): ContractRow {
  return { id, status: 'provisional', resource, forms: [{ resource, ...form }] };
}

const provisionalRows: readonly ContractRow[] = [
  provisional('formation', 'Theological formation', {
    flavorType: provisionalFlavors.formation.flavorType,
    flavors: [provisionalFlavors.formation.flavor],
    appliesTo: always,
    check: movementsPerStory,
  }),
  provisional('audio', 'Audio', {
    flavorType: provisionalFlavors.audio.flavorType,
    flavors: [provisionalFlavors.audio.flavor],
    appliesTo: always,
    check: scopedAudio,
  }),
  provisional('images', 'Story images', {
    flavorType: provisionalFlavors.images.flavorType,
    flavors: [provisionalFlavors.images.flavor],
    appliesTo: always,
    check: storyImages,
  }),
];

export const admittedRows: readonly ContractRow[] = [...pinnedRows, ...provisionalRows];

function orderedForms(rows: readonly ContractRow[]): MatchedRow[] {
  const all = rows.flatMap((row) => row.forms.map((form) => ({ row, form })));
  return [
    ...all.filter(({ form }) => form.appliesTo !== always),
    ...all.filter(({ form }) => form.appliesTo === always),
  ];
}

export function rowFor(
  rows: readonly ContractRow[],
  flavorType: string,
  flavor: string,
  ingredients: readonly ListedIngredient[],
  context: RowContext,
): MatchedRow | undefined {
  return orderedForms(rows).find(
    ({ form }) =>
      form.flavorType === flavorType && form.flavors.includes(flavor) && form.appliesTo(ingredients, context),
  );
}
