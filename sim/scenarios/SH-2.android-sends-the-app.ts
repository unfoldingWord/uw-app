import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { simAppPackage } from '../device';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { transferBetween } from '../transfer';

function packageBytes(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index * 31 + 7) % 251);
}

export default scenario(
  'SH-2',
  'an Android phone can send the app itself beside resources; an iPhone says it cannot and why',
  async (world) => {
    const android = world.device('android', { platform: 'android' });
    await android.start();
    await installFromCatalog(android, [languagePackId('qaa')]);
    const apk = packageBytes(simAppPackage.bytes);
    await android.adapters.files.mkdir('app');
    await android.adapters.files.writeBytes(simAppPackage.path, apk);

    assert.deepEqual(await android.kernel.transfer.capabilities(), {
      available: true,
      platform: 'android',
      appPackage: { available: true, bytes: apk.byteLength },
    });

    const iphone = world.device('iphone', { platform: 'ios' });
    await iphone.start();
    await installFromCatalog(iphone, [languagePackId('qab')]);
    assert.deepEqual((await iphone.kernel.transfer.capabilities()).appPackage, {
      available: false,
      reason: 'ios-not-permitted',
    });
    const refused = await iphone.kernel.transfer.offer({ language: 'qab', app: true });
    assert.equal(!refused.ok && refused.code, 'transfer.unsupported');
    const failure = iphone.kernel.journal.read().at(-1);
    assert.ok(failure?.type === 'Failure' && failure.payload.code === 'transfer.unsupported');
    assert.equal(iphone.kernel.transfer.current(), undefined, 'nothing is advertised');

    const tablet = world.device('tablet', { platform: 'android' });
    await tablet.start();
    tablet.adapters.http.setOnline(false);
    const stories = { publisher: 'unfoldingWord', resource: 'qaa_obs' };
    const both = await transferBetween(android, tablet, { language: 'qaa', resources: [stories], app: true });
    assert.deepEqual(both.offered.offer.app, { bytes: apk.byteLength });
    assert.ok(both.accepted.ok, both.accepted.ok ? '' : both.accepted.code);
    assert.ok(both.sent.ok);
    assert.ok(both.installed?.ok);
    assert.deepEqual(both.accepted.app, {
      path: 'transfer/app/unfoldingword.apk',
      bytes: apk.byteLength,
      state: 'ready-to-install',
    });
    assert.deepEqual(await tablet.adapters.files.readBytes('transfer/app/unfoldingword.apk'), apk);
    assert.deepEqual(tablet.kernel.transfer.receivedApp(), both.accepted.app);
    const snapshot = tablet.kernel.snapshot().modules.transfer as { receivedApp: unknown };
    assert.deepEqual(snapshot.receivedApp, both.accepted.app, 'the screen reads the fact from the kernel');
    await tablet.restart();
    assert.deepEqual(tablet.kernel.transfer.receivedApp(), both.accepted.app, 'it survives a restart');

    const fresh = world.device('fresh', { platform: 'android' });
    await fresh.start();
    const appOnly = await transferBetween(android, fresh, { app: true });
    assert.equal(appOnly.offered.offer.resources.length, 0, 'the app can go alone');
    assert.ok(appOnly.accepted.ok && appOnly.accepted.session === undefined);
    assert.equal(appOnly.installed, undefined);
    assert.deepEqual(fresh.kernel.transfer.receivedApp()?.state, 'ready-to-install');

    const reader = world.device('reader', { platform: 'ios' });
    await reader.start();
    const toIphone = await transferBetween(android, reader, {
      language: 'qaa',
      resources: [stories],
      app: true,
    });
    assert.ok(toIphone.accepted.ok && toIphone.installed?.ok);
    assert.equal(toIphone.accepted.app, undefined, 'an iPhone receives the resources and not the app');
    assert.equal(reader.kernel.transfer.receivedApp(), undefined);
    const accepted = reader.kernel.journal.read().find((entry) => entry.type === 'TransferAccepted');
    assert.ok(accepted?.type === 'TransferAccepted' && accepted.payload.app === 'none');
  },
);
