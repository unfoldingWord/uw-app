import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { simAppPackage } from '../device';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { transferBetween, transferThroughServices } from '../transfer';

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
    android.adapters.files.offerExternal(simAppPackage.source, apk);

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

    const androidView = await servicesOf(android).transfer.capabilities();
    assert.ok(androidView.app.state === 'available', 'Android offers the app package');
    assert.equal(androidView.app.bytes, apk.byteLength);
    assert.equal(androidView.app.label, 'Send this app too');
    const iphoneView = await servicesOf(iphone).transfer.capabilities();
    assert.deepEqual(
      iphoneView.app,
      {
        state: 'ios-not-permitted',
        reason: 'iPhone does not allow sending the app itself. Resources can still go.',
      },
      'an iPhone says why it cannot',
    );
    const refusedHere = await servicesOf(iphone).transfer.offer({ language: 'qab', app: true });
    assert.ok(!refusedHere.ok);
    assert.equal(refusedHere.message, 'This phone cannot send the app itself. Resources can still go.');

    const newcomer = world.device('newcomer', { platform: 'android' });
    await newcomer.start();
    const withApp = await transferThroughServices(android, newcomer, {
      language: 'qaa',
      resources: [stories],
      app: true,
    });
    assert.ok(withApp.incoming.ok && withApp.incoming.app?.bytes === apk.byteLength);
    assert.ok(withApp.received.ok && withApp.received.state === 'ready-to-read');
    assert.equal(withApp.received.app?.path, 'transfer/app/unfoldingword.apk');
    assert.ok(withApp.sent.ok);
    assert.deepEqual(withApp.sent.messages.slice(1), [
      'The app is on the other phone. Install it there, then send resources.',
    ]);
    const bare = world.device('bare', { platform: 'android' });
    await bare.start();
    const alone = await transferThroughServices(android, bare, { app: true });
    assert.ok(alone.received.ok && alone.received.state === 'app-received');
    assert.deepEqual(servicesOf(bare).transfer.receivedApp(), alone.received.app);
    const onIphone = world.device('on-iphone', { platform: 'ios' });
    await onIphone.start();
    const noApp = await transferThroughServices(android, onIphone, {
      language: 'qaa',
      resources: [stories],
      app: true,
    });
    assert.ok(noApp.incoming.ok && noApp.incoming.app === undefined, 'an iPhone is not offered the app');
    assert.ok(
      noApp.received.ok && noApp.received.state === 'ready-to-read' && noApp.received.app === undefined,
    );
  },
);
