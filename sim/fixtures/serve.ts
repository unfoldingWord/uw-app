import type { MemoryNetwork } from '../adapters/http';
import { fixtureArchive } from './archive.ts';
import {
  burritoArchiveUrl,
  catalogLanguages,
  catalogLanguagesUrl,
  catalogSearch,
  catalogSearchUrl,
} from './catalog.ts';
import { fixtureResponses, type FixtureResponse } from './load.ts';
import { fixtureReleases, type FixtureRelease } from './releases.ts';

export type FixtureCatalog = {
  releases(): readonly FixtureRelease[];
  publish(publisher: string, resource: string, tag: string): FixtureRelease;
  archive(publisher: string, resource: string, tag: string): Uint8Array | undefined;
};

let cached: readonly FixtureResponse[] | undefined;

function responses(): readonly FixtureResponse[] {
  cached ??= fixtureResponses();
  return cached;
}

function serveJson(network: MemoryNetwork, url: string, value: unknown): void {
  network.serve(url, { body: JSON.stringify(value), headers: { 'content-type': 'application/json' } });
}

export function serveFixtures(network: MemoryNetwork): FixtureCatalog {
  for (const response of responses()) {
    network.serve(response.url, { body: response.bytes, headers: { 'content-type': response.contentType } });
  }
  let releases: readonly FixtureRelease[] = fixtureReleases;
  const archives = new Map<string, Uint8Array>();
  const keyOf = (publisher: string, resource: string, tag: string): string =>
    `${publisher}/${resource}@${tag}`;
  return {
    releases: () => releases,
    publish(publisher, resource, tag) {
      const current = releases.find(
        (release) => release.publisher === publisher && release.resource === resource,
      );
      if (current === undefined) {
        throw new Error(`the fixture catalog has no ${publisher}/${resource}`);
      }
      const next: FixtureRelease = { ...current, tag };
      const archive = fixtureArchive(next);
      archives.set(keyOf(publisher, resource, tag), archive);
      network.serve(burritoArchiveUrl(next), {
        body: archive,
        headers: { 'content-type': 'application/zip' },
      });
      releases = releases.map((release) => (release === current ? next : release));
      serveJson(network, catalogSearchUrl, catalogSearch(releases));
      serveJson(network, catalogLanguagesUrl, catalogLanguages(releases));
      return next;
    },
    archive(publisher, resource, tag) {
      const published = archives.get(keyOf(publisher, resource, tag));
      if (published !== undefined) {
        return published.slice();
      }
      const release = fixtureReleases.find(
        (item) => item.publisher === publisher && item.resource === resource && item.tag === tag,
      );
      const url = release === undefined ? undefined : burritoArchiveUrl(release);
      return responses()
        .find((response) => response.url === url)
        ?.bytes.slice();
    },
  };
}
