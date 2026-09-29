import { describe, expect, it } from 'vitest';
import { catalogSearchUrl } from '@lib/catalog/catalog';
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
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: true, releases: 20, languages: 3 });
    expect(device.adapters.http.requests()).toEqual([`GET ${catalogSearchUrl}`]);
    expect(device.kernel.journal.read().map((item) => item.type)).toEqual([
      'AppOpened',
      'CatalogRefreshStarted',
      'CatalogRefreshed',
    ]);
    await device.restart();
    expect(device.kernel.catalog.all()).toHaveLength(20);
    expect(device.kernel.catalog.releases('qaa').map((release) => release.resource)).toContain(
      'qaa_ult-audio',
    );
  });

  it('records offline, timeout, refused hosts and non-2xx answers as failures and keeps the known catalog', async () => {
    const { device } = await phone();
    await device.kernel.catalog.refresh();
    device.adapters.http.script(catalogSearchUrl, 'timeout');
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'http.timeout' });
    device.adapters.http.script(catalogSearchUrl, { status: 503 });
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'http.status' });
    expect(lastFailure(device)).toEqual({ code: 'http.status', context: { step: 'catalog', status: 503 } });
    device.adapters.http.setOnline(false);
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'http.offline' });
    expect(device.kernel.catalog.all()).toHaveLength(20);
  });

  it('refuses a document that is not a catalog, and skips entries it cannot key', async () => {
    const { world, device } = await phone();
    await device.kernel.catalog.refresh();
    world.network.serve(catalogSearchUrl, { body: '<html>maintenance</html>' });
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: false, code: 'catalog.invalid-response' });
    expect(device.kernel.catalog.all()).toHaveLength(20);
    world.network.serve(catalogSearchUrl, {
      body: JSON.stringify({
        ok: true,
        data: [entry('qaa_obs'), { ...entry('qaa_tn'), stage: 'draft' }, {}],
      }),
    });
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: true, releases: 1, languages: 1 });
  });

  it('follows pages while the total count says there are more', async () => {
    const { world, device } = await phone();
    const page = (items: unknown[]) => ({
      body: JSON.stringify({ ok: true, data: items }),
      headers: { 'x-total-count': '3' },
    });
    world.network.serve(catalogSearchUrl, page([entry('qaa_obs')]));
    world.network.serve(`${catalogSearchUrl}&page=2`, page([entry('qaa_tn'), entry('qaa_tq')]));
    expect(await device.kernel.catalog.refresh()).toEqual({ ok: true, releases: 3, languages: 1 });
    expect(device.adapters.http.requests()).toHaveLength(2);
  });

  it('never lets an older refresh overwrite a newer one', async () => {
    const { world, device } = await phone();
    const release = device.adapters.http.hold(catalogSearchUrl);
    const older = device.kernel.catalog.refresh();
    await new Promise((resolve) => setImmediate(resolve));
    world.network.serve(catalogSearchUrl, { body: JSON.stringify({ ok: true, data: [entry('qaa_obs')] }) });
    const newer = device.kernel.catalog.refresh();
    release();
    expect(await older).toEqual({ ok: false, code: 'catalog.superseded' });
    expect(await newer).toEqual({ ok: true, releases: 1, languages: 1 });
    expect(device.kernel.catalog.all()).toHaveLength(1);
  });
});
