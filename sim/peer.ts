import { fixtureRows } from './fixtures/rows';
import { readArchive } from '@lib/burrito/archive';
import { readProvenance } from '@lib/burrito/metadata';
import { validate } from '@lib/burrito/validate';
import { refOf, type ReleaseRef } from '@lib/domain/release';
import { resourceRows } from '@lib/domain/pack';
import type { PeerBurrito, PeerSession } from '@lib/packs/source';
import type { World } from './world';

export type FixturePeer = PeerSession & { received(): readonly string[] };

export function fixturePeer(world: World, releases: readonly ReleaseRef[]): FixturePeer {
  const received: string[] = [];
  const archiveOf = (ref: ReleaseRef): Uint8Array | undefined =>
    world.fixtures.archive(ref.publisher, ref.resource, ref.tag);
  const offered: PeerBurrito[] = releases.map((ref) => {
    const archive = archiveOf(ref);
    const read = archive === undefined ? undefined : readArchive(archive);
    const report = read?.ok ? validate(read.files, { rows: fixtureRows }) : undefined;
    const row = resourceRows.find((item) => report?.ok && item === report.row.id);
    if (!read?.ok || row === undefined) {
      throw new Error(
        `the fixture peer has no valid burrito for ${ref.publisher}/${ref.resource}@${ref.tag}`,
      );
    }
    const bytes = [...read.files.values()].reduce((sum, item) => sum + item.byteLength, 0);
    const commit = report?.ok ? readProvenance(report.metadata)?.commit : undefined;
    return { ...refOf(ref), row, bytes, ...(commit === undefined ? {} : { commit }) };
  });
  return {
    offered: () => offered,
    async receive(ref, onProgress) {
      const archive = archiveOf(ref);
      if (archive === undefined) {
        return { ok: false, code: 'transfer.peer-lost' };
      }
      received.push(`${ref.publisher}/${ref.resource}@${ref.tag}`);
      onProgress?.(archive.byteLength);
      return { ok: true, archive };
    },
    received: () => received.slice(),
  };
}
