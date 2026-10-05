import { failureCodeOf } from '../domain/failures';
import { bookByCode } from '../domain/books';
import { formatReference, parseReference, type Reference } from '../domain/reference';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import { estimateIndex, indexedKinds, searchIndex } from './fulltext';
import { createIndexing } from './indexing';
import { notesAttachment } from './attachment';
import { analyze, type Analysis } from './ingest';
import { createLibrary, type Library } from './library';
import { contentsOf } from './contents';
import { movementStories } from './loaders';
import { assemblePassage } from './passage';
import { assembleArticle, assembleMovements, assembleStory } from './reading';
import { canonical, referenceQuery, titleHits } from './search';
import { openBurrito } from './source';
import { readInstalledPacks } from '../packs/store';
import type { InstalledPack } from '../packs/types';
import { corpusTables, loadEntries, loadTitles, removeRoot, saveEntry, type Entry } from './tables';
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
  LinkTarget,
  Movements,
  NotesAttachment,
  Passage,
  PassageOptions,
  SearchResults,
  Story,
} from './types';

export type CorpusApi = {
  languages(): readonly string[];
  summary(language: string): CorpusSummary;
  bookName(book: string, language: string): string;
  referenceName(reference: string, language: string): string;
  title(target: LinkTarget, language: string): string | undefined;
  contents(language: string): Promise<Contents>;
  passage(reference: Reference, options: PassageOptions): Promise<Passage | undefined>;
  opened(reference: Reference, language: string): Promise<void>;
  article(id: string, language: string): Promise<Article | undefined>;
  story(number: number, language: string): Promise<Story | undefined>;
  movements(story: number, language: string): Promise<Movements | undefined>;
  movementStories(language: string): Promise<readonly number[]>;
  search(query: string, language: string): Promise<SearchResults>;
  index(language: string): IndexStatus;
  indexWanted(language: string): boolean;
  indexCost(language: string): Promise<IndexCost>;
  reindex(language: string): Promise<IndexStatus>;
  dropIndex(language: string): Promise<void>;
  fullText(query: string, language: string): Promise<FullTextHit[]>;
  attachment(language: string, books?: readonly string[]): Promise<readonly NotesAttachment[]>;
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

const namedKinds: readonly CorpusKind[] = ['literal', 'simplified', 'original'];

function bookNameIn(library: Library, book: string, language: string): string {
  const named = library
    .of(language, namedKinds)
    .map((entry) => entry.bookNames[book])
    .find((name) => name !== undefined);
  return named ?? bookByCode(book)?.name ?? book;
}

function referenceNameIn(library: Library, text: string, language: string): string {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    return text;
  }
  const { book } = parsed.reference;
  return `${bookNameIn(library, book, language)}${formatReference(parsed.reference).slice(book.length)}`;
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

function sourceOf(pack: InstalledPack): CorpusSource {
  return {
    pack: pack.pack,
    burritos: pack.burritos.map((burrito) => ({
      root: burrito.root,
      row: burrito.row,
      publisher: burrito.provenance.publisher,
      resource: burrito.provenance.resource,
      language: burrito.provenance.language,
      tag: burrito.provenance.tag,
      commit: burrito.provenance.commit,
      bytes: burrito.bytes,
    })),
  };
}

function unreadable(root: string): Error {
  return Object.assign(new Error(`${root} is not a readable burrito with a licence`), {
    code: 'corpus.unreadable' as const,
  });
}

export const corpusModule = defineModule<CorpusApi>({
  events: [
    'PassageOpened',
    'ArticleOpened',
    'StoryOpened',
    'SearchRun',
    'IndexStarted',
    'IndexBuilt',
    'IndexDropped',
  ],
  owns: { tables: corpusTables, directories: [], keys: [] },
  create(context) {
    const { files, db } = context.ports;
    const library = createLibrary(files);
    const indexing = createIndexing({ library, db, emit: context.emit });
    const reading = new Set<Promise<unknown>>();
    let work: Promise<unknown> = Promise.resolve();

    const serial = <T>(task: () => Promise<T>): Promise<T> => {
      const result = work.then(task, task);
      work = result.catch(() => undefined);
      return result;
    };

    const read = <T>(task: () => Promise<T>): Promise<T> => {
      const running = task();
      const tracked = running.then(
        () => undefined,
        () => undefined,
      );
      reading.add(tracked);
      void tracked.then(() => reading.delete(tracked));
      return running;
    };

    const readsSettled = async (): Promise<void> => {
      await Promise.all([...reading]);
    };

    const entriesOf = (pack: string): readonly Entry[] =>
      library.all().filter((entry) => entry.pack === pack);

    const indexedLanguages = (entries: readonly Entry[]): string[] =>
      entries.filter((entry) => indexedKinds.includes(entry.kind)).map((entry) => entry.language);

    const dropPack = async (pack: string): Promise<void> => {
      const entries = entriesOf(pack);
      await readsSettled();
      await db.transaction(async (transaction) => {
        for (const entry of entries) {
          await removeRoot(transaction, entry.root);
        }
      });
      library.remove(entries.map((entry) => entry.root));
      await readsSettled();
      await indexing.refresh(indexedLanguages(entries));
    };

    const analyses = async (source: CorpusSource, known: ReadonlySet<string>): Promise<Analysis[]> => {
      const found: Analysis[] = [];
      for (const burrito of source.burritos.filter((item) => !known.has(item.root))) {
        const reader = await openBurrito(files, burrito.root);
        const analysis = reader === undefined ? undefined : await analyze(source.pack, burrito, reader);
        if (analysis === undefined) {
          throw unreadable(burrito.root);
        }
        found.push(analysis);
      }
      return found;
    };

    const replacePack = async (source: CorpusSource): Promise<void> => {
      const previous = entriesOf(source.pack);
      const wanted = new Set(source.burritos.map((burrito) => burrito.root));
      const known = new Set(previous.map((entry) => entry.root).filter((root) => wanted.has(root)));
      const found = await analyses(source, known);
      const gone = previous.filter((entry) => !wanted.has(entry.root));
      await readsSettled();
      await db.transaction(async (transaction) => {
        for (const entry of gone) {
          await removeRoot(transaction, entry.root);
        }
        for (const analysis of found) {
          await saveEntry(transaction, analysis.entry, analysis.titles);
        }
      });
      library.remove(gone.map((entry) => entry.root));
      library.put(
        found.map((analysis) => analysis.entry),
        found.flatMap((analysis) => analysis.titles),
      );
      await readsSettled();
      await indexing.refresh(indexedLanguages([...gone, ...found.map((analysis) => analysis.entry)]));
    };

    const ingestNow = async (source: CorpusSource): Promise<void> => {
      try {
        await replacePack(source);
      } catch (error) {
        const code = failureCodeOf(error);
        await context.emit({
          type: 'Failure',
          payload: {
            code: code === 'unexpected' ? 'corpus.unreadable' : code,
            context: { pack: source.pack },
          },
        });
        try {
          await dropPack(source.pack);
        } catch {
          return;
        }
      }
    };

    const ingest = (source: CorpusSource): Promise<void> => serial(() => ingestNow(source));

    const reconcile = async (): Promise<void> => {
      let installed: readonly InstalledPack[];
      try {
        installed = await readInstalledPacks(db);
      } catch {
        return;
      }
      const present = new Set(installed.map((pack) => pack.pack));
      for (const pack of new Set(library.all().map((entry) => entry.pack))) {
        if (!present.has(pack)) {
          await dropPack(pack);
        }
      }
      for (const pack of installed) {
        const roots = new Set(entriesOf(pack.pack).map((entry) => entry.root));
        const same =
          roots.size === pack.burritos.length && pack.burritos.every((burrito) => roots.has(burrito.root));
        if (!same) {
          await ingestNow(sourceOf(pack));
        }
      }
    };

    const opened = async (reference: Reference, language: string): Promise<void> => {
      await context.emit({
        type: 'PassageOpened',
        payload: { reference: formatReference(reference), language },
      });
    };

    const api: CorpusApi = {
      languages: () => contentLanguages(library),
      summary: (language) => summarize(library, language),
      bookName: (book, language) => bookNameIn(library, book, language),
      referenceName: (reference, language) => referenceNameIn(library, reference, language),
      title: (target, language) => library.titleOf(language, target),
      contents: (language) => read(() => contentsOf(library, language)),
      passage: (reference, options) =>
        read(async () => {
          const passage = await assemblePassage(library, reference, options);
          if (passage !== undefined && options.journal !== false) {
            await opened(reference, options.language);
          }
          return passage;
        }),
      opened,
      article: (id, language) =>
        read(async () => {
          const article = await assembleArticle(library, id, language);
          if (article !== undefined) {
            await context.emit({ type: 'ArticleOpened', payload: { article: id, language } });
          }
          return article;
        }),
      story: (number, language) =>
        read(async () => {
          const story = await assembleStory(library, number, language);
          if (story !== undefined) {
            await context.emit({ type: 'StoryOpened', payload: { story: number, language } });
          }
          return story;
        }),
      movements: (story, language) => read(() => assembleMovements(library, story, language)),
      movementStories: (language) =>
        read(async () => {
          const [entry] = library.of(language, ['movements']);
          return entry === undefined ? [] : movementStories(library, entry);
        }),
      search: (query, language) =>
        read(async () => {
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
          await context.emit({
            type: 'SearchRun',
            payload: { kind: 'title', language, hits: titles.length },
          });
          return { titles };
        }),
      index: (language) => library.index(language),
      indexWanted: (language) => indexing.wanted(language),
      indexCost: async (language) => estimateIndex(library, language),
      reindex: (language) => indexing.reindex(language),
      dropIndex: (language) => indexing.drop(language),
      fullText: (query, language) =>
        read(async () => {
          const hits = await searchIndex(library, db, query, language);
          await context.emit({
            type: 'SearchRun',
            payload: { kind: 'fulltext', language, hits: hits.length },
          });
          return hits;
        }),
      attachment: (language, books) => read(() => notesAttachment(library, language, books)),
    };

    return {
      api,
      async start() {
        const entries = await loadEntries(db);
        library.put(entries, await loadTitles(db));
        await indexing.start();
        await reconcile();
      },
      observe(entry) {
        if (entry.type === 'PackInstalled') {
          return ingest({ pack: entry.payload.pack, burritos: entry.payload.burritos });
        }
        if (entry.type === 'PackRemoved') {
          return serial(() => dropPack(entry.payload.pack));
        }
        return undefined;
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
          await indexing.reindex(event.payload.language);
        },
        IndexDropped: async (event) => {
          await indexing.drop(event.payload.language);
        },
      },
    };
  },
});
