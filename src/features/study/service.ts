import type { Bookmark, BookmarkTarget } from '@lib/bookmarks/types';
import type {
  Article,
  AudioClip,
  Frame,
  FullTextHit,
  LinkTarget,
  Passage,
  Reading,
  SearchResults,
  Story,
  TextChoice,
} from '@lib/corpus/types';
import { bookByCode, type Testament } from '@lib/domain/books';
import { imagePackId, languagePackId, type PackId } from '@lib/domain/pack';
import { formatReference, parseReference, type Reference } from '@lib/domain/reference';
import type { Kernel } from '@lib/kernel';
import type { CatalogInstallOptions, InstallOutcome } from '@lib/packs/types';
import { clipControls, clockTime, type ClipControls, type PlayerStatus } from '@lib/player/types';
import type { Written } from '@lib/written';
import { isStoryAudio } from '@lib/catalog/types';
import { libraryCards, type LibraryCard } from './library';
import { studyWords, type StudyWords } from './strings';

export type {
  Article,
  AudioClip,
  Block,
  FullTextHit,
  Inline,
  Introduction,
  LinkTarget,
  Note,
  Passage,
  Question,
  TitleHit,
  Verse,
  WordLink,
  WordSpan,
} from '@lib/corpus/types';
export type { LibraryCard } from './library';
export type { ClipControls, PlayerStatus } from '@lib/player/types';
export { skipMs } from '@lib/player/types';

export type BookEntry = {
  readonly code: string;
  readonly name: string;
  readonly testament: Testament;
  readonly chapters: readonly number[];
};

export type OriginalChoice = { readonly language: string; readonly label: string };

export type OriginalOpening = OriginalChoice & { readonly reference: string };

const originalLanguages: Readonly<Record<Testament, string>> = { old: 'hbo', new: 'el-x-koine' };

const testaments: readonly Testament[] = ['old', 'new'];

export type TextChoiceView = {
  readonly text: Reading;
  readonly label: string;
  readonly selected: boolean;
};

export type VersePlace = { readonly chapter: number; readonly verse: number };

export type HelpsInstalled = {
  readonly notes: boolean;
  readonly wordLinks: boolean;
  readonly questions: boolean;
};

export type PassageRequest = { readonly original?: boolean };

export type AudioView =
  | { readonly state: 'on-phone'; readonly clip: AudioClip; readonly label: string }
  | {
      readonly state: 'not-downloaded';
      readonly pack: PackId;
      readonly online: boolean;
      readonly label: string;
      readonly detail: string;
    }
  | { readonly state: 'downloading'; readonly pack: PackId; readonly label: string }
  | { readonly state: 'no-chapter'; readonly label: string; readonly detail: string }
  | { readonly state: 'none' };

export type PassageView = {
  readonly reference: string;
  readonly label: string;
  readonly language: string;
  readonly passage: Passage;
  readonly landing: VersePlace | undefined;
  readonly original: Passage | undefined;
  readonly reading: Reading;
  readonly choices: readonly TextChoiceView[];
  readonly audio: AudioView;
  readonly saved: Bookmark | undefined;
  readonly helps: HelpsInstalled;
};

export type StudyView =
  | { readonly state: 'no-language' }
  | { readonly state: 'not-downloaded'; readonly language: string; readonly pack: PackId }
  | { readonly state: 'no-text'; readonly language: string; readonly originals: readonly OriginalOpening[] }
  | { readonly state: 'invalid-reference'; readonly language: string }
  | { readonly state: 'missing'; readonly language: string; readonly reference: string }
  | {
      readonly state: 'original';
      readonly language: string;
      readonly reference: string;
      readonly passage: Passage;
      readonly choice: OriginalChoice;
    }
  | { readonly state: 'passage'; readonly view: PassageView };

export type RelatedArticle = { readonly id: string; readonly title: string };

export type ArticleView =
  | {
      readonly state: 'article';
      readonly article: Article;
      readonly related: readonly RelatedArticle[];
      readonly saved: Bookmark | undefined;
    }
  | { readonly state: 'missing'; readonly id: string }
  | { readonly state: 'no-language' };

export type StoryView =
  | { readonly state: 'story'; readonly story: Story; readonly saved: Bookmark | undefined }
  | { readonly state: 'missing'; readonly number: number }
  | { readonly state: 'no-language' };

export type LibraryView = {
  readonly language: string | undefined;
  readonly overline: string;
  readonly cards: readonly LibraryCard[];
  readonly footer: string;
};

export type SearchView =
  | { readonly state: 'no-language' }
  | { readonly state: 'results'; readonly results: SearchResults; readonly fullText: boolean };

export type StudyService = {
  words(): StudyWords;
  language(): string | undefined;
  languageName(): string | undefined;
  referenceName(reference: string): string;
  label(target: LinkTarget): string | undefined;
  open(request?: PassageRequest): Promise<StudyView>;
  opened(reference: string): Promise<void>;
  passage(reference: string, request?: PassageRequest): Promise<StudyView>;
  reading(): TextChoice;
  setReading(text: TextChoice): Promise<boolean>;
  library(): Promise<LibraryView>;
  download(pack: PackId, options?: CatalogInstallOptions): Promise<InstallOutcome>;
  article(id: string): Promise<ArticleView>;
  story(number: number): Promise<StoryView>;
  books(language?: string): Promise<readonly BookEntry[]>;
  originalOf(book: string): OriginalChoice | undefined;
  original(reference: string): Promise<Passage | undefined>;
  search(query: string): Promise<SearchView>;
  fullText(query: string): Promise<readonly FullTextHit[]>;
  saved(target: BookmarkTarget): Bookmark | undefined;
  save(target: BookmarkTarget): Promise<Written<Bookmark> | undefined>;
  unsave(id: string): Promise<Written<true> | undefined>;
  picture(frame: Frame): string | undefined;
  listen(clip: Pick<AudioClip, 'path'>): ClipControls;
  audioTime(status: PlayerStatus): string;
};

function autonymOf(kernel: Kernel, language: string): string {
  return kernel.catalog.languages().find((item) => item.language === language)?.autonym ?? language;
}

function chapterAround(reference: Reference): Reference {
  return { book: reference.book, start: { chapter: reference.start.chapter } };
}

function landingOf(reference: Reference): VersePlace | undefined {
  const { chapter, verse } = reference.start;
  return verse === undefined ? undefined : { chapter, verse };
}

export function createStudyService(kernel: Kernel): StudyService {
  const { preferences, corpus, bookmarks } = kernel;
  const words = (): StudyWords => studyWords(kernel);
  const reading = (): TextChoice => preferences.get('study.reading') ?? 'literal';

  const audioOf = async (passage: Passage): Promise<AudioView> => {
    const current = words();
    const label = current.t('study.audio.label', {
      reference: corpus.referenceName(passage.reference, passage.language),
    });
    const [clip] = passage.audio;
    if (clip !== undefined) {
      return { state: 'on-phone', clip, label };
    }
    const release = kernel.catalog
      .releases(passage.language)
      .find((item) => item.kind === 'audio' && item.pack !== undefined && !isStoryAudio(item));
    if (release?.pack === undefined) {
      return { state: 'none' };
    }
    if (kernel.packs.installed().some((pack) => pack.pack === release.pack)) {
      return { state: 'no-chapter', label, detail: current.t('study.audio.noChapter') };
    }
    if (kernel.packs.installing().some((progress) => progress.pack === release.pack)) {
      return { state: 'downloading', pack: release.pack, label: current.t('study.audio.downloading') };
    }
    return {
      state: 'not-downloaded',
      pack: release.pack,
      online: await kernel.catalog.online(),
      label: current.t('study.audio.download'),
      detail: current.t('study.audio.offline'),
    };
  };

  const notDownloaded = (language: string): StudyView => ({
    state: 'not-downloaded',
    language,
    pack: languagePackId(language),
  });

  const originalOf = (code: string): OriginalChoice | undefined => {
    const book = bookByCode(code);
    if (book === undefined) {
      return undefined;
    }
    const language = originalLanguages[book.testament];
    if (!corpus.languages().includes(language)) {
      return undefined;
    }
    return {
      language,
      label: words().t(book.testament === 'old' ? 'resource.hebrew' : 'resource.greek'),
    };
  };

  const originalOpenings = async (): Promise<OriginalOpening[]> => {
    const openings: OriginalOpening[] = [];
    for (const testament of testaments) {
      const language = originalLanguages[testament];
      if (!corpus.languages().includes(language)) {
        continue;
      }
      const [text] = (await corpus.contents(language)).texts;
      const [book] = text?.books ?? [];
      const [chapter] = book?.chapters ?? [];
      if (book !== undefined && chapter !== undefined) {
        openings.push({
          language,
          label: words().t(testament === 'old' ? 'resource.hebrew' : 'resource.greek'),
          reference: formatReference({ book: book.code, start: { chapter } }),
        });
      }
    }
    return openings;
  };

  const helpsInstalled = (language: string): HelpsInstalled => {
    const summary = corpus.summary(language);
    return {
      notes: summary.notes !== undefined,
      wordLinks: summary.wordLinks !== undefined,
      questions: summary.questions !== undefined,
    };
  };

  const choicesOf = (
    found: Passage,
    original: OriginalChoice | undefined,
    shown: Reading,
  ): readonly TextChoiceView[] => {
    const current = words();
    const choices: TextChoiceView[] = found.availableTexts.map((choice) => ({
      text: choice,
      label: current.t(choice === 'literal' ? 'study.text.literal' : 'study.text.simplified'),
      selected: choice === shown,
    }));
    if (original !== undefined) {
      choices.push({ text: 'original', label: original.label, selected: shown === 'original' });
    }
    return choices.length < 2 ? [] : choices;
  };

  const passage = async (text: string, request: PassageRequest = {}): Promise<StudyView> => {
    const language = preferences.contentLanguage();
    if (language === undefined) {
      return { state: 'no-language' };
    }
    const parsed = parseReference(text);
    if (!parsed.ok) {
      return { state: 'invalid-reference', language };
    }
    const reference = formatReference(parsed.reference);
    const chapter = chapterAround(parsed.reference);
    const found = await corpus.passage(chapter, { language, text: reading(), journal: false });
    const original = originalOf(parsed.reference.book);
    const originalPassage =
      request.original === true && original !== undefined
        ? await corpus.passage(chapter, { language: original.language, text: 'original', journal: false })
        : undefined;
    if (found === undefined) {
      if (originalPassage !== undefined && original !== undefined) {
        return { state: 'original', language, reference, passage: originalPassage, choice: original };
      }
      return corpus.languages().includes(language)
        ? { state: 'missing', language, reference }
        : notDownloaded(language);
    }
    await corpus.opened(parsed.reference, language);
    const shown: Reading = originalPassage === undefined ? found.text.reading : 'original';
    return {
      state: 'passage',
      view: {
        reference,
        label: corpus.referenceName(reference, language),
        language,
        passage: found,
        landing: landingOf(parsed.reference),
        original: originalPassage,
        reading: shown,
        choices: choicesOf(found, original, shown),
        audio: await audioOf(found),
        saved: bookmarks.find({ target: 'passage', reference, language }),
        helps: helpsInstalled(language),
      },
    };
  };

  const referenceName = (reference: string): string => {
    const language = preferences.contentLanguage();
    return language === undefined ? reference : corpus.referenceName(reference, language);
  };

  return {
    words,
    language: () => preferences.contentLanguage(),
    languageName: () => {
      const language = preferences.contentLanguage();
      return language === undefined ? undefined : autonymOf(kernel, language);
    },
    referenceName,
    label: (target) => {
      if (target.kind === 'passage') {
        return referenceName(target.reference);
      }
      const language = preferences.contentLanguage();
      return language === undefined ? undefined : corpus.title(target, language);
    },
    async open(request = {}) {
      const language = preferences.contentLanguage();
      if (language === undefined) {
        return { state: 'no-language' };
      }
      const last = preferences.lastPassage(language);
      if (last !== undefined) {
        return passage(last, request);
      }
      const contents = await corpus.contents(language);
      const [text] = contents.texts;
      const [book] = text?.books ?? [];
      const [chapter] = book?.chapters ?? [];
      if (book === undefined || chapter === undefined) {
        return corpus.languages().includes(language)
          ? { state: 'no-text', language, originals: await originalOpenings() }
          : notDownloaded(language);
      }
      return passage(formatReference({ book: book.code, start: { chapter } }), request);
    },
    passage,
    async opened(text) {
      const language = preferences.contentLanguage();
      const parsed = parseReference(text);
      if (language !== undefined && parsed.ok) {
        await corpus.opened(parsed.reference, language);
      }
    },
    reading,
    setReading: (text) => preferences.set('study.reading', text),
    async library() {
      const language = preferences.contentLanguage();
      const current = words();
      const releases =
        language === undefined
          ? []
          : [
              ...kernel.catalog.releases(language),
              ...kernel.catalog.all().filter((release) => release.pack === imagePackId),
              ...kernel.catalog.originals(),
            ];
      const cards =
        language === undefined
          ? []
          : libraryCards(current, {
              language,
              releases,
              installed: kernel.packs.installed(),
              installing: kernel.packs.installing(),
              summary: (code) => corpus.summary(code),
            });
      return {
        language,
        overline:
          language === undefined
            ? ''
            : current.plural('library.overline', cards.length, { language: autonymOf(kernel, language) }),
        cards,
        footer: current.t('library.footer'),
      };
    },
    download: (pack, options) => kernel.packs.installFromCatalog(pack, options),
    async article(id) {
      const language = preferences.contentLanguage();
      if (language === undefined) {
        return { state: 'no-language' };
      }
      const article = await corpus.article(id, language);
      return article === undefined
        ? { state: 'missing', id }
        : {
            state: 'article',
            article,
            related: article.related.map((related) => ({
              id: related,
              title:
                corpus.title({ kind: 'article', id: related }, language) ??
                related.split('/').at(-1) ??
                related,
            })),
            saved: bookmarks.find({ target: 'article', article: id, language }),
          };
    },
    async story(number) {
      const language = preferences.contentLanguage();
      if (language === undefined) {
        return { state: 'no-language' };
      }
      const story = await corpus.story(number, language);
      return story === undefined
        ? { state: 'missing', number }
        : { state: 'story', story, saved: bookmarks.find({ target: 'story', story: number, language }) };
    },
    async books(of) {
      const language = of ?? preferences.contentLanguage();
      if (language === undefined) {
        return [];
      }
      const chapters = new Map<string, Set<number>>();
      for (const text of (await corpus.contents(language)).texts) {
        for (const book of text.books) {
          const known = chapters.get(book.code) ?? new Set<number>();
          book.chapters.forEach((chapter) => known.add(chapter));
          chapters.set(book.code, known);
        }
      }
      return [...chapters]
        .flatMap(([code, found]) => {
          const book = bookByCode(code);
          return book === undefined ? [] : [{ book, found }];
        })
        .sort((left, right) => left.book.order - right.book.order)
        .map(({ book, found }) => ({
          code: book.code,
          name: corpus.bookName(book.code, language),
          testament: book.testament,
          chapters: [...found].sort((left, right) => left - right),
        }));
    },
    originalOf,
    async original(text) {
      const parsed = parseReference(text);
      if (!parsed.ok) {
        return undefined;
      }
      const book = bookByCode(parsed.reference.book);
      if (book === undefined) {
        return undefined;
      }
      return corpus.passage(parsed.reference, {
        language: originalLanguages[book.testament],
        text: 'original',
      });
    },
    async search(query) {
      const language = preferences.contentLanguage();
      if (language === undefined) {
        return { state: 'no-language' };
      }
      return {
        state: 'results',
        results: await corpus.search(query, language),
        fullText: corpus.index(language).built,
      };
    },
    async fullText(query) {
      const language = preferences.contentLanguage();
      return language === undefined || !corpus.index(language).built ? [] : corpus.fullText(query, language);
    },
    saved: (target) => bookmarks.find(target),
    save: (target) => bookmarks.add(target),
    unsave: (id) => bookmarks.remove(id),
    picture: (frame) => (frame.image === undefined ? undefined : kernel.media.uriOf(frame.image.path)),
    listen: (clip) => clipControls(kernel.player, { kind: 'file', path: clip.path }),
    audioTime: (status) =>
      words().t('study.audio.time', {
        position: clockTime('positionMs' in status ? status.positionMs : 0),
        duration: clockTime('durationMs' in status ? status.durationMs : 0),
      }),
  };
}
