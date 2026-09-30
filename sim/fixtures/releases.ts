import type { IngredientInput } from '@lib/burrito/build';
import { utf8 } from '@lib/burrito/files';
import { mimeTypes, provisionalFlavors, storyImagesDirectory } from '@lib/burrito/flavors';
import type { JsonValue, Scope } from '@lib/burrito/metadata';
import { academyArticles, wordArticles, type ArticleFile } from './articles.ts';
import {
  bookNotes,
  bookQuestions,
  bookWordLinks,
  storyNotes,
  storyQuestions,
  storyWordLinks,
  tsv,
  type HelpsTable,
} from './helps.ts';
import { greyJpeg, silentMp3 } from './media.ts';
import {
  bookUsfm,
  frontMatterUsfm,
  greekBooks,
  hebrewBooks,
  literalBooks,
  originalUsfm,
  simplifiedBooks,
  stubBookUsfm,
  usfmFileName,
  type Book,
} from './scripture.ts';
import {
  formationSessions,
  frameImageName,
  sectionMarkdown,
  storiesFor,
  storyFileName,
  storyMarkdown,
  type StoryLanguage,
} from './stories.ts';

type FixtureLanguage = {
  readonly tag: string;
  readonly title: string;
  readonly englishName: string;
  readonly direction: 'ltr' | 'rtl';
  readonly gatewayLanguage: boolean;
};

type CatalogFlavor = { readonly flavorType: string; readonly flavor: string };

export type FixtureStatement = { readonly statement: string; readonly bare: boolean };

export type FixtureRelease = {
  readonly publisher: string;
  readonly resource: string;
  readonly tag: string;
  readonly released: string;
  readonly language: FixtureLanguage;
  readonly subject: string;
  readonly title: string;
  readonly abbreviation: string;
  readonly flavorType: string;
  readonly flavor: string;
  readonly catalogFlavor?: CatalogFlavor;
  readonly statement?: FixtureStatement;
  readonly flavorDetails?: { readonly [detail: string]: JsonValue };
  readonly currentScope?: Scope;
  readonly books: readonly string[];
  readonly ingredients: readonly IngredientInput[];
};

const languages = {
  qaa: {
    tag: 'qaa',
    title: 'Fixture A',
    englishName: 'Fixture language A',
    direction: 'ltr',
    gatewayLanguage: true,
  },
  qab: {
    tag: 'qab',
    title: 'Fixture B',
    englishName: 'Fixture language B',
    direction: 'ltr',
    gatewayLanguage: false,
  },
  en: { tag: 'en', title: 'English', englishName: 'English', direction: 'ltr', gatewayLanguage: true },
  hbo: {
    tag: 'hbo',
    title: 'עִבְרִית',
    englishName: 'Ancient Hebrew',
    direction: 'rtl',
    gatewayLanguage: false,
  },
  grc: {
    tag: 'el-x-koine',
    title: 'Κοινή',
    englishName: 'Koine Greek',
    direction: 'ltr',
    gatewayLanguage: false,
  },
  zxx: {
    tag: 'zxx',
    title: 'Images',
    englishName: 'No linguistic content',
    direction: 'ltr',
    gatewayLanguage: false,
  },
} as const satisfies Record<string, FixtureLanguage>;

const released = '2026-09-01T00:00:00Z';
const unfoldingWord = 'unfoldingWord';
const door43Catalog = 'Door43-Catalog';
const thirdPartyPublisher = 'Worldview';

const textFlavor = {
  usfmVersion: '3.0',
  translationType: 'revision',
  audience: 'common',
  projectType: 'standard',
} as const;

const storiesStatement: FixtureStatement = { statement: 'Copyright © 2023 by unfoldingWord', bare: true };

const catalogArticles: CatalogFlavor = { flavorType: 'peripheral', flavor: 'x-peripheralArticles' };

function bookScope(books: readonly Book[]): Scope {
  return Object.fromEntries(books.map((book) => [book.code, [String(book.chapter)]]));
}

function textIngredients(books: readonly Book[], resource: string, language: string): IngredientInput[] {
  return books.map((book) => ({
    path: usfmFileName(book),
    bytes: utf8(bookUsfm(book, resource, language)),
    mimeType: mimeTypes.usfm,
    scope: { [book.code]: [String(book.chapter)] },
  }));
}

function literalIngredients(): IngredientInput[] {
  return [
    ...textIngredients(literalBooks, 'ult', 'qaa'),
    {
      path: 'FRT.usfm',
      bytes: utf8(frontMatterUsfm('ult', 'qaa')),
      mimeType: mimeTypes.usfm,
    },
    {
      path: 'NEH.usfm',
      bytes: utf8(stubBookUsfm('NEH', 'Nehemiah', 'ult', 'qaa')),
      mimeType: mimeTypes.usfm,
      scope: { NEH: [] },
    },
  ];
}

function originalIngredients(books: readonly Book[], resource: string, language: string): IngredientInput[] {
  return books.map((book) => ({
    path: usfmFileName(book),
    bytes: utf8(originalUsfm(book, resource, language)),
    mimeType: mimeTypes.usfm,
    scope: { [book.code]: [String(book.chapter)] },
  }));
}

function helpsIngredients(tables: Readonly<Record<string, HelpsTable>>): IngredientInput[] {
  return Object.entries(tables).map(([book, table]) => ({
    path: `${book}.tsv`,
    bytes: utf8(tsv(table)),
    mimeType: mimeTypes.tsv,
    scope: { [book]: [] },
  }));
}

function wordsIngredients(): IngredientInput[] {
  return [...helpsIngredients(bookWordLinks), ...articleIngredients(wordArticles)];
}

function articleIngredients(files: readonly ArticleFile[]): IngredientInput[] {
  return files.map((file) => ({
    path: file.path,
    bytes: utf8(file.text),
    mimeType: mimeTypes[file.mimeType],
  }));
}

function storyIngredients(language: StoryLanguage): IngredientInput[] {
  return storiesFor(language).map((story) => ({
    path: storyFileName(story.number),
    bytes: utf8(storyMarkdown(story)),
    mimeType: mimeTypes.markdown,
  }));
}

const overriddenImage = { story: 1, frame: 1, variant: 101 } as const;

function imageOverride(): IngredientInput {
  return {
    path: `${storyImagesDirectory}${frameImageName(overriddenImage.story, overriddenImage.frame)}`,
    bytes: greyJpeg(overriddenImage.variant),
    mimeType: mimeTypes.jpeg,
  };
}

function imagePackIngredients(): IngredientInput[] {
  return storiesFor('en').flatMap((story) =>
    story.frames.map((_, index) => ({
      path: `${storyImagesDirectory}${frameImageName(story.number, index + 1)}`,
      bytes: greyJpeg(story.number * 10 + index + 1),
      mimeType: mimeTypes.jpeg,
    })),
  );
}

function formationIngredients(): IngredientInput[] {
  return formationSessions.flatMap((session) =>
    session.sections.map((formationSection) => ({
      path: `${String(session.story).padStart(2, '0')}/${formationSection.id}.md`,
      bytes: utf8(sectionMarkdown(formationSection)),
      mimeType: mimeTypes.markdown,
    })),
  );
}

function storyHelp(table: HelpsTable, scope?: Scope): IngredientInput[] {
  const bytes = utf8(tsv(table));
  return [
    scope === undefined
      ? { path: 'OBS.tsv', bytes, mimeType: mimeTypes.tsv }
      : { path: 'OBS.tsv', bytes, mimeType: mimeTypes.tsv, scope },
  ];
}

const storiesScope: Scope = { OBS: [] };

const audioFrames = 20;

function release(
  base: Omit<FixtureRelease, 'released' | 'books' | 'publisher'> & {
    readonly publisher?: string;
    readonly books?: readonly string[];
  },
): FixtureRelease {
  return { publisher: unfoldingWord, released, books: [], ...base };
}

const bookCodes = (books: readonly Book[]) => books.map((book) => book.code.toLowerCase());

export const fixtureReleases: readonly FixtureRelease[] = [
  release({
    resource: 'qaa_ult',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Aligned Bible',
    title: 'Fixture Literal Text',
    abbreviation: 'ULT',
    flavorType: 'scripture',
    flavor: 'textTranslation',
    flavorDetails: textFlavor,
    currentScope: { ...bookScope(literalBooks), NEH: [] },
    books: bookCodes(literalBooks),
    ingredients: literalIngredients(),
  }),
  release({
    resource: 'qaa_ust',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Aligned Bible',
    title: 'Fixture Simplified Text',
    abbreviation: 'UST',
    flavorType: 'scripture',
    flavor: 'textTranslation',
    flavorDetails: textFlavor,
    currentScope: bookScope(simplifiedBooks),
    books: bookCodes(simplifiedBooks),
    ingredients: textIngredients(simplifiedBooks, 'ust', 'qaa'),
  }),
  release({
    resource: 'qaa_t4t',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Bible',
    title: 'Fixture Translation for Translators',
    abbreviation: 'T4T',
    flavorType: 'scripture',
    flavor: 'textTranslation',
    flavorDetails: textFlavor,
    currentScope: bookScope(simplifiedBooks),
    books: bookCodes(simplifiedBooks),
    ingredients: textIngredients(simplifiedBooks, 't4t', 'qaa'),
  }),
  release({
    publisher: thirdPartyPublisher,
    resource: 'qaa_bsb',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Bible',
    title: 'Fixture Berean Standard Bible',
    abbreviation: 'BSB',
    flavorType: 'scripture',
    flavor: 'textTranslation',
    flavorDetails: textFlavor,
    currentScope: bookScope(simplifiedBooks),
    books: bookCodes(simplifiedBooks),
    ingredients: textIngredients(simplifiedBooks, 'bsb', 'qaa'),
  }),
  release({
    resource: 'qaa_tn',
    tag: 'v1',
    language: languages.qaa,
    subject: 'TSV Translation Notes',
    title: 'Fixture Translation Notes',
    abbreviation: 'TN',
    flavorType: 'parascriptural',
    flavor: 'x-bcvnotes',
    currentScope: bookScope(literalBooks),
    books: bookCodes(literalBooks),
    ingredients: helpsIngredients(bookNotes),
  }),
  release({
    resource: 'qaa_twl',
    tag: 'v1',
    language: languages.qaa,
    subject: 'TSV Translation Words Links',
    title: 'Fixture Translation Words Links',
    abbreviation: 'TW',
    flavorType: 'parascriptural',
    flavor: 'x-bcvarticles',
    currentScope: bookScope(literalBooks),
    books: bookCodes(literalBooks),
    ingredients: wordsIngredients(),
  }),
  release({
    resource: 'qaa_tq',
    tag: 'v1',
    language: languages.qaa,
    subject: 'TSV Translation Questions',
    title: 'Fixture Translation Questions',
    abbreviation: 'TQ',
    flavorType: 'parascriptural',
    flavor: 'x-bcvquestions',
    currentScope: bookScope(literalBooks),
    books: bookCodes(literalBooks),
    ingredients: helpsIngredients(bookQuestions),
  }),
  release({
    resource: 'qaa_tw',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Translation Words',
    title: 'Fixture Translation Words',
    abbreviation: 'TW',
    flavorType: 'parascriptural',
    flavor: 'x-bcvarticles',
    catalogFlavor: catalogArticles,
    currentScope: bookScope(literalBooks),
    books: bookCodes(literalBooks),
    ingredients: wordsIngredients(),
  }),
  release({
    resource: 'qaa_ta',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Translation Academy',
    title: 'Fixture Translation Academy',
    abbreviation: 'TA',
    flavorType: 'peripheral',
    flavor: 'x-peripheralArticles',
    ingredients: articleIngredients(academyArticles),
  }),
  release({
    resource: 'qaa_obs',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Open Bible Stories',
    title: 'Fixture Open Bible Stories',
    abbreviation: 'OBS',
    flavorType: 'gloss',
    flavor: 'textStories',
    statement: storiesStatement,
    ingredients: [...storyIngredients('qaa'), imageOverride()],
  }),
  release({
    publisher: door43Catalog,
    resource: 'qaa_obs',
    tag: 'v2',
    language: languages.qaa,
    subject: 'Open Bible Stories',
    title: 'Fixture Open Bible Stories (Door43 Catalog)',
    abbreviation: 'OBS',
    flavorType: 'gloss',
    flavor: 'textStories',
    statement: storiesStatement,
    ingredients: storyIngredients('qaa'),
  }),
  release({
    resource: 'qaa_obs-tn',
    tag: 'v1',
    language: languages.qaa,
    subject: 'TSV OBS Translation Notes',
    title: 'Fixture OBS Translation Notes',
    abbreviation: 'OBSTN',
    flavorType: 'peripheral',
    flavor: 'x-obsnotes',
    catalogFlavor: { flavorType: 'parascriptural', flavor: 'x-notes' },
    ingredients: storyHelp(storyNotes),
  }),
  release({
    resource: 'qaa_obs-sq',
    tag: 'v1',
    language: languages.qaa,
    subject: 'TSV OBS Study Questions',
    title: 'Fixture OBS Study Questions',
    abbreviation: 'OBSSQ',
    flavorType: 'peripheral',
    flavor: 'x-obsquestions',
    catalogFlavor: { flavorType: 'parascriptural', flavor: 'x-questions' },
    ingredients: storyHelp(storyQuestions('qaa')),
  }),
  release({
    resource: 'qaa_obs-twl',
    tag: 'v1',
    language: languages.qaa,
    subject: 'TSV OBS Translation Words Links',
    title: 'Fixture OBS Translation Words Links',
    abbreviation: 'OBSTWL',
    flavorType: 'parascriptural',
    flavor: 'x-bcvarticles',
    catalogFlavor: { flavorType: 'parascriptural', flavor: 'x-links' },
    statement: { statement: 'Copyright © 2021 by unfoldingWord', bare: true },
    currentScope: storiesScope,
    ingredients: storyHelp(storyWordLinks, storiesScope),
  }),
  release({
    resource: 'qaa_obs-tf',
    tag: 'v1',
    language: languages.qaa,
    subject: 'OBS Theological Formation',
    title: 'Fixture OBS Theological Formation',
    abbreviation: 'OBSTF',
    flavorType: provisionalFlavors.formation.flavorType,
    flavor: provisionalFlavors.formation.flavor,
    ingredients: formationIngredients(),
  }),
  release({
    resource: 'qaa_ult-audio',
    tag: 'v1',
    language: languages.qaa,
    subject: 'Bible Audio',
    title: 'Fixture Literal Text Audio',
    abbreviation: 'ult-audio',
    flavorType: provisionalFlavors.audio.flavorType,
    flavor: provisionalFlavors.audio.flavor,
    flavorDetails: { performance: ['singleVoice', 'reading'], formats: { format1: { compression: 'mp3' } } },
    currentScope: { RUT: ['1'] },
    books: ['rut'],
    ingredients: [
      {
        path: 'RUT/RUT_001.mp3',
        bytes: silentMp3(audioFrames),
        mimeType: mimeTypes.mp3,
        scope: { RUT: ['1'] },
      },
    ],
  }),
  release({
    resource: 'qab_obs',
    tag: 'v1',
    language: languages.qab,
    subject: 'Open Bible Stories',
    title: 'Fixture B Open Bible Stories',
    abbreviation: 'OBS',
    flavorType: 'gloss',
    flavor: 'textStories',
    statement: storiesStatement,
    ingredients: storyIngredients('qab'),
  }),
  release({
    resource: 'qab_obs-sq',
    tag: 'v1',
    language: languages.qab,
    subject: 'TSV OBS Study Questions',
    title: 'Fixture B OBS Study Questions',
    abbreviation: 'OBSSQ',
    flavorType: 'peripheral',
    flavor: 'x-obsquestions',
    catalogFlavor: { flavorType: 'parascriptural', flavor: 'x-questions' },
    ingredients: storyHelp(storyQuestions('qab')),
  }),
  release({
    resource: 'en_obs',
    tag: 'v9',
    language: languages.en,
    subject: 'Open Bible Stories',
    title: 'Open Bible Stories (fixture)',
    abbreviation: 'OBS',
    flavorType: 'gloss',
    flavor: 'textStories',
    statement: storiesStatement,
    ingredients: storyIngredients('en'),
  }),
  release({
    resource: 'en_obs-tf',
    tag: 'v4',
    language: languages.en,
    subject: 'OBS Theological Formation',
    title: 'OBS Theological Formation (fixture)',
    abbreviation: 'OBSTF',
    flavorType: provisionalFlavors.formation.flavorType,
    flavor: provisionalFlavors.formation.flavor,
    ingredients: formationIngredients(),
  }),
  release({
    resource: 'hbo_uhb',
    tag: 'v3.0.0',
    language: languages.hbo,
    subject: 'Hebrew Old Testament',
    title: 'Hebrew Bible (fixture)',
    abbreviation: 'UHB',
    flavorType: 'scripture',
    flavor: 'textTranslation',
    flavorDetails: textFlavor,
    currentScope: bookScope(hebrewBooks),
    books: bookCodes(hebrewBooks),
    ingredients: originalIngredients(hebrewBooks, 'uhb', 'hbo'),
  }),
  release({
    resource: 'el-x-koine_ugnt',
    tag: 'v0.34',
    language: languages.grc,
    subject: 'Greek New Testament',
    title: 'Greek New Testament (fixture)',
    abbreviation: 'UGNT',
    flavorType: 'scripture',
    flavor: 'textTranslation',
    flavorDetails: textFlavor,
    currentScope: bookScope(greekBooks),
    books: bookCodes(greekBooks),
    ingredients: originalIngredients(greekBooks, 'ugnt', 'el-x-koine'),
  }),
  release({
    resource: 'obs-images',
    tag: 'v1',
    language: languages.zxx,
    subject: 'OBS Images',
    title: 'Open Bible Stories Images (fixture)',
    abbreviation: 'obs-images',
    flavorType: provisionalFlavors.images.flavorType,
    flavor: provisionalFlavors.images.flavor,
    ingredients: imagePackIngredients(),
  }),
];
