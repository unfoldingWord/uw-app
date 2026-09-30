import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import type { JournalEntry } from '@lib/journal/entry';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { startOffer, transferBetween, transferThroughServices } from '../transfer';
import type { SimDevice } from '../device';

const simplified = { publisher: 'unfoldingWord', resource: 'qaa_ust' };

function types(entries: readonly JournalEntry[]): string[] {
  return entries.map((entry) => entry.type);
}

function transferEvents(device: SimDevice, since = 0): JournalEntry[] {
  return device.kernel.journal.read(since).filter((entry) => entry.type.startsWith('Transfer'));
}

function leftovers(device: SimDevice): string[] {
  return device.adapters.files.tree().filter((path) => path.startsWith('transfer/') && path !== 'transfer/');
}

async function readsRuth(device: SimDevice): Promise<readonly string[]> {
  const ruth = parseReference('RUT 1:16');
  assert.ok(ruth.ok);
  const passage = await device.kernel.corpus.passage(ruth.reference, { language: 'qaa' });
  assert.ok(passage, `${device.name} reads Ruth 1:16 from the pack it received`);
  assert.ok(passage.text.verses.length > 0);
  assert.match(passage.text.provenance.licence, /CC BY-SA 4\.0/);
  assert.equal(passage.text.reading, 'literal');
  const other = await device.kernel.corpus.passage(ruth.reference, { language: 'qaa', text: 'simplified' });
  return other === undefined ? passage.availableTexts : [...passage.availableTexts, 'simplified-found'];
}

export default scenario(
  'SH-1',
  'a language pack goes from iPhone to Android and back with no network, with resource selection and progress',
  async (world) => {
    const iphone = world.device('iphone', { platform: 'ios' });
    await iphone.start();
    await installFromCatalog(iphone, [languagePackId('qaa')]);
    const sent = iphone.kernel.packs.installed()[0];
    assert.ok(sent);
    const android = world.device('android', { platform: 'android' });
    await android.start();
    for (const device of [iphone, android]) {
      device.adapters.http.setOnline(false);
    }
    const requestsBefore = android.adapters.http.requests().length + iphone.adapters.http.requests().length;

    const chosen = sent.burritos
      .map((burrito) => ({ publisher: burrito.provenance.publisher, resource: burrito.provenance.resource }))
      .filter((item) => item.resource !== simplified.resource);
    const seen: number[] = [];
    const stopWatching = world.bus.tap(() => {
      seen.push(android.kernel.transfer.current()?.bytes ?? -1);
    });
    const first = await transferBetween(iphone, android, { language: 'qaa', resources: chosen });
    stopWatching();

    assert.equal(
      first.offered.offer.resources.length,
      sent.burritos.length - 1,
      'the sender chooses what goes',
    );
    for (const item of first.offered.offer.resources) {
      const sizes: ReadonlyMap<string, number> = new Map(
        sent.burritos.map((burrito) => [burrito.provenance.resource, burrito.bytes]),
      );
      assert.equal(item.bytes, sizes.get(item.resource), `the offer carries the size of ${item.resource}`);
    }
    assert.equal(first.offered.offer.app, undefined, 'an iPhone offers no app package');
    assert.match(first.offered.code, /^\d{6}$/);
    assert.ok(first.incoming.ok);
    assert.equal(first.incoming.ok && first.incoming.platform, 'ios');
    assert.ok(first.accepted.ok, first.accepted.ok ? '' : first.accepted.code);
    assert.ok(first.sent.ok, first.sent.ok ? '' : first.sent.code);
    assert.ok(first.installed?.ok, 'the receiving side is one install from the peer');
    assert.equal(first.installed.pack.source, 'peer');
    assert.deepEqual(
      first.installed.pack.burritos.map((burrito) => burrito.provenance.resource).sort(),
      chosen.map((item) => item.resource).sort(),
    );
    assert.deepEqual(await readsRuth(android), [], 'the omitted simplified text did not travel');

    const received = transferEvents(android);
    const progress = received.filter((entry) => entry.type === 'TransferProgressed');
    assert.ok(progress.length >= 1 && progress.length <= 10, `${progress.length} progress events`);
    const final = progress.at(-1);
    assert.ok(final?.type === 'TransferProgressed' && final.payload.bytes === final.payload.total);
    assert.ok(new Set(seen.filter((bytes) => bytes > 0)).size > 3, 'the receiver sees bytes arrive');
    const story = types(android.kernel.journal.read()).filter(
      (type) => !['TransferProgressed', 'PackInstallProgressed', 'PassageOpened'].includes(type),
    );
    assert.deepEqual(
      story,
      ['AppOpened', 'TransferAccepted', 'TransferCompleted', 'PackInstallStarted', 'PackInstalled'],
      'every byte arrives and is verified before the install starts',
    );
    const completed = received.find((entry) => entry.type === 'TransferCompleted');
    assert.ok(completed?.type === 'TransferCompleted');
    assert.deepEqual(
      { role: completed.payload.role, from: completed.payload.from, to: completed.payload.to },
      { role: 'receiver', from: 'ios', to: 'android' },
    );
    assert.deepEqual(
      types(transferEvents(iphone)).filter((type) => type !== 'TransferProgressed'),
      ['TransferOffered', 'TransferAccepted', 'TransferCompleted'],
    );
    assert.equal(
      JSON.stringify(android.kernel.snapshot()).includes('PlatformPair'),
      false,
      'the platform pair is read from the transfer events, never folded into a count that leaves in diagnostics',
    );
    assert.equal(android.kernel.telemetry.counts().transfersCompleted, 1);
    assert.equal(iphone.kernel.telemetry.counts().transfersCompleted, 0, 'a transfer is counted once');
    assert.deepEqual(leftovers(android), [], 'nothing of the transfer is left once the pack is installed');
    assert.deepEqual(leftovers(iphone), []);

    const ipad = world.device('ipad', { platform: 'ios' });
    await ipad.start();
    ipad.adapters.http.setOnline(false);
    const back = await transferBetween(android, ipad, { language: 'qaa' });
    assert.ok(back.sent.ok && back.accepted.ok && back.installed?.ok, 'Android sends to iPhone');
    assert.deepEqual(await readsRuth(ipad), []);
    const backCompleted = transferEvents(ipad).find((entry) => entry.type === 'TransferCompleted');
    assert.ok(backCompleted?.type === 'TransferCompleted');
    assert.deepEqual(
      { role: backCompleted.payload.role, from: backCompleted.payload.from, to: backCompleted.payload.to },
      { role: 'receiver', from: 'android', to: 'ios' },
    );
    assert.equal(ipad.kernel.telemetry.counts().transfersCompleted, 1);
    assert.equal(
      android.adapters.http.requests().length +
        iphone.adapters.http.requests().length +
        ipad.adapters.http.requests().length,
      requestsBefore,
      'no transfer touches the network',
    );

    const before = android.kernel.packs.installed();
    const tree = android.adapters.files.tree().filter((path) => path.startsWith('packs/'));
    const mark = android.kernel.journal.stats().lastSeq;
    const senderMark = iphone.kernel.journal.stats().lastSeq;
    world.bus.cutAfter(12 * 1024);
    const lost = await transferBetween(iphone, android, { language: 'qaa' });
    assert.equal(!lost.accepted.ok && lost.accepted.code, 'transfer.peer-lost');
    assert.equal(!lost.sent.ok && lost.sent.code, 'transfer.peer-lost');
    assert.equal(lost.installed, undefined, 'nothing is installed from a broken transfer');
    assert.deepEqual(
      types(transferEvents(android, mark)).filter((type) => type !== 'TransferProgressed'),
      ['TransferAccepted', 'TransferFailed'],
    );
    assert.ok(types(transferEvents(iphone, senderMark)).includes('TransferFailed'));
    assert.deepEqual(android.kernel.packs.installed(), before, 'the pack already there is untouched');
    assert.deepEqual(
      android.adapters.files.tree().filter((path) => path.startsWith('packs/')),
      tree,
    );
    assert.deepEqual(leftovers(android), [], 'no half pack');
    assert.deepEqual(await readsRuth(android), []);
    assert.equal(android.kernel.transfer.last()?.code, 'transfer.peer-lost');

    const waiting = await startOffer(iphone, { language: 'qaa' });
    const pending = iphone.kernel.transfer.run(waiting.transfer);
    const [peer] = await android.kernel.transfer.discover();
    assert.ok(peer);
    const shown = await android.kernel.transfer.connect(peer);
    assert.ok(shown.ok);
    await android.kernel.transfer.decline();
    const declined = await pending;
    assert.equal(!declined.ok && declined.code, 'transfer.declined');

    const stopped = await startOffer(iphone, { language: 'qaa' });
    const stopping = iphone.kernel.transfer.run(stopped.transfer);
    const [again] = await android.kernel.transfer.discover();
    assert.ok(again && (await android.kernel.transfer.connect(again)).ok);
    const accepting = android.kernel.transfer.accept();
    await iphone.kernel.transfer.cancel();
    const [cancelledHere, cancelledThere] = [await stopping, await accepting];
    assert.equal(!cancelledHere.ok && cancelledHere.code, 'transfer.cancelled');
    assert.equal(!cancelledThere.ok && cancelledThere.code, 'transfer.cancelled');
    assert.deepEqual(android.kernel.packs.installed(), before);
    assert.equal(android.kernel.transfer.current(), undefined);
    assert.equal(iphone.kernel.transfer.current(), undefined);

    const leader = world.device('leader', { platform: 'ios' });
    await leader.start();
    await installFromCatalog(leader, [languagePackId('qaa')]);
    const friend = world.device('friend', { platform: 'android' });
    await friend.start();
    for (const device of [leader, friend]) {
      device.adapters.http.setOnline(false);
    }
    const sending = servicesOf(leader).transfer;
    const capabilities = await sending.capabilities();
    assert.equal(capabilities.available, true);
    assert.equal(capabilities.platform, 'ios');
    const choices = sending.choices('qaa');
    assert.ok(choices.state === 'choices', 'the leader chooses from the language on the phone');
    assert.equal(choices.resources.length, sent.burritos.length);
    for (const item of choices.resources) {
      assert.ok(item.bytes > 0);
      assert.equal(item.label, `${item.title} · ${item.size}`, 'each resource shows its size');
    }
    const picked = choices.resources
      .filter((item) => item.resource !== simplified.resource)
      .map(({ publisher, resource }) => ({ publisher, resource }));
    const summary = sending.summary('qaa', picked);
    assert.equal(summary.count, picked.length);
    assert.equal(
      summary.bytes,
      choices.resources
        .filter((item) => item.resource !== simplified.resource)
        .reduce((sum, item) => sum + item.bytes, 0),
    );
    assert.match(summary.label, new RegExp(`^${picked.length} resources selected · `));
    assert.equal(servicesOf(world.device('empty')).transfer.choices('qaa').state, 'nothing');

    const labels: string[] = [];
    const watching = world.bus.tap(() => {
      const status = servicesOf(friend).transfer.status();
      if (status !== undefined) {
        labels.push(status.label);
      }
    });
    const run = await transferThroughServices(leader, friend, { language: 'qaa', resources: picked });
    watching();
    assert.equal(run.offered.codeLabel, `Code ${run.offered.code}`, 'the pairing code is shown');
    assert.equal(
      run.peers.find((item) => item.peer.code === run.offered.code)?.codeLabel,
      run.offered.codeLabel,
    );
    assert.match(run.peers[0]?.label ?? '', /^Nearby phone \d+$/);
    assert.ok(run.incoming.ok);
    assert.equal(run.incoming.platform, 'ios');
    assert.equal(run.incoming.resources.length, picked.length, 'the receiver sees what is offered');
    assert.equal(run.incoming.app, undefined);
    assert.ok(
      labels.some((label) => /^Receiving \d+%$/.test(label)),
      'the receiver sees progress',
    );
    assert.ok(run.received.ok && run.received.state === 'ready-to-read', 'the result is ready to read');
    assert.equal(run.received.language, 'qaa');
    assert.match(run.received.label, /is ready to read\.$/);
    assert.ok(run.sent.ok);
    assert.equal(run.sent.messages.length, 1);
    assert.match(run.sent.messages[0] ?? '', /is sent and ready on the other phone\.$/);
    const friendly = servicesOf(friend);
    assert.ok(await friendly.transfer.open('qaa'));
    const opened = await friendly.study.passage('RUT 1:16');
    assert.equal(opened.state, 'passage', 'the received language opens in Study');
    assert.equal(friendly.transfer.status(), undefined);
    assert.equal(friendly.transfer.last()?.outcome, 'completed');
  },
);
