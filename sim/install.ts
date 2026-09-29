import type { PackId } from '@lib/domain/pack';
import type { InstalledPack } from '@lib/packs/types';
import type { SimDevice } from './device';

export async function installFromCatalog(
  device: SimDevice,
  packs: readonly PackId[],
): Promise<InstalledPack[]> {
  const refreshed = await device.kernel.catalog.refresh();
  if (!refreshed.ok) {
    throw new Error(`the fixture catalog did not refresh: ${refreshed.code}`);
  }
  const installed: InstalledPack[] = [];
  for (const pack of packs) {
    const outcome = await device.kernel.packs.installFromCatalog(pack);
    if (!outcome.ok) {
      throw new Error(`${pack} did not install from the fixture catalog: ${outcome.code}`);
    }
    installed.push(outcome.pack);
  }
  return installed;
}

export function catalogPacks(device: SimDevice): PackId[] {
  return [...new Set(device.kernel.catalog.all().flatMap((release) => release.pack ?? []))];
}

export function burritoRootOf(device: SimDevice, resource: string): string {
  const found = device.kernel.packs
    .installed()
    .flatMap((pack) => pack.burritos)
    .find((burrito) => burrito.provenance.resource === resource);
  if (found === undefined) {
    throw new Error(`${device.name} has no installed ${resource}`);
  }
  return found.root;
}
