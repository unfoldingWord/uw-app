import { createMemoryClock, type MemoryClock } from './adapters/clock';
import { createMemoryNetwork, type MemoryNetwork } from './adapters/http';
import { createTransportBus, type TransportBus } from './adapters/transport';
import { createSimDevice, type DeviceOptions, type SimDevice } from './device';
import { serveFixtures, type FixtureCatalog } from './fixtures/serve';

export type World = {
  readonly clock: MemoryClock;
  readonly network: MemoryNetwork;
  readonly bus: TransportBus;
  readonly fixtures: FixtureCatalog;
  device(name: string, options?: DeviceOptions): SimDevice;
  devices(): readonly SimDevice[];
};

export type WorldOptions = { at?: number; utcOffsetMinutes?: number; maxChunkBytes?: number };

const worldChunkBytes = 4096;

export function createWorld(options: WorldOptions = {}): World {
  const clock = createMemoryClock(options);
  const network = createMemoryNetwork();
  const bus = createTransportBus({ maxChunkBytes: options.maxChunkBytes ?? worldChunkBytes });
  const fixtures = serveFixtures(network);
  const devices: SimDevice[] = [];
  return {
    clock,
    network,
    bus,
    fixtures,
    device(name, deviceOptions) {
      if (devices.some((device) => device.name === name)) {
        throw new Error(`the world already has a device named ${name}`);
      }
      const device = createSimDevice(name, { clock, network, bus }, deviceOptions);
      devices.push(device);
      return device;
    },
    devices: () => devices.slice(),
  };
}
