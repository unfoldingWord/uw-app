import { compareReleases } from '../catalog/normalize';
import { comparePublishers, compareText } from '../order';
import type { CatalogRelease } from '../catalog/types';
import type { PackId, ResourceRow } from '../domain/pack';
import { resourceKey } from '../domain/release';
import type { InstalledBurrito, InstalledPack, PackUpdate, ResourceUpdate } from './types';

const rowsAwaitingSource: readonly ResourceRow[] = ['formation'];

function awaitsSource(release: CatalogRelease): boolean {
  return release.row !== undefined && rowsAwaitingSource.includes(release.row);
}

const pairFamilies: readonly (readonly [literal: string, simplified: string])[] = [
  ['ult', 'ust'],
  ['glt', 'gst'],
];

const leadingPublisher = 'unfoldingWord';

const door43Catalog = 'Door43-Catalog';

function isGatewayOrganization(publisher: string, language: string): boolean {
  return publisher.toLowerCase() === `${language.toLowerCase()}_gl`;
}

function publisherRank(publisher: string, language: string): number {
  if (publisher === leadingPublisher) {
    return 0;
  }
  if (isGatewayOrganization(publisher, language)) {
    return 1;
  }
  return publisher === door43Catalog ? 2 : 3;
}

function comparePreferredPublishers(language: string, left: string, right: string): number {
  return publisherRank(left, language) - publisherRank(right, language) || comparePublishers(left, right);
}

function comparePreferred(left: CatalogRelease, right: CatalogRelease): number {
  return (
    comparePreferredPublishers(left.language, left.publisher, right.publisher) ||
    compareText(left.resource, right.resource) ||
    compareText(left.tag, right.tag)
  );
}

function codeOf(release: CatalogRelease): string {
  const resource = release.resource.toLowerCase();
  const prefix = `${release.language.toLowerCase()}_`;
  return resource.startsWith(prefix)
    ? resource.slice(prefix.length)
    : (resource.split('_').at(-1) ?? resource);
}

function isPairText(release: CatalogRelease): boolean {
  const code = codeOf(release);
  return pairFamilies.some((family) => family.includes(code));
}

function wholePair(own: readonly CatalogRelease[]): CatalogRelease[] | undefined {
  for (const [literalCode, simplifiedCode] of pairFamilies) {
    const literal = own.find((release) => codeOf(release) === literalCode);
    const simplified = own.find((release) => codeOf(release) === simplifiedCode);
    if (literal !== undefined && simplified !== undefined) {
      return [literal, simplified];
    }
  }
  return undefined;
}

function publishersPair(texts: readonly CatalogRelease[]): CatalogRelease[] {
  const paired = texts.filter(isPairText);
  const publishers = [...new Set(paired.map((release) => release.publisher))];
  for (const publisher of publishers) {
    const pair = wholePair(paired.filter((release) => release.publisher === publisher));
    if (pair !== undefined) {
      return pair;
    }
  }
  const own = paired.filter((release) => release.publisher === publishers[0]);
  const literalCodes: readonly string[] = pairFamilies.map(([literal]) => literal);
  const fallback = own.find((release) => literalCodes.includes(codeOf(release))) ?? own[0];
  return fallback === undefined ? [] : [fallback];
}

export function defaultReleases(releases: readonly CatalogRelease[], pack: PackId): CatalogRelease[] {
  const inPack = releases
    .filter((release) => release.pack === pack && !awaitsSource(release))
    .sort(comparePreferred);
  const isText = (release: CatalogRelease) => release.kind === 'language' && release.row === 'text';
  const chosen = new Map<string, CatalogRelease>();
  for (const release of inPack.filter((item) => !isText(item))) {
    if (!chosen.has(release.resource)) {
      chosen.set(release.resource, release);
    }
  }
  return [...publishersPair(inPack.filter(isText)), ...chosen.values()].sort(compareReleases);
}

export function optionalReleases(releases: readonly CatalogRelease[], pack: PackId): CatalogRelease[] {
  const chosen = new Set(defaultReleases(releases, pack).map(resourceKey));
  return releases
    .filter((release) => release.pack === pack && !chosen.has(resourceKey(release)))
    .sort(compareReleases);
}

export function missingReleases(
  releases: readonly CatalogRelease[],
  pack: PackId,
  installed: InstalledPack | undefined,
): CatalogRelease[] {
  const present = new Set((installed?.burritos ?? []).map((burrito) => resourceKey(burrito.provenance)));
  return defaultReleases(releases, pack).filter((release) => !present.has(resourceKey(release)));
}

function updateOf(burrito: InstalledBurrito, catalog: ReadonlyMap<string, CatalogRelease>): ResourceUpdate[] {
  const release = catalog.get(resourceKey(burrito.provenance));
  if (release === undefined || release.tag === burrito.provenance.tag) {
    return [];
  }
  return [
    {
      publisher: release.publisher,
      resource: release.resource,
      installed: burrito.provenance.tag,
      available: {
        publisher: release.publisher,
        resource: release.resource,
        language: release.language,
        tag: release.tag,
        commit: release.commit,
      },
    },
  ];
}

export function updatesOf(
  releases: readonly CatalogRelease[],
  installed: readonly InstalledPack[],
): PackUpdate[] {
  const catalog = new Map(releases.map((release) => [resourceKey(release), release]));
  return installed.flatMap((pack) => {
    const resources = pack.burritos.flatMap((burrito) => updateOf(burrito, catalog));
    return resources.length === 0
      ? []
      : [{ pack: pack.pack, kind: pack.kind, language: pack.language, resources }];
  });
}
