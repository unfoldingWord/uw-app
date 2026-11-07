import { Asset } from 'expo-asset';
import type { Bundled, BundledArchive } from '@lib/ports';
import { carriedArchives, type CarriedArchive } from './bundled-archives';
import { messageOf, portError } from './errors';

function archiveOf(carried: CarriedArchive): BundledArchive {
  return {
    file: carried.file,
    pack: carried.pack,
    row: carried.row,
    publisher: carried.publisher,
    resource: carried.resource,
    language: carried.language,
    tag: carried.tag,
    commit: carried.commit,
    title: carried.title,
    subject: carried.subject,
    published: carried.published,
    bytes: carried.bytes,
  };
}

export function createPlatformBundled(carried: readonly CarriedArchive[] = carriedArchives): Bundled {
  const archives = carried.map(archiveOf);
  return {
    archives: () => archives,
    async open(file) {
      const found = carried.find((item) => item.file === file);
      if (found === undefined) {
        throw portError('files.not-found', `the app carries no ${file}`);
      }
      let uri: string | null;
      try {
        const asset = await Asset.fromModule(found.asset).downloadAsync();
        uri = asset.localUri;
      } catch (error) {
        throw portError('files.not-found', `${file} did not open: ${messageOf(error)}`);
      }
      if (uri === null || uri === '') {
        throw portError('files.not-found', `${file} has no file on the device`);
      }
      return uri;
    },
  };
}
