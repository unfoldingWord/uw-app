import { resourceTypeOf, resourceTypes, type CatalogRelease, type ResourceType } from '@lib/catalog/types';
import type { CorpusKind, CorpusSummary } from '@lib/corpus/types';
import type { PackId } from '@lib/domain/pack';
import type { InstalledPack, InstallProgress } from '@lib/packs/types';
import type { StudyWords } from './strings';

const cardTypes = resourceTypes;

export type CardType = ResourceType;

export type CardState = 'on-phone' | 'downloading' | 'not-downloaded';

export type LibraryCard = {
  readonly type: CardType;
  readonly title: string;
  readonly about: string;
  readonly publishers: readonly string[];
  readonly releases: readonly CatalogRelease[];
  readonly meta: string;
  readonly state: CardState;
  readonly pack: PackId | undefined;
  readonly optional: boolean;
  readonly count: string | undefined;
};

export type LibraryInput = {
  readonly language: string;
  readonly releases: readonly CatalogRelease[];
  readonly installed: readonly InstalledPack[];
  readonly installing: readonly InstallProgress[];
  readonly summary: (language: string) => CorpusSummary;
};

const unfoldingWord = 'unfoldingWord';

function byPublisher(left: CatalogRelease, right: CatalogRelease): number {
  const rank = (release: CatalogRelease) => (release.publisher === unfoldingWord ? 0 : 1);
  return rank(left) - rank(right);
}

function publishersOf(releases: readonly CatalogRelease[]): readonly string[] {
  return [...new Set([...releases].sort(byPublisher).map((release) => release.publisher))];
}

function titleOf(words: StudyWords, type: CardType): { title: string; about: string } {
  switch (type) {
    case 'hebrew':
      return { title: words.t('resource.hebrew'), about: words.t('resource.original.about') };
    case 'greek':
      return { title: words.t('resource.greek'), about: words.t('resource.original.about') };
    default:
      return { title: words.t(`resource.${type}`), about: words.t(`resource.${type}.about`) };
  }
}

const unitKeys = {
  literal: 'library.books',
  simplified: 'library.books',
  hebrew: 'library.books',
  greek: 'library.books',
  notes: 'library.notes',
  wordLinks: 'library.wordLinks',
  questions: 'library.questions',
  words: 'library.articles',
  academy: 'library.articles',
  stories: 'library.stories',
  storyHelps: 'library.storyHelps',
  formation: 'library.movements',
  audio: 'library.chapters',
  images: 'library.pictures',
} as const satisfies Record<CardType, string>;

const summaryKinds: Readonly<Record<CardType, readonly CorpusKind[]>> = {
  literal: ['literal'],
  simplified: ['simplified'],
  hebrew: ['original'],
  greek: ['original'],
  notes: ['notes'],
  wordLinks: ['wordLinks'],
  questions: ['questions'],
  words: ['words'],
  academy: ['academy'],
  stories: ['stories'],
  storyHelps: ['storyNotes', 'storyQuestions', 'storyWordLinks'],
  formation: ['movements'],
  audio: ['audio'],
  images: ['images'],
};

function countOf(
  words: StudyWords,
  type: CardType,
  lead: CatalogRelease,
  input: LibraryInput,
): string | undefined {
  const summary = input.summary(lead.language);
  const counted = summaryKinds[type].flatMap((kind) => summary[kind]?.items ?? []);
  if (counted.length === 0) {
    return undefined;
  }
  return words.plural(
    unitKeys[type],
    counted.reduce((sum, items) => sum + items, 0),
  );
}

function isInstalled(release: CatalogRelease, installed: readonly InstalledPack[]): boolean {
  return installed.some(
    (pack) =>
      (release.pack === undefined || pack.pack === release.pack) &&
      pack.burritos.some(
        (burrito) =>
          burrito.provenance.publisher === release.publisher &&
          burrito.provenance.resource === release.resource &&
          burrito.provenance.language === release.language,
      ),
  );
}

export function libraryCards(words: StudyWords, input: LibraryInput): readonly LibraryCard[] {
  const grouped = new Map<CardType, CatalogRelease[]>();
  for (const release of input.releases) {
    const type = resourceTypeOf(release);
    if (type !== undefined) {
      grouped.set(type, [...(grouped.get(type) ?? []), release]);
    }
  }
  return cardTypes.flatMap((type) => {
    const releases = [...(grouped.get(type) ?? [])].sort(byPublisher);
    const [lead] = releases;
    if (lead === undefined) {
      return [];
    }
    const pack = lead.pack;
    const state: CardState = releases.some((release) => isInstalled(release, input.installed))
      ? 'on-phone'
      : input.installing.some((progress) => progress.pack === pack)
        ? 'downloading'
        : 'not-downloaded';
    return [
      {
        type,
        ...titleOf(words, type),
        publishers: publishersOf(releases),
        releases,
        meta: words.t('library.meta', { publisher: lead.publisher, version: lead.tag }),
        state,
        pack,
        optional: lead.kind === 'original' || lead.kind === 'audio',
        count: countOf(words, type, lead, input),
      },
    ];
  });
}
