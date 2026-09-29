import { compareText } from '../order';
import { bookByCode } from '../domain/books';
import { failureCodeOf } from '../domain/failures';
import { formatReference, type Reference } from '../domain/reference';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import { buildIndex, estimateIndex, searchIndex } from './fulltext';
import { analyze, type Analysis } from './ingest';
import { createLibrary, type Library } from './library';
import { academyOrder, audioClips, movementStories, stories } from './loaders';
import { assemblePassage } from './passage';
import { assembleArticle, assembleMovements, assembleStory } from './reading';
import { canonical, referenceQuery, titleHits } from './search';
import { describePack, openBurrito } from './source';
import {
  clearIndex,
  corpusTables,
  loadEntries,
  loadIndexes,
  loadTitles,
  removeRoot,
  saveEntry,
} from './tables';
import type {
  Article,
  Contents,
  CorpusKind,
  CorpusSource,
  CorpusSummary,
  FullTextHit,
  IndexCost,
  IndexStatus,
  KindSummary,
  Movements,
  Passage,
  PassageOptions,
  SearchResults,
  Story,
} from './types';

export type CorpusApi = {
  describe(pack: string): Promise<CorpusSource>;
  ingest(source: CorpusSource): Promise<void>;
  drop(pack: string): Promise<void>;
  languages(): readonly string[];
  summary(language: string): CorpusSummary;
  contents(language: string): Promise<Contents>;
  passage(reference: Reference, options: PassageOptions): Promise<Passage | undefined>;
  article(id: string, language: string): Promise<Article | undefined>;
  story(number: number, language: string): Promise<Story | undefined>;
  movements(story: number, language: string): Promise<Movements | undefined>;
  movementStories(language: string): Promise<readonly number[]>;
  search(query: string, language: string): Promise<SearchResults>;
  index(language: string): IndexStatus;
  indexCost(language: string): Promise<IndexCost>;
  reindex(language: string): Promise<IndexStatus>;
  fullText(query: string, language: string): Promise<FullTextHit[]>;
};

const kindOrder: readonly CorpusKind[] = [
  'literal',
  'simplified',
  'original',
  'notes',
  'wordLinks',
  'questions',
  'words',
  'academy',
  'stories',
  'storyNotes',
  'storyQuestions',
  'storyWordLinks',
  'movements',
  'audio',
  'images',
];

function summarize(library: Library, language: string): CorpusSummary {
  const summary: Partial<Record<CorpusKind, KindSummary>> = {};
  for (const kind of kindOrder) {
    const entries = library.of(language, [kind]);
    if (entries.length > 0) {
      summary[kind] = {
        burritos: entries.length,
        items: entries.reduce((sum, entry) => sum + entry.items, 0),
        publishers: [...new Set(entries.map((entry) => entry.provenance.publisher))],
      };
    }
  }
  return summary;
}

function contentLanguages(library: Library): string[] {
  return [
    ...new Set(
      library
        .all()
        .filter((entry) => entry.kind !== 'images')
        .map((entry) => entry.language),
    ),
  ].sort();
}

function chaptersInScope(code: string, scoped: readonly string[]): number[] {
  const listed = scoped.map(Number).filter((chapter) => Number.isInteger(chapter) && chapter > 0);
  if (listed.length > 0) {
    return listed;
  }
  return Array.from({ length: bookByCode(code)?.chapters ?? 0 }, (_, index) => index + 1);
}

async function contentsOf(library: Library, language: string): Promise<Contents> {
  const texts = [];
  for (const entry of library.of(language, ['literal', 'simplified', 'original'])) {
    const reader = await library.reader(entry);
    const scope = reader.metadata.type.flavorType.currentScope ?? {};
    texts.push({
      reading: entry.kind === 'simplified' || entry.kind === 'original' ? entry.kind : ('literal' as const),
      books: entry.books.map((code) => ({
        code,
        chapters: chaptersInScope(code, scope[code] ?? []),
      })),
      provenance: entry.provenance,
    });
  }
  const titles = library.titles(language);
  const articleEntries = (kind: 'word' | 'academy') =>
    titles.filter((row) => row.kind === kind).map((row) => ({ id: row.target, title: row.title }));
  const [academy] = library.of(language, ['academy']);
  const order = academy === undefined ? [] : await academyOrder(library, academy);
  const [storyEntry] = library.of(language, ['stories']);
  const storyList = storyEntry === undefined ? [] : [...(await stories(library, storyEntry)).values()];
  const [movementEntry] = library.of(language, ['movements']);
  const audio = [];
  for (const entry of library.of(language, ['audio'])) {
    audio.push(
      ...(await audioClips(library, entry)).map((clip) => ({ book: clip.book, chapter: clip.chapter })),
    );
  }
  return {
    language,
    texts,
    words: articleEntries('word').sort((left, right) => compareText(left.id, right.id)),
    academy: articleEntries('academy').sort(
      (left, right) => order.indexOf(left.id) - order.indexOf(right.id),
    ),
    stories: storyList.map((story) => ({ number: story.number, title: story.title })),
    movements: movementEntry === undefined ? [] : await movementStories(library, movementEntry),
    audio,
  };
}

function unreadable(root: string): Error {
  return Object.assign(new Error(`${root} is not a readable burrito with a licence`), {
    code: 'corpus.unreadable' as const,
  });
}

export const corpusModule = defineModule<CorpusApi>({
  events: ['PassageOpened', 'ArticleOpened', 'StoryOpened', 'SearchRun', 'IndexStarted', 'IndexBuilt'],
  owns: { tables: corpusTables, directories: [], keys: [] },
  create(context) {
    const { files, db } = context.ports;
    const library = createLibrary(files);
    let work: Promise<unknown> = Promise.resolve();

    const serial = <T>(task: () => Promise<T>): Promise<T> => {
      const result = work.then(task, task);
      work = result.catch(() => undefined);
      return result;
    };

    const settled = (): Promise<unknown> => work;

    const forgetIndex = async (languages: readonly string[]): Promise<void> => {
      for (const language of new Set(languages)) {
        if (library.index(language).built) {
          await db.transaction((session) => clearIndex(session, language));
          library.setIndex({ language, built: false });
        }
      }
    };

    const dropPack = async (pack: string): Promise<void> => {
      const entries = library.all().filter((entry) => entry.pack === pack);
      await db.transaction(async (session) => {
        for (const entry of entries) {
          await removeRoot(session, entry.root);
        }
      });
      library.remove(entries.map((entry) => entry.root));
      await forgetIndex(entries.map((entry) => entry.language));
    };

    const ingest = (source: CorpusSource): Promise<void> =>
      serial(async () => {
        try {
          const analyses: Analysis[] = [];
          for (const burrito of source.burritos) {
            const reader = await openBurrito(files, burrito.root);
            const analysis = reader === undefined ? undefined : await analyze(source.pack, burrito, reader);
            if (analysis === undefined) {
              throw unreadable(burrito.root);
            }
            analyses.push(analysis);
          }
          await dropPack(source.pack);
          await db.transaction(async (session) => {
            for (const analysis of analyses) {
              await saveEntry(session, analysis.entry, analysis.titles);
            }
          });
          library.put(
            analyses.map((analysis) => analysis.entry),
            analyses.flatMap((analysis) => analysis.titles),
          );
          await forgetIndex(analyses.map((analysis) => analysis.entry.language));
        } catch (error) {
          const code = failureCodeOf(error);
          await context.emit({
            type: 'Failure',
            payload: {
              code: code === 'unexpected' ? 'corpus.unreadable' : code,
              context: { pack: source.pack },
            },
          });
        }
      });

    const reindex = (language: string): Promise<IndexStatus> =>
      serial(async () => {
        await context.emit({ type: 'IndexStarted', payload: { language } });
        const row = await buildIndex(library, db, language);
        library.setIndex(row);
        await context.emit({
          type: 'IndexBuilt',
          payload: { language, entries: row.entries, bytes: row.bytes },
        });
        return library.index(language);
      });

    const api: CorpusApi = {
      describe: (pack) => describePack(files, pack),
      ingest,
      drop: (pack) => serial(() => dropPack(pack)),
      languages: () => contentLanguages(library),
      summary: (language) => summarize(library, language),
      contents: async (language) => {
        await settled();
        return contentsOf(library, language);
      },
      passage: async (reference, options) => {
        await settled();
        const passage = await assemblePassage(library, reference, options);
        if (passage !== undefined) {
          await context.emit({
            type: 'PassageOpened',
            payload: { reference: formatReference(reference), language: options.language },
          });
        }
        return passage;
      },
      article: async (id, language) => {
        await settled();
        const article = await assembleArticle(library, id, language);
        if (article !== undefined) {
          await context.emit({ type: 'ArticleOpened', payload: { article: id, language } });
        }
        return article;
      },
      story: async (number, language) => {
        await settled();
        const story = await assembleStory(library, number, language);
        if (story !== undefined) {
          await context.emit({ type: 'StoryOpened', payload: { story: number, language } });
        }
        return story;
      },
      movements: async (story, language) => {
        await settled();
        return assembleMovements(library, story, language);
      },
      movementStories: async (language) => {
        await settled();
        const [entry] = library.of(language, ['movements']);
        return entry === undefined ? [] : movementStories(library, entry);
      },
      search: async (query, language) => {
        await settled();
        const reference = referenceQuery(query);
        if (reference !== undefined) {
          const available = (await assemblePassage(library, reference, { language })) !== undefined;
          await context.emit({
            type: 'SearchRun',
            payload: { kind: 'reference', language, hits: available ? 1 : 0 },
          });
          return { reference: { reference: canonical(reference), available }, titles: [] };
        }
        const titles = titleHits(library, query, language);
        await context.emit({ type: 'SearchRun', payload: { kind: 'title', language, hits: titles.length } });
        return { titles };
      },
      index: (language) => library.index(language),
      indexCost: async (language) => {
        await settled();
        return estimateIndex(library, language);
      },
      reindex,
      fullText: async (query, language) => {
        await settled();
        const hits = await searchIndex(library, db, query, language);
        await context.emit({ type: 'SearchRun', payload: { kind: 'fulltext', language, hits: hits.length } });
        return hits;
      },
    };

    return {
      api,
      async start() {
        const entries = await loadEntries(db);
        library.put(entries, await loadTitles(db));
        for (const row of await loadIndexes(db)) {
          library.setIndex(row);
        }
      },
      snapshot(): JsonValue {
        const languages = Object.fromEntries(
          contentLanguages(library).map((language) => [language, summarize(library, language)]),
        );
        const indexes = Object.fromEntries(
          library.indexes().map((row) => [row.language, { entries: row.entries, bytes: row.bytes }]),
        );
        return { languages, indexes } as JsonValue;
      },
      redo: {
        IndexStarted: async (event) => {
          await reindex(event.payload.language);
        },
      },
    };
  },
});
