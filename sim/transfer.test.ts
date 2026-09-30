import { describe, expect, it } from 'vitest';
import { utf8 } from '@lib/burrito/files';
import { languagePackId } from '@lib/domain/pack';
import type { TransportLink } from '@lib/ports';
import { decodeFrame, encodeFrame, type Message } from '@lib/transfer/protocol';
import { fromPeer } from '@lib/packs/source';
import { pairingCode } from '@lib/transfer/transfer';
import { installFromCatalog } from './install';
import { startOffer, transferBetween } from './transfer';
import { createWorld, type World } from './world';

async function fakeSender(world: World, code: string): Promise<{ link: Promise<TransportLink | undefined> }> {
  const radio = world.bus.transport({ platform: 'ios' });
  const advertisement = await radio.advertise(code);
  return { link: advertisement.accept(1000) };
}

async function read(link: TransportLink): Promise<Message | undefined> {
  const frame = await link.receive();
  if (frame === undefined) {
    return undefined;
  }
  const decoded = decodeFrame(frame);
  return decoded.ok ? decoded.message : undefined;
}

const qabStories = {
  publisher: 'unfoldingWord',
  resource: 'qab_obs',
  language: 'qab',
  tag: 'v1',
  row: 'stories',
  title: 'Stories',
  bytes: 10,
} as const;

describe('Transfer at its interface', () => {
  it('moves a pack in many small chunks and still reports at most ten progress events', async () => {
    const world = createWorld({ maxChunkBytes: 600 });
    const giver = world.device('giver', { platform: 'ios' });
    await giver.start();
    await installFromCatalog(giver, [languagePackId('qaa')]);
    const taker = world.device('taker', { platform: 'android' });
    await taker.start();
    const run = await transferBetween(giver, taker, { language: 'qaa' });
    expect(run.installed?.ok).toBe(true);
    for (const device of [giver, taker]) {
      const progress = device.kernel.journal.read().filter((entry) => entry.type === 'TransferProgressed');
      expect(progress.length).toBeGreaterThan(0);
      expect(progress.length).toBeLessThanOrEqual(10);
    }
    expect(world.bus.delivered()).toBeGreaterThan(40 * 600);
  });

  it('hands each received archive to Packs as the file it was received into, not as bytes', async () => {
    const world = createWorld();
    const giver = world.device('giver', { platform: 'ios' });
    await giver.start();
    await installFromCatalog(giver, [languagePackId('qab')]);
    const taker = world.device('taker', { platform: 'android' });
    await taker.start();
    const offered = await startOffer(giver, { language: 'qab' });
    const sending = giver.kernel.transfer.run(offered.transfer);
    const peer = (await taker.kernel.transfer.discover()).find((item) => item.code === offered.code);
    expect(peer).toBeDefined();
    if (peer === undefined) {
      return;
    }
    expect((await taker.kernel.transfer.connect(peer)).ok).toBe(true);
    const accepted = await taker.kernel.transfer.accept({});
    await sending;
    const session = accepted.ok ? accepted.session : undefined;
    expect(session).toBeDefined();
    if (session === undefined) {
      return;
    }
    const [first] = session.offered();
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    const progress: number[] = [];
    const receipt = await session.receive(first, (bytes) => progress.push(bytes));
    expect(receipt.ok && 'path' in receipt && (await taker.adapters.files.exists(receipt.path))).toBe(true);
    expect(receipt.ok && 'archive' in receipt).toBe(false);
    expect(progress).toEqual([first.bytes]);
    expect((await taker.kernel.packs.install(fromPeer(session))).ok).toBe(true);
  });

  it('refuses a plan it cannot offer, and a second transfer while one is open', async () => {
    const world = createWorld();
    const phone = world.device('phone', { platform: 'android' });
    await phone.start();
    expect(await phone.kernel.transfer.offer({ language: 'qaa' })).toEqual({
      ok: false,
      code: 'pack.not-found',
    });
    expect(await phone.kernel.transfer.offer({})).toEqual({ ok: false, code: 'pack.empty-plan' });
    expect(await phone.kernel.transfer.offer({ app: true })).toEqual({
      ok: false,
      code: 'transfer.unsupported',
    });
    await installFromCatalog(phone, [languagePackId('qab')]);
    const offered = await startOffer(phone, { language: 'qab' });
    expect(offered.code).toBe(pairingCode(offered.transfer));
    expect(await phone.kernel.transfer.offer({ language: 'qab' })).toEqual({
      ok: false,
      code: 'transfer.unavailable',
    });
    expect(phone.kernel.snapshot().modules.transfer).toEqual({
      active: { role: 'sender', state: 'advertising', peer: null, bytes: 0, total: 0 },
      last: null,
      receivedApp: null,
    });
    await phone.kernel.transfer.cancel();
    expect(phone.kernel.snapshot().modules.transfer).toMatchObject({
      active: null,
      last: { role: 'sender', outcome: 'failed', code: 'transfer.cancelled' },
    });
    expect(JSON.stringify(phone.kernel.journal.export())).not.toContain(`"${offered.code}"`);
    phone.adapters.transport.setAvailable(false);
    expect(await phone.kernel.transfer.offer({ language: 'qab' })).toEqual({
      ok: false,
      code: 'transfer.unavailable',
    });
    expect(await phone.kernel.transfer.capabilities()).toMatchObject({ available: false });
  });

  it('refuses a peer speaking another version of the protocol', async () => {
    const world = createWorld();
    const taker = world.device('taker', { platform: 'android' });
    await taker.start();
    const fake = await fakeSender(world, '0001');
    const [peer] = await taker.kernel.transfer.discover();
    expect(peer).toBeDefined();
    if (peer === undefined) {
      return;
    }
    const connecting = taker.kernel.transfer.connect(peer);
    const link = await fake.link;
    const header = utf8(JSON.stringify({ v: 2, kind: 'hello', platform: 'ios' }));
    const frame = new Uint8Array(4 + header.byteLength);
    new DataView(frame.buffer).setUint32(0, header.byteLength);
    frame.set(header, 4);
    await link?.send(frame);
    expect(await connecting).toEqual({ ok: false, code: 'transfer.unsupported' });
    expect(taker.kernel.journal.read().at(-1)).toMatchObject({
      type: 'Failure',
      payload: { code: 'transfer.unsupported', context: { step: 'transfer' } },
    });
    expect(taker.kernel.transfer.current()).toBeUndefined();
  });

  it('refuses an archive whose digest does not match, tells the sender, and keeps nothing', async () => {
    const world = createWorld();
    const taker = world.device('taker', { platform: 'android' });
    await taker.start();
    const fake = await fakeSender(world, '0002');
    const [peer] = await taker.kernel.transfer.discover();
    if (peer === undefined) {
      throw new Error('no peer');
    }
    const connecting = taker.kernel.transfer.connect(peer);
    const link = await fake.link;
    if (link === undefined) {
      throw new Error('no link');
    }
    expect(await read(link)).toEqual({ kind: 'hello', platform: 'android', code: '0002' });
    await link.send(encodeFrame({ kind: 'hello', platform: 'ios' }));
    await link.send(
      encodeFrame({ kind: 'offer', offer: { language: 'qab', resources: [qabStories], app: undefined } }),
    );
    expect((await connecting).ok).toBe(true);
    const accepting = taker.kernel.transfer.accept();
    expect(await read(link)).toEqual({
      kind: 'accept',
      resources: [{ publisher: 'unfoldingWord', resource: 'qab_obs' }],
      app: false,
    });
    await link.send(encodeFrame({ kind: 'plan', items: [{ key: 'unfoldingWord/qab_obs', bytes: 3 }] }));
    await link.send(encodeFrame({ kind: 'chunk', item: 0, seq: 0, body: Uint8Array.from([1, 2, 3]) }));
    await link.send(encodeFrame({ kind: 'done', item: 0, md5: '00000000000000000000000000000000' }));
    expect(await accepting).toMatchObject({ ok: false, code: 'pack.checksum-mismatch' });
    expect(await read(link)).toEqual({ kind: 'error', code: 'pack.checksum-mismatch' });
    expect(
      taker.adapters.files.tree().filter((path) => path.startsWith('transfer/') && path !== 'transfer/'),
    ).toEqual([]);
    expect(taker.kernel.packs.installed()).toEqual([]);
    const failed = taker.kernel.journal.read().filter((entry) => entry.type === 'TransferFailed');
    expect(failed.map((entry) => entry.payload)).toMatchObject([
      { role: 'receiver', code: 'pack.checksum-mismatch' },
    ]);
  });

  it('refuses a plan that is not what was accepted', async () => {
    const world = createWorld();
    const taker = world.device('taker', { platform: 'android' });
    await taker.start();
    const fake = await fakeSender(world, '0003');
    const [peer] = await taker.kernel.transfer.discover();
    if (peer === undefined) {
      throw new Error('no peer');
    }
    const connecting = taker.kernel.transfer.connect(peer);
    const link = await fake.link;
    if (link === undefined) {
      throw new Error('no link');
    }
    await link.send(encodeFrame({ kind: 'hello', platform: 'ios' }));
    await link.send(
      encodeFrame({ kind: 'offer', offer: { language: 'qab', resources: [qabStories], app: undefined } }),
    );
    await connecting;
    const accepting = taker.kernel.transfer.accept();
    await link.send(encodeFrame({ kind: 'plan', items: [{ key: 'Someone/else', bytes: 3 }] }));
    expect(await accepting).toMatchObject({ ok: false, code: 'transfer.unsupported' });
  });
});
