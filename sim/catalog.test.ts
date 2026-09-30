import { describe, expect, it } from 'vitest';
import { catalogPageUrl, catalogSearchUrl } from '@lib/catalog/catalog';
import { replayJournal } from './replay';
import { createWorld } from './world';

async function phone() {
  const world = createWorld();
  const device = world.device('phone');
  await device.start();
  return { world, device };
}

function lastFailure(device: Awaited<ReturnType<typeof phone>>['device']) {
  const entry = device.kernel.journal.read().at(-1);
  return entry?.type === 'Failure' ? entry.payload : undefined;
}

const entry = (name: string, tag = 'v1') => ({
  name,
  owner: 'unfoldingWord',
  branch_or_tag_name: tag,
  commit_sha: 'ca519c4d42abb073c180cc4adb58921ee10d456a',
  language: 'qaa',
  language_title: 'Fixture A',
  subject: 'Open Bible Stories',
  stage: 'prod',
});

describe('catalog interface (LA-1, LA-7)', () => {
  it('refreshes over Http from the production tc-ready search and keeps the result in the database', async () => {
    const { device } = await phone();
    expect(await device.kernel.catalog.refresh()).toEqual({
      ok: true,
      releases: 24,
      languages: 3,
      dropped: 0,
    });
    expect(device.adapters.http.requests()).toEqual([
      `GET ${catalogPageUrl(1)}`,
      'GET https://git.door43.org/api/v1/catalog/list/languages?stage=prod&topic=tc-ready',
    ]);
    expect(catalogPageUrl(2)).toBe(`${catalogSearchUrl}&limit=50&page=2`);
    expect(device.kernel.journal.read().map((item) => item.type)).toEqual([
      'AppOpened',
      'CatalogRefreshStarted',
      'CatalogRefreshed',
    ]);
    await device.restart();
    expect(device.kernel.catalog.all()).toHaveLength(24);
    expect(device.kernel.catalog.releases('qaa').map((release) => release.resource)).toContain('qaa_ult');
  });

  it('records offline, timeout, refused hosts and non-2xx answers as failures and keeps the known catalog', async () => {
    const { device } = await phone();
    await device.kernel.catalog.refresh();
    device.adapters.http.script(catalogPageUrl(1), 'timeout');
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'http.timeout' });
    device.adapters.http.script(catalogPageUrl(1), { status: 503 });
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'http.status' });
    expect(lastFailure(device)).toEqual({ code: 'http.status', context: { step: 'catalog', status: 503 } });
    device.adapters.http.setOnline(false);
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'http.offline' });
    expect(device.kernel.catalog.all()).toHaveLength(24);
  });

  it('refuses a document that is not a catalog, and skips entries it cannot key', async () => {
    const { world, device } = await phone();
    await device.kernel.catalog.refresh();
    world.network.serve(catalogPageUrl(1), { body: '<html>maintenance</html>' });
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'catalog.invalid-response' });
    expect(device.kernel.catalog.all()).toHaveLength(24);
    world.network.serve(catalogPageUrl(1), {
      body: JSON.stringify({
        ok: true,
        data: [entry('qaa_obs'), { ...entry('qaa_tn'), stage: 'draft' }, {}],
      }),
    });
    expect(await device.kernel.catalog.refresh()).toEqual({
      ok: true,
      releases: 1,
      languages: 1,
      dropped: 2,
    });
    const refreshed = device.kernel.journal.read().at(-1);
    expect(refreshed?.type === 'CatalogRefreshed' && refreshed.payload).toEqual({
      languages: 1,
      releases: 1,
      dropped: 2,
    });
  });

  it('follows pages of fifty until a short or empty page, with or without a total count', async () => {
    const { world, device } = await phone();
    const names = (from: number, count: number) =>
      Array.from({ length: count }, (_, index) => entry(`qaa_r${from + index}`));
    const page = (items: unknown[], headers: Record<string, string> = {}) => ({
      body: JSON.stringify({ ok: true, data: items }),
      headers,
    });
    world.network.serve(catalogPageUrl(1), page(names(0, 50)));
    world.network.serve(catalogPageUrl(2), page(names(50, 50)));
    world.network.serve(catalogPageUrl(3), page(names(100, 7)));
    expect(await device.kernel.catalog.refresh()).toMatchObject({ ok: true, releases: 107 });
    expect(device.adapters.http.requests().filter((url) => url.includes('/catalog/search'))).toHaveLength(3);
    world.network.serve(catalogPageUrl(3), page([]));
    expect(await device.kernel.catalog.refresh()).toMatchObject({ ok: true, releases: 100 });
    world.network.serve(catalogPageUrl(2), page(names(50, 50), { 'x-total-count': '100' }));
    const before = device.adapters.http.requests().length;
    expect(await device.kernel.catalog.refresh()).toMatchObject({ ok: true, releases: 100 });
    expect(device.adapters.http.requests().length - before).toBe(3);
  });

  it('serves the fixture catalog the way DCS pages it: x-total-count, a Link header, last_updated', async () => {
    const { device } = await phone();
    const first = await device.adapters.http.request({ url: catalogPageUrl(1), timeoutMs: 1000 });
    expect(first.kind === 'response' && first.headers['x-total-count']).toBe('21');
    expect(first.kind === 'response' && first.headers['link']).toBeUndefined();
    const body =
      first.kind === 'response' ? (JSON.parse(new TextDecoder().decode(first.body)) as object) : {};
    expect(Object.keys(body)).toEqual(['ok', 'data', 'last_updated']);
  });

  it('runs refreshes one after another, so the last asked for wins and a replay agrees', async () => {
    const { world, device } = await phone();
    const release = device.adapters.http.hold(catalogPageUrl(1));
    const older = device.kernel.catalog.refresh();
    await new Promise((resolve) => setImmediate(resolve));
    const newer = device.kernel.catalog.refresh();
    release();
    expect(await older).toMatchObject({ ok: true, releases: 24 });
    world.network.serve(catalogPageUrl(1), { body: JSON.stringify({ ok: true, data: [entry('qaa_obs')] }) });
    expect(await newer).toEqual({ ok: true, releases: 1, languages: 1, dropped: 0 });
    expect(device.kernel.catalog.all()).toHaveLength(1);
    expect(device.kernel.journal.read().map((item) => item.type)).toEqual([
      'AppOpened',
      'CatalogRefreshStarted',
      'CatalogRefreshed',
      'CatalogRefreshStarted',
      'CatalogRefreshed',
    ]);
  });

  it('replays overlapping refreshes to the same journal', async () => {
    const { world, device } = await phone();
    const release = device.adapters.http.hold(catalogPageUrl(1));
    const first = device.kernel.catalog.refresh();
    const second = device.kernel.catalog.refresh();
    await new Promise((resolve) => setImmediate(resolve));
    release();
    await Promise.all([first, second]);
    const replayed = await replayJournal(world, JSON.parse(JSON.stringify(device.kernel.journal.export())));
    expect(replayed.ok && replayed.divergence).toEqual([]);
  });
});
