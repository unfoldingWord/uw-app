import type { FailureCode } from '../domain/failures';
import type { PeerDelivery } from '../packs/source';
import type { DevicePlatform } from '../ports';
import type { WireChoice, WireOffer } from './protocol';

export type TransferPlan = {
  language?: string;
  resources?: readonly WireChoice[];
  app?: boolean;
};

export type Offer = WireOffer & { bytes: number };

export type AppPackageFact =
  { available: true; bytes: number } | { available: false; reason: 'ios-not-permitted' | 'not-found' };

export type TransferCapabilities = {
  available: boolean;
  platform: DevicePlatform;
  appPackage: AppPackageFact;
};

export type OfferOutcome =
  | { ok: true; transfer: string; code: string; address: string | undefined; offer: Offer }
  | { ok: false; code: FailureCode };

export type InstallAppOutcome = { ok: true } | { ok: false; code: FailureCode };

export type TransferOutcome =
  | { ok: true; transfer: string; bytes: number }
  | { ok: false; transfer: string | undefined; code: FailureCode };

export type IncomingOutcome =
  { ok: true; platform: DevicePlatform; offer: Offer } | { ok: false; code: FailureCode };

export type TransferSelection = {
  resources?: readonly WireChoice[];
  app?: boolean;
};

export type ReceivedApp = { path: string; bytes: number; state: 'ready-to-install' };

export type AcceptOutcome =
  | {
      ok: true;
      transfer: string;
      bytes: number;
      delivery: PeerDelivery | undefined;
      app: ReceivedApp | undefined;
    }
  | { ok: false; transfer: string | undefined; code: FailureCode };

export type TransferRole = 'sender' | 'receiver';

export type TransferState =
  'advertising' | 'offering' | 'connected' | 'preparing' | 'sending' | 'receiving' | 'received';

export type TransferStatus = {
  transfer: string | undefined;
  role: TransferRole;
  state: TransferState;
  code: string | undefined;
  peer: DevicePlatform | undefined;
  bytes: number;
  total: number;
};

export type TransferResult = {
  role: TransferRole;
  outcome: 'completed' | 'failed';
  code: FailureCode | undefined;
  resources: number;
  bytes: number;
};
