import { compareReleases } from '../catalog/normalize';
import type { CatalogRelease } from '../catalog/types';
import type { PackId } from '../domain/pack';
import { resourceKey } from '../domain/release';
import type { InstalledBurrito, InstalledPack, PackUpdate, ResourceUpdate } from './types';

export function defaultReleases(releases: readonly CatalogRelease[], pack: PackId): CatalogRelease[] {
  const chosen = new Map<string, CatalogRelease>();
  for (const release of [...releases].sort(compareReleases)) {
    if (release.pack === pack && !chosen.has(release.resource)) {
      chosen.set(release.resource, release);
    }
  }
  return [...chosen.values()].sort(compareReleases);
}

export function missingReleases(
  releases: readonly CatalogRelease[],
  pack: PackId,
  installed: InstalledPack | undefined,
): CatalogRelease[] {
  const present = new Set((installed?.burritos ?? []).map((burrito) => burrito.provenance.resource));
  return defaultReleases(releases, pack).filter((release) => !present.has(release.resource));
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
