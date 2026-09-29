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

const catalogTimeoutMs = 20_000;

const catalogPageSize = 50;

const maximumPages = 400;

export function catalogPageUrl(page: number): string {
  return `${catalogSearchUrl}&limit=${catalogPageSize}&page=${page}`;
}

export type RefreshOutcome =
  { ok: true; releases: number; languages: number; dropped: number } | { ok: false; code: FailureCode };

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
  | { ok: true; releases: CatalogRelease[]; dropped: number }
  | { ok: false; code: FailureCode; context: FailureContext };

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

async function fetchCatalog(ports: ModulePorts): Promise<Fetched> {
  const releases: CatalogRelease[] = [];
  let entries = 0;
  let dropped = 0;
  for (let page = 1; page <= maximumPages; page += 1) {
    const response = await ports.http.request({ url: catalogPageUrl(page), timeoutMs: catalogTimeoutMs });
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
    dropped += normalized.dropped;
    const declared = response.headers['x-total-count'];
    const total = declared === undefined ? Number.NaN : Number(declared);
    if (normalized.entries < catalogPageSize || (Number.isFinite(total) && entries >= total)) {
      break;
    }
  }
  return { ok: true, releases: uniqueReleases(releases), dropped };
}

export const catalogModule = defineModule<CatalogApi>({
  events: ['CatalogRefreshStarted', 'CatalogRefreshed'],
  owns: { tables: catalogTables, directories: [], keys: [] },
  create(context) {
    const { ports } = context;
    let releases: readonly CatalogRelease[] = [];
    let installed = new Set<string>();
    let queue: Promise<unknown> = Promise.resolve();

    const languages = (): readonly CatalogLanguage[] => languagesOf(releases, installed);

    function refresh(): Promise<RefreshOutcome> {
      const next = queue.then(refreshNow, refreshNow);
      queue = next.catch(() => undefined);
      return next;
    }

    async function refreshNow(): Promise<RefreshOutcome> {
      await context.emit({ type: 'CatalogRefreshStarted', payload: {} });
      const fetched = await fetchCatalog(ports);
      if (!fetched.ok) {
        await context.emit({ type: 'Failure', payload: { code: fetched.code, context: fetched.context } });
        return { ok: false, code: fetched.code };
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
        payload: { languages: counted, releases: next.length, dropped: fetched.dropped },
      });
      return { ok: true, releases: next.length, languages: counted, dropped: fetched.dropped };
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
