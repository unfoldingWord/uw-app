import type { DevicePlatform, Transport } from '@lib/ports';
import { portError } from './errors';

const chunkBytes = 64 * 1024;

function unavailable(): never {
  throw portError(
    'transfer.unavailable',
    'no radio is admitted yet, see docs/proposals/2026-09-29-transport-radio.md',
  );
}

export function createPlatformTransport(platform: DevicePlatform): Transport {
  return {
    available: async () => false,
    platform: () => platform,
    maxChunkBytes: () => chunkBytes,
    advertise: async () => unavailable(),
    discover: async () => unavailable(),
    connect: async () => unavailable(),
    appPackage: async () => undefined,
  };
}
