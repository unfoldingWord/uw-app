import type { FailureCode } from '../domain/failures';
import type { PackId, ResourceRow } from '../domain/pack';
import type { BuiltKind, ReleaseAsset } from '../catalog/types';
import type { ReleaseRef } from '../domain/release';

export type CatalogChoice = ReleaseRef & {
  commit?: string;
  title?: string;
  published?: string;
  row?: ResourceRow | undefined;
  bytes?: number | undefined;
  subject?: string;
  assets?: readonly ReleaseAsset[];
  built?: BuiltKind | undefined;
};

export type PeerBurrito = ReleaseRef & { row: ResourceRow; bytes: number; commit?: string };

export type PeerReceipt =
  { ok: true; archive: Uint8Array } | { ok: true; path: string } | { ok: false; code: FailureCode };

export type PeerDelivery = {
  offered(): readonly PeerBurrito[];
  receive(burrito: ReleaseRef, onProgress?: (bytes: number) => void): Promise<PeerReceipt>;
};

export type PackSource =
  | { kind: 'catalog'; releases: readonly CatalogChoice[] }
  | { kind: 'peer'; delivery: PeerDelivery }
  | { kind: 'file'; path: string };

export type PackPlan = {
  pack?: PackId;
  resources?: readonly Pick<ReleaseRef, 'publisher' | 'resource'>[];
};

export function fromCatalog(releases: readonly CatalogChoice[]): PackSource {
  return { kind: 'catalog', releases };
}

export function fromPeer(delivery: PeerDelivery): PackSource {
  return { kind: 'peer', delivery };
}

export function fromFile(path: string): PackSource {
  return { kind: 'file', path };
}
