import type { MemoryNetwork } from '../adapters/http';
import { fixtureArchive } from './archive.ts';
import {
  burritoArchiveUrl,
  catalogLanguages,
  catalogLanguagesUrl,
  catalogSearch,
  catalogSearchBase,
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

function serveJson(
  network: MemoryNetwork,
  url: string,
  value: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  network.serve(url, {
    body: JSON.stringify(value),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const catalogPageSize = 50;

function pageLink(page: number): string {
  return `${catalogSearchBase}?limit=${catalogPageSize}&page=${page}&stage=prod&topic=tc-ready`;
}

function pagingHeaders(page: number, total: number): Record<string, string> {
  const last = Math.max(1, Math.ceil(total / catalogPageSize));
  const links = [
    ...(page < last ? [`<${pageLink(page + 1)}>; rel="next"`, `<${pageLink(last)}>; rel="last"`] : []),
    ...(page > 1 ? [`<${pageLink(1)}>; rel="first"`, `<${pageLink(page - 1)}>; rel="prev"`] : []),
  ];
  return { 'x-total-count': String(total), ...(links.length === 0 ? {} : { link: links.join(',') }) };
}

function serveCatalogPages(
  network: MemoryNetwork,
  document: { ok: boolean; data: readonly unknown[]; last_updated: string },
): void {
  const total = document.data.length;
  const pages = Math.floor(total / catalogPageSize) + 1;
  for (let page = 1; page <= pages + 1; page += 1) {
    const data = document.data.slice((page - 1) * catalogPageSize, page * catalogPageSize);
    serveJson(
      network,
      `${catalogSearchUrl}&limit=${catalogPageSize}&page=${page}`,
      { ...document, data },
      pagingHeaders(page, total),
    );
  }
}

export function serveFixtures(network: MemoryNetwork): FixtureCatalog {
  for (const response of responses()) {
    network.serve(response.url, { body: response.bytes, headers: { 'content-type': response.contentType } });
  }
  serveCatalogPages(network, catalogSearch(fixtureReleases));
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
      serveCatalogPages(network, catalogSearch(releases));
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
