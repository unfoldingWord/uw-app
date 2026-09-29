import type { CatalogRelease } from '@lib/catalog/types';
import { resourceTypeOf, resourceTypes, type ResourceType } from '@lib/catalog/resourceTypes';
import type { CorpusSummary } from '@lib/corpus/types';
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

function countOf(words: StudyWords, type: CardType, input: LibraryInput): string | undefined {
  switch (type) {
    case 'literal':
    case 'simplified': {
      const items = input.summary(input.language)[type]?.items;
      return items === undefined ? undefined : words.plural('library.books', items);
    }
    case 'hebrew':
    case 'greek': {
      const language = type === 'hebrew' ? 'hbo' : 'el-x-koine';
      const items = input.summary(language).original?.items;
      return items === undefined ? undefined : words.plural('library.books', items);
    }
    case 'words':
    case 'academy': {
      const items = input.summary(input.language)[type]?.items;
      return items === undefined ? undefined : words.plural('library.articles', items);
    }
    case 'stories': {
      const items = input.summary(input.language).stories?.items;
      return items === undefined ? undefined : words.plural('library.stories', items);
    }
    default:
      return undefined;
  }
}

function isInstalled(release: CatalogRelease, installed: readonly InstalledPack[]): boolean {
  return installed.some((pack) =>
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
        count: countOf(words, type, input),
      },
    ];
  });
}
