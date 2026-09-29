import { fromUtf8 } from '../burrito/files';
import type { FailureCode, FailureContext } from '../domain/failures';
import { door43 } from '../domain/release';
import { defineModule } from '../module';
import type { ModulePorts } from '../module';
import type { HttpResponse } from '../ports';
import { readInstalledPacks } from '../packs/store';
import { languagesOf, releasesIn, searchLanguages } from './languages';
import { compareReleases, normalizePage, uniqueReleases } from './normalize';
import { catalogTables, readCatalogReleases, replaceCatalogReleases } from './store';
import type { CatalogLanguage, CatalogRelease } from './types';

export const catalogSearchUrl = `${door43}/api/v1/catalog/search?stage=prod&topic=tc-ready`;

export const catalogTimeoutMs = 20_000;

const maximumPages = 40;

export type RefreshOutcome =
  { ok: true; releases: number; languages: number } | { ok: false; code: FailureCode };

export type CatalogApi = {
  refresh(): Promise<RefreshOutcome>;
  languages(): readonly CatalogLanguage[];
  search(query: string): readonly CatalogLanguage[];
  releases(language: string): readonly CatalogRelease[];
  originals(): readonly CatalogRelease[];
  all(): readonly CatalogRelease[];
  online(): Promise<boolean>;
};

type Fetched =
  { ok: true; releases: CatalogRelease[] } | { ok: false; code: FailureCode; context: FailureContext };

function unreachable(response: Exclude<HttpResponse, { kind: 'response' }>): Fetched {
  switch (response.kind) {
    case 'offline':
      return { ok: false, code: 'http.offline', context: { step: 'catalog' } };
    case 'timeout':
      return { ok: false, code: 'http.timeout', context: { step: 'catalog' } };
    case 'refused':
      return { ok: false, code: 'http.host-refused', context: { step: 'catalog' } };
    case 'cancelled':
      return { ok: false, code: 'http.cancelled', context: { step: 'catalog' } };
  }
}

function parse(body: Uint8Array): unknown {
  try {
    return JSON.parse(fromUtf8(body)) as unknown;
  } catch {
    return undefined;
  }
}

function pageUrl(page: number): string {
  return page === 1 ? catalogSearchUrl : `${catalogSearchUrl}&page=${page}`;
}

async function fetchCatalog(ports: ModulePorts): Promise<Fetched> {
  const releases: CatalogRelease[] = [];
  let entries = 0;
  for (let page = 1; page <= maximumPages; page += 1) {
    const response = await ports.http.request({ url: pageUrl(page), timeoutMs: catalogTimeoutMs });
    if (response.kind !== 'response') {
      return unreachable(response);
    }
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, code: 'http.status', context: { step: 'catalog', status: response.status } };
    }
    const normalized = normalizePage(parse(response.body));
    if (!normalized.ok) {
      return { ok: false, code: 'catalog.invalid-response', context: { step: 'catalog', page } };
    }
    releases.push(...normalized.releases);
    entries += normalized.entries;
    const total = Number(response.headers['x-total-count']);
    if (!Number.isFinite(total) || entries >= total || normalized.entries === 0) {
      break;
    }
  }
  return { ok: true, releases: uniqueReleases(releases) };
}

export const catalogModule = defineModule<CatalogApi>({
  events: ['CatalogRefreshStarted', 'CatalogRefreshed'],
  owns: { tables: catalogTables, directories: [], keys: [] },
  create(context) {
    const { ports } = context;
    let releases: readonly CatalogRelease[] = [];
    let installed = new Set<string>();
    let latest = 0;

    const languages = (): readonly CatalogLanguage[] => languagesOf(releases, installed);

    async function refresh(): Promise<RefreshOutcome> {
      latest += 1;
      const generation = latest;
      await context.emit({ type: 'CatalogRefreshStarted', payload: {} });
      const fetched = await fetchCatalog(ports);
      if (!fetched.ok) {
        await context.emit({ type: 'Failure', payload: { code: fetched.code, context: fetched.context } });
        return { ok: false, code: fetched.code };
      }
      if (generation !== latest) {
        return { ok: false, code: 'catalog.superseded' };
      }
      const next = [...fetched.releases].sort(compareReleases);
      try {
        await ports.db.transaction((session) => replaceCatalogReleases(session, next));
      } catch {
        await context.emit({ type: 'Failure', payload: { code: 'db.io', context: { step: 'catalog' } } });
        return { ok: false, code: 'db.io' };
      }
      releases = next;
      const counted = languages().length;
      await context.emit({
        type: 'CatalogRefreshed',
        payload: { languages: counted, releases: next.length },
      });
      return { ok: true, releases: next.length, languages: counted };
    }

    return {
      api: {
        refresh,
        languages,
        search: (query) => searchLanguages(languages(), query),
        releases: (language) => releasesIn(releases, language),
        originals: () => releases.filter((release) => release.kind === 'original'),
        all: () => releases,
        online: () => ports.http.online(),
      },
      async start() {
        try {
          releases = await readCatalogReleases(ports.db);
          installed = new Set(
            (await readInstalledPacks(ports.db)).flatMap((pack) =>
              pack.kind === 'language' && pack.language !== undefined ? [pack.language] : [],
            ),
          );
        } catch {
          releases = [];
        }
      },
      observe(entry) {
        if (entry.type === 'PackInstalled' && entry.payload.kind === 'language' && entry.payload.language) {
          installed = new Set([...installed, entry.payload.language]);
        }
        if (entry.type === 'PackRemoved' && entry.payload.pack.startsWith('language:')) {
          const language = entry.payload.pack.slice('language:'.length);
          installed = new Set([...installed].filter((item) => item !== language));
        }
      },
      snapshot: () => ({
        releases: releases.length,
        languages: languages().map((item) => ({
          language: item.language,
          resources: item.resources,
          installed: item.installed,
        })),
        originals: releases
          .filter((release) => release.kind === 'original')
          .map((release) => release.language),
      }),
      redo: {
        CatalogRefreshStarted: async () => {
          await refresh();
        },
      },
    };
  },
});
