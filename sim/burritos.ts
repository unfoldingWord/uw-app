import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito, type IngredientInput } from '@lib/burrito/build';
import type { InstallOutcome } from '@lib/packs/types';
import { fromFile } from '@lib/packs/source';
import type { SimDevice } from './device';

export type LocalBurrito = {
  readonly resource: string;
  readonly language: string;
  readonly abbreviation: string;
  readonly name: string;
  readonly flavorType: string;
  readonly flavor: string;
  readonly ingredients: readonly IngredientInput[];
  readonly tag?: string;
};

export function localBurritoArchive(burrito: LocalBurrito): Uint8Array {
  const files = buildBurrito({
    publisher: 'unfoldingWord',
    resource: burrito.resource,
    tag: burrito.tag ?? 'v1',
    commit: 'c0ffee',
    released: '2026-09-01T00:00:00Z',
    dateCreated: '2026-09-01T00:00:00Z',
    generator: { softwareName: 'sim', softwareVersion: '1' },
    language: { tag: burrito.language, name: { en: `Fixture ${burrito.language}` } },
    name: { en: burrito.name },
    abbreviation: { en: burrito.abbreviation },
    flavorType: burrito.flavorType,
    flavor: burrito.flavor,
    licence: { statement: 'Released under CC BY-SA 4.0', text: 'CC BY-SA 4.0' },
    ingredients: burrito.ingredients,
  });
  return writeArchive(files, { root: burrito.resource, mtime: new Date(2026, 8, 1) });
}

export async function importLocalBurrito(device: SimDevice, burrito: LocalBurrito): Promise<InstallOutcome> {
  const path = `imports/${burrito.resource}.zip`;
  await device.adapters.files.mkdir('imports');
  await device.adapters.files.writeBytes(path, localBurritoArchive(burrito));
  const outcome = await device.kernel.packs.install(fromFile(path));
  await device.adapters.files.remove(path);
  return outcome;
}
