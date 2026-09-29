import type { FailureCode } from '../domain/failures';
import type { PackId, ResourceRow } from '../domain/pack';
import type { ReleaseRef } from '../domain/release';

export type CatalogChoice = ReleaseRef & {
  commit?: string;
  title?: string;
  row?: ResourceRow | undefined;
  bytes?: number | undefined;
};

export type PeerBurrito = ReleaseRef & { row: ResourceRow; bytes: number };

export type PeerReceipt = { ok: true; archive: Uint8Array } | { ok: false; code: FailureCode };

export type PeerSession = {
  offered(): readonly PeerBurrito[];
  receive(burrito: ReleaseRef, onProgress?: (bytes: number) => void): Promise<PeerReceipt>;
};

export type PackSource =
  | { kind: 'catalog'; releases: readonly CatalogChoice[] }
  | { kind: 'peer'; session: PeerSession }
  | { kind: 'file'; path: string };

export type PackPlan = {
  pack?: PackId;
  resources?: readonly Pick<ReleaseRef, 'publisher' | 'resource'>[];
};

export function fromCatalog(releases: readonly CatalogChoice[]): PackSource {
  return { kind: 'catalog', releases };
}

export function fromPeer(session: PeerSession): PackSource {
  return { kind: 'peer', session };
}

export function fromFile(path: string): PackSource {
  return { kind: 'file', path };
}
