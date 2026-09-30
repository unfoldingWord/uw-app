import assert from 'node:assert/strict';
import type { JournalEntry } from '@lib/journal/entry';
import { simAppPackage } from '../device';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { transferBetween } from '../transfer';

function lastFailure(entries: readonly JournalEntry[]): string | undefined {
  const last = entries.at(-1);
  return last?.type === 'Failure' ? last.payload.code : undefined;
}

export default scenario(
  'SH-2',
  'an Android phone that received the app opens the system installer on it; a store build or an iPhone says why it cannot',
  async (world) => {
    const android = world.device('android', { platform: 'android' });
    await android.start();
    const apk = Uint8Array.from({ length: simAppPackage.bytes }, (_, index) => index % 253);
    android.adapters.files.offerExternal(simAppPackage.source, apk);

    const newcomer = world.device('newcomer', { platform: 'android' });
    await newcomer.start();
    const empty = await newcomer.kernel.transfer.installApp();
    assert.equal(!empty.ok && empty.code, 'files.not-found', 'nothing to install before the app arrives');
    assert.equal(lastFailure(newcomer.kernel.journal.read()), 'files.not-found');

    const moved = await transferBetween(android, newcomer, { app: true });
    assert.ok(moved.accepted.ok && moved.accepted.app?.state === 'ready-to-install');
    assert.deepEqual(await newcomer.adapters.files.readBytes(moved.accepted.app.path), apk);
    assert.deepEqual(
      newcomer.adapters.files.tree().filter((path) => path.startsWith('transfer/outgoing')),
      [],
    );
    assert.deepEqual(
      android.adapters.files.tree().filter((path) => path.startsWith('transfer/') && path !== 'transfer/'),
      [],
    );

    const opened = await servicesOf(newcomer).transfer.installApp();
    assert.deepEqual(opened, { ok: true, message: 'The installer is open. Follow its steps to finish.' });
    assert.deepEqual(newcomer.adapters.transport.installs(), ['transfer/app/unfoldingword.apk']);
    assert.equal(servicesOf(newcomer).transfer.installLabel(), 'Install the app');
    await newcomer.restart();
    assert.ok((await newcomer.kernel.transfer.installApp()).ok, 'the package is still there after a restart');

    newcomer.adapters.transport.setInstaller(false);
    const store = await servicesOf(newcomer).transfer.installApp();
    assert.ok(!store.ok);
    assert.equal(store.code, 'transfer.unsupported');
    assert.equal(
      store.message,
      'This copy of the app cannot open the installer. Get the app from its store instead.',
    );
    assert.equal(lastFailure(newcomer.kernel.journal.read()), 'transfer.unsupported');

    const iphone = world.device('iphone', { platform: 'ios' });
    await iphone.start();
    const refused = await iphone.kernel.transfer.installApp();
    assert.equal(!refused.ok && refused.code, 'transfer.unsupported', 'an iPhone never installs a package');
    assert.deepEqual(iphone.adapters.transport.installs(), []);

    const gone = world.device('gone', { platform: 'android' });
    await gone.start();
    assert.deepEqual((await gone.kernel.transfer.capabilities()).appPackage, {
      available: false,
      reason: 'not-found',
    });
    const missing = await gone.kernel.transfer.offer({ app: true });
    assert.equal(
      !missing.ok && missing.code,
      'transfer.unsupported',
      'a phone without its package offers none',
    );
  },
);
