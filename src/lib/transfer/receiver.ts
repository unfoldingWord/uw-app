import { resourceKey, type ReleaseRef } from '../domain/release';
import type { ModulePorts } from '../module';
import type { PeerBurrito, PeerDelivery } from '../packs/source';
import { removeIfPresent } from '../packs/tree';
import type { DevicePlatform } from '../ports';
import { incomingDirectory, progressed, receivedAppDirectory, receivedAppPath, type Run } from './active';
import { appItemKey, type PlanItem, type WireResource } from './protocol';
import type { Offer, ReceivedApp, TransferSelection } from './types';
import { createDigest, TransferStop, type Wire } from './wire';

export type Chosen = { resources: readonly WireResource[]; app: boolean };

export function chooseFrom(offer: Offer, selection: TransferSelection, platform: DevicePlatform): Chosen {
  const wanted =
    selection.resources === undefined ? undefined : new Set(selection.resources.map(resourceKey));
  const resources = offer.resources.filter((item) => wanted === undefined || wanted.has(resourceKey(item)));
  const app = offer.app !== undefined && platform === 'android' && (selection.app ?? true);
  return { resources, app };
}

export type Received = {
  archives: ReadonlyMap<string, string>;
  app: ReceivedApp | undefined;
};

function planMatches(items: readonly PlanItem[], chosen: Chosen): boolean {
  const expected = [...chosen.resources.map(resourceKey), ...(chosen.app ? [appItemKey] : [])].sort();
  const keys = items.map((item) => item.key).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

async function receiveItem(run: Run, wire: Wire, item: PlanItem, index: number, path: string): Promise<void> {
  const digest = createDigest();
  let seq = 0;
  let received = 0;
  for (;;) {
    const message = await wire.next();
    if (message.kind === 'chunk' && message.item === index && message.seq === seq) {
      received += message.body.byteLength;
      if (received > item.bytes) {
        throw new TransferStop('pack.checksum-mismatch', true);
      }
      await run.ports.files.appendBytes(path, message.body);
      digest.update(message.body);
      seq += 1;
      await progressed(run, message.body.byteLength);
      continue;
    }
    if (message.kind === 'done' && message.item === index) {
      if (message.md5 !== digest.hex() || received !== item.bytes) {
        throw new TransferStop('pack.checksum-mismatch', true);
      }
      return;
    }
    if (message.kind === 'cancel') {
      throw new TransferStop('transfer.cancelled', false);
    }
    if (message.kind === 'error') {
      throw new TransferStop(message.code, false);
    }
    throw new TransferStop('transfer.unsupported', true);
  }
}

async function keepApp(ports: ModulePorts, path: string, bytes: number): Promise<ReceivedApp> {
  await removeIfPresent(ports.files, receivedAppDirectory);
  await ports.files.mkdir(receivedAppDirectory);
  await ports.files.rename(path, receivedAppPath);
  return { path: receivedAppPath, bytes, state: 'ready-to-install' };
}

export async function receiveAccepted(run: Run, wire: Wire, chosen: Chosen): Promise<Received> {
  const { active, ports } = run;
  await wire.send({
    kind: 'accept',
    resources: chosen.resources.map((item) => ({ publisher: item.publisher, resource: item.resource })),
    app: chosen.app,
  });
  const plan = await wire.expect('plan');
  if (!planMatches(plan.items, chosen)) {
    throw new TransferStop('transfer.unsupported', true);
  }
  active.total = plan.items.reduce((sum, item) => sum + item.bytes, 0);
  active.state = 'receiving';
  await removeIfPresent(ports.files, incomingDirectory);
  await ports.files.mkdir(incomingDirectory);
  if ((await ports.files.freeSpace()) < active.total) {
    throw new TransferStop('pack.no-space', true);
  }
  const archives = new Map<string, string>();
  let app: ReceivedApp | undefined;
  for (const [index, item] of plan.items.entries()) {
    const path = `${incomingDirectory}/${index}.part`;
    await receiveItem(run, wire, item, index, path);
    if (item.key === appItemKey) {
      app = await keepApp(ports, path, item.bytes);
    } else {
      archives.set(item.key, path);
    }
  }
  await wire.send({ kind: 'received' });
  active.state = 'received';
  return { archives, app };
}

export function receivedDelivery(
  ports: ModulePorts,
  resources: readonly WireResource[],
  archives: ReadonlyMap<string, string>,
): PeerDelivery {
  const offered: PeerBurrito[] = resources.map((item) => ({
    publisher: item.publisher,
    resource: item.resource,
    language: item.language,
    tag: item.tag,
    row: item.row,
    bytes: item.bytes,
    ...(item.commit === undefined ? {} : { commit: item.commit }),
  }));
  return {
    offered: () => offered,
    async receive(burrito: ReleaseRef, onProgress?: (bytes: number) => void) {
      const key = resourceKey(burrito);
      const path = archives.get(key);
      if (path === undefined || !(await ports.files.exists(path))) {
        return { ok: false, code: 'files.not-found' };
      }
      onProgress?.(offered.find((item) => resourceKey(item) === key)?.bytes ?? 0);
      return { ok: true, path };
    },
  };
}
