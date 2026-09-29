import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readArchive } from '@lib/burrito/archive';
import type { BurritoFiles } from '@lib/burrito/files';
import { packDirectory } from '@lib/corpus/source';
import { audioPackId, imagePackId, languagePackId, originalPackId } from '@lib/domain/pack';
import type { SimDevice } from './device';

const archivesDirectory = join(import.meta.dirname, 'fixtures', 'sb');

export const fixturePacks: Readonly<Record<string, readonly string[]>> = {
  [languagePackId('qaa')]: [
    'unfoldingWord/qaa_ult/v1',
    'unfoldingWord/qaa_ust/v1',
    'unfoldingWord/qaa_tn/v1',
    'unfoldingWord/qaa_twl/v1',
    'unfoldingWord/qaa_tq/v1',
    'unfoldingWord/qaa_tw/v1',
    'unfoldingWord/qaa_ta/v1',
    'unfoldingWord/qaa_obs/v1',
    'unfoldingWord/qaa_obs-tn/v1',
    'unfoldingWord/qaa_obs-sq/v1',
    'unfoldingWord/qaa_obs-tf/v1',
  ],
  [languagePackId('qab')]: ['unfoldingWord/qab_obs/v1', 'unfoldingWord/qab_obs-sq/v1'],
  [languagePackId('en')]: ['unfoldingWord/en_obs/v9', 'unfoldingWord/en_obs-tf/v1'],
  [imagePackId]: ['unfoldingWord/obs-images/v1'],
  [audioPackId('qaa', 'ult-audio')]: ['unfoldingWord/qaa_ult-audio/v1'],
  [originalPackId('hbo')]: ['unfoldingWord/hbo_uhb/v2.1.30'],
  [originalPackId('el-x-koine')]: ['unfoldingWord/el-x-koine_ugnt/v0.34'],
};

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'));
}

export async function writeBurrito(
  device: SimDevice,
  packId: string,
  publisher: string,
  repository: string,
  burrito: BurritoFiles,
): Promise<string> {
  const root = `${packDirectory(packId)}/${publisher}/${repository}`;
  for (const [path, bytes] of burrito) {
    const target = `${root}/${path}`;
    await device.adapters.files.mkdir(parentOf(target));
    await device.adapters.files.writeBytes(target, bytes);
  }
  return root;
}

export async function unpackFixturePack(device: SimDevice, packId: string): Promise<void> {
  const releases = fixturePacks[packId];
  if (releases === undefined) {
    throw new Error(`no fixture pack ${packId}`);
  }
  for (const release of releases) {
    const [publisher = '', repository = '', tag = ''] = release.split('/');
    const read = readArchive(
      new Uint8Array(readFileSync(join(archivesDirectory, publisher, repository, `${tag}.zip`))),
    );
    if (!read.ok) {
      throw new Error(`${release}: ${read.message}`);
    }
    await writeBurrito(device, packId, publisher, read.root, read.files);
  }
}

export async function installFixturePacks(
  device: SimDevice,
  packIds: readonly string[] = Object.keys(fixturePacks),
): Promise<void> {
  for (const packId of packIds) {
    await unpackFixturePack(device, packId);
    const source = await device.kernel.corpus.describe(packId);
    await device.kernel.corpus.ingest(source);
  }
}
