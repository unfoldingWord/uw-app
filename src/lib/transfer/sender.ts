import { writeArchive } from '../burrito/archive';
import { validate } from '../burrito/validate';
import type { FailureCode } from '../domain/failures';
import { languagePackId } from '../domain/pack';
import { resourceKey } from '../domain/release';
import type { ModulePorts } from '../module';
import { packRows } from '../packs/burrito';
import { readInstalledPacks } from '../packs/store';
import { readBurrito, removeIfPresent } from '../packs/tree';
import { archiveMtime, outgoingDirectory, progressed, type Run } from './active';
import { appItemKey, chunkBodyBytes, type PlanItem, type WireChoice, type WireResource } from './protocol';
import type { AppPackageFact, Offer, TransferPlan } from './types';
import { createDigest, TransferStop, type Wire } from './wire';

export type Outgoing = {
  resources: readonly { resource: WireResource; root: string }[];
  appPath: string | undefined;
};

type AppPackageLookup = { fact: AppPackageFact; path: string | undefined };

export async function appPackageOf(ports: ModulePorts): Promise<AppPackageLookup> {
  if (ports.transport.platform() === 'ios') {
    return { fact: { available: false, reason: 'ios-not-permitted' }, path: undefined };
  }
  const found = await ports.transport.appPackage();
  if (found === undefined || !(await ports.files.exists(found.path))) {
    return { fact: { available: false, reason: 'not-found' }, path: undefined };
  }
  return { fact: { available: true, bytes: await ports.files.size(found.path) }, path: found.path };
}

type Prepared = { ok: true; offer: Offer; outgoing: Outgoing } | { ok: false; code: FailureCode };

function chosen<T extends WireChoice>(items: readonly T[], choices: readonly WireChoice[] | undefined): T[] {
  if (choices === undefined) {
    return [...items];
  }
  const wanted = new Set(choices.map(resourceKey));
  return items.filter((item) => wanted.has(resourceKey(item)));
}

export async function prepareOffer(ports: ModulePorts, plan: TransferPlan): Promise<Prepared> {
  const resources: { resource: WireResource; root: string }[] = [];
  if (plan.language !== undefined) {
    const pack = (await readInstalledPacks(ports.db)).find(
      (item) => item.pack === languagePackId(plan.language ?? ''),
    );
    if (pack === undefined) {
      return { ok: false, code: 'pack.not-found' };
    }
    const offered = pack.burritos.map((burrito) => ({
      resource: {
        publisher: burrito.provenance.publisher,
        resource: burrito.provenance.resource,
        language: burrito.provenance.language,
        tag: burrito.provenance.tag,
        row: burrito.row,
        title: burrito.provenance.title,
        bytes: burrito.bytes,
      },
      root: burrito.root,
    }));
    const kept = new Set(
      chosen(
        offered.map((item) => item.resource),
        plan.resources,
      ),
    );
    resources.push(...offered.filter((item) => kept.has(item.resource)));
  }
  let appPath: string | undefined;
  let appBytes: number | undefined;
  if (plan.app === true) {
    const lookup = await appPackageOf(ports);
    if (!lookup.fact.available) {
      return { ok: false, code: 'transfer.unsupported' };
    }
    appPath = lookup.path;
    appBytes = lookup.fact.bytes;
  }
  if (resources.length === 0 && appPath === undefined) {
    return { ok: false, code: 'pack.empty-plan' };
  }
  const offer: Offer = {
    language: plan.language,
    resources: resources.map((item) => item.resource),
    app: appBytes === undefined ? undefined : { bytes: appBytes },
    bytes: resources.reduce((sum, item) => sum + item.resource.bytes, 0) + (appBytes ?? 0),
  };
  return { ok: true, offer, outgoing: { resources, appPath } };
}

type Item = PlanItem & { path: string };

async function writeArchives(
  ports: ModulePorts,
  resources: Outgoing['resources'],
  appPath: string | undefined,
): Promise<Item[]> {
  const { files } = ports;
  await removeIfPresent(files, outgoingDirectory);
  await files.mkdir(outgoingDirectory);
  const items: Item[] = [];
  for (const [index, item] of resources.entries()) {
    const burrito = await readBurrito(files, item.root);
    if (!validate(burrito, { rows: packRows }).ok) {
      throw new TransferStop('pack.invalid-burrito', true);
    }
    const archive = writeArchive(burrito, { mtime: archiveMtime });
    const path = `${outgoingDirectory}/${index}.zip`;
    await files.writeBytes(path, archive);
    items.push({ key: resourceKey(item.resource), bytes: archive.byteLength, path });
  }
  if (appPath !== undefined) {
    items.push({ key: appItemKey, bytes: await files.size(appPath), path: appPath });
  }
  return items;
}

async function stream(run: Run, wire: Wire, item: Item, index: number): Promise<void> {
  const body = chunkBodyBytes(run.ports.transport.maxChunkBytes());
  const digest = createDigest();
  let seq = 0;
  for (let offset = 0; offset < item.bytes; offset += body) {
    const bytes = await run.ports.files.readRange(item.path, offset, Math.min(body, item.bytes - offset));
    digest.update(bytes);
    await wire.send({ kind: 'chunk', item: index, seq, body: bytes });
    seq += 1;
    await progressed(run, bytes.byteLength);
  }
  await wire.send({ kind: 'done', item: index, md5: digest.hex() });
}

export async function sendAccepted(run: Run, wire: Wire, outgoing: Outgoing): Promise<number> {
  const { active, ports } = run;
  const transfer = active.transfer ?? '';
  const accepted = await wire.expect('accept');
  const resources = outgoing.resources.filter((item) =>
    accepted.resources.some((choice) => resourceKey(choice) === resourceKey(item.resource)),
  );
  const appPath = accepted.app ? outgoing.appPath : undefined;
  if (resources.length === 0 && appPath === undefined) {
    throw new TransferStop('transfer.declined', false);
  }
  await run.emit({
    type: 'TransferAccepted',
    payload: {
      transfer,
      role: 'sender',
      ...(active.offer?.language === undefined ? {} : { language: active.offer.language }),
      resources: resources.length,
      app: appPath === undefined ? 'none' : 'included',
    },
  });
  active.state = 'preparing';
  const items = await writeArchives(ports, resources, appPath);
  active.total = items.reduce((sum, item) => sum + item.bytes, 0);
  await wire.send({ kind: 'plan', items: items.map(({ key, bytes }) => ({ key, bytes })) });
  active.state = 'sending';
  for (const [index, item] of items.entries()) {
    await stream(run, wire, item, index);
  }
  await wire.expect('received');
  await run.emit({
    type: 'TransferCompleted',
    payload: {
      transfer,
      role: 'sender',
      from: active.platform,
      to: active.peer ?? active.platform,
      resources: resources.length,
      bytes: active.total,
      app: appPath === undefined ? 'none' : 'included',
    },
  });
  return active.total;
}
