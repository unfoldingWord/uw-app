import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { until } from '../wait';

export default scenario(
  'ON-2',
  'choosing a language starts the download of its language pack with progress visible',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();

    const release = phone.adapters.http.hold('https://git.door43.org/unfoldingWord/qaa_');
    const pending = phone.kernel.packs.installFromCatalog(languagePackId('qaa'));
    await until(() => phone.kernel.packs.installing().length > 0);
    assert.deepEqual(phone.kernel.packs.installing(), [
      { install: 'id-000001', pack: 'language:qaa', resources: 0, total: 12, bytes: 0 },
    ]);
    const snapshot = phone.kernel.snapshot().modules.packs;
    assert.deepEqual(snapshot, {
      installed: [],
      installing: [{ install: 'id-000001', pack: 'language:qaa', resources: 0, total: 12, bytes: 0 }],
    });
    assert.equal(phone.kernel.journal.read().at(-1)?.type, 'PackInstallStarted');

    release();
    const outcome = await pending;
    assert.ok(outcome.ok, outcome.ok ? '' : outcome.code);
    assert.deepEqual(phone.kernel.packs.installing(), []);
    const progressed = phone.kernel.journal
      .read()
      .flatMap((entry) => (entry.type === 'PackInstallProgressed' ? [entry.payload.resources] : []));
    assert.ok(progressed.length > 0 && progressed.length <= 10, `progress events: ${progressed.length}`);
    assert.equal(progressed.at(-1), 12);
    assert.deepEqual(phone.kernel.telemetry.counts().languagePackDownloads, { qaa: 1 });
  },
);
