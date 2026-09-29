import type { FailureCode } from '../domain/failures';
import type { ModuleContext, ModulePorts } from '../module';
import type { Advertisement, DevicePlatform } from '../ports';
import type { Offer, TransferRole, TransferState, TransferStatus } from './types';
import { crossesStep, type Wire } from './wire';

export const transferDirectory = 'transfer';

export const outgoingDirectory = `${transferDirectory}/outgoing`;

export const incomingDirectory = `${transferDirectory}/incoming`;

export const receivedAppDirectory = `${transferDirectory}/app`;

export const receivedAppPath = `${receivedAppDirectory}/unfoldingword.apk`;

export const archiveMtime = '2000-01-01T12:00:00Z';

export const acceptTimeoutMs = 5 * 60 * 1000;

export const connectTimeoutMs = 30 * 1000;

export type Active = {
  transfer: string | undefined;
  role: TransferRole;
  state: TransferState;
  code: string | undefined;
  platform: DevicePlatform;
  peer: DevicePlatform | undefined;
  bytes: number;
  total: number;
  wire: Wire | undefined;
  advertisement: Advertisement | undefined;
  offer: Offer | undefined;
  cancelled: boolean;
  inFlight: boolean;
  failed: boolean;
};

export type Run = {
  ports: ModulePorts;
  emit: ModuleContext['emit'];
  active: Active;
};

export function newActive(role: TransferRole, state: TransferState, platform: DevicePlatform): Active {
  return {
    transfer: undefined,
    role,
    state,
    code: undefined,
    platform,
    peer: undefined,
    bytes: 0,
    total: 0,
    wire: undefined,
    advertisement: undefined,
    offer: undefined,
    cancelled: false,
    inFlight: false,
    failed: false,
  };
}

export function statusOf(active: Active): TransferStatus {
  return {
    transfer: active.transfer,
    role: active.role,
    state: active.state,
    code: active.code,
    peer: active.peer,
    bytes: active.bytes,
    total: active.total,
  };
}

export async function progressed(run: Run, bytes: number): Promise<void> {
  const { active } = run;
  const before = active.bytes;
  active.bytes += bytes;
  const transfer = active.transfer;
  if (transfer !== undefined && crossesStep(before, active.bytes, active.total)) {
    await run.emit({
      type: 'TransferProgressed',
      payload: { transfer, bytes: active.bytes, total: active.total },
    });
  }
}

export async function failTransfer(run: Run, code: FailureCode): Promise<void> {
  const { active } = run;
  if (active.failed) {
    return;
  }
  active.failed = true;
  const transfer = active.transfer ?? run.ports.ids.next();
  active.transfer = transfer;
  await run.emit({ type: 'TransferFailed', payload: { transfer, role: active.role, code } });
}

export async function quietly(work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch {
    return;
  }
}
