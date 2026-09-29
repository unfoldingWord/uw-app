import type { FailureCode } from '../domain/failures';
import type { PackId, PackKind, PackSourceKind, ResourceRow } from '../domain/pack';
import type { Provenance } from '../domain/provenance';
import type { ReleaseRef } from '../domain/release';

export type InstalledBurrito = {
  root: string;
  row: ResourceRow;
  bytes: number;
  released: string;
  provenance: Provenance;
};

export type InstalledPack = {
  pack: PackId;
  kind: PackKind;
  language: string | undefined;
  source: PackSourceKind;
  bytes: number;
  burritos: readonly InstalledBurrito[];
};

export type InstallProgress = {
  install: string;
  pack: PackId;
  resources: number;
  total: number;
  bytes: number;
};

export type InstallOutcome =
  | { ok: true; install: string | undefined; pack: InstalledPack }
  | { ok: false; install: string | undefined; pack: PackId | undefined; code: FailureCode };

export type RemoveOutcome = { ok: true; pack: PackId } | { ok: false; pack: PackId; code: FailureCode };

export type ResourceUpdate = {
  publisher: string;
  resource: string;
  installed: string;
  available: ReleaseRef & { commit: string };
};

export type PackUpdate = {
  pack: PackId;
  kind: PackKind;
  language: string | undefined;
  resources: readonly ResourceUpdate[];
};

export type PackStorage = { pack: PackId; kind: PackKind; language: string | undefined; bytes: number };

export type Storage = { packs: readonly PackStorage[]; used: number; freeSpace: number };
