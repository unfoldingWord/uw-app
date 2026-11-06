import { buildBundle } from '@sim/bundled';
import type { World } from '@sim/world';
import { lockOf, type BundledLock } from './lock';
import { allowlisted, serveImageSources, serveUrls, type ReadUrl } from './sources';

export async function resolveLock(
  world: World,
  language: string,
  read: ReadUrl,
  resolved: string,
): Promise<BundledLock> {
  const guarded = allowlisted(read);
  const bundle = await buildBundle(world, language, {
    prepare: async (release) => {
      if (release.built === 'images') {
        await serveImageSources(world, guarded, release.archiveUrl);
      } else {
        await serveUrls(world, guarded, [release.archiveUrl]);
      }
    },
  });
  return lockOf(bundle, language, resolved);
}
