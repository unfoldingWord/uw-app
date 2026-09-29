import { createMemoryClock, type MemoryClock } from './adapters/clock';
import { createMemoryNetwork, type MemoryNetwork } from './adapters/http';
import { createTransportBus, type TransportBus } from './adapters/transport';
import { createSimDevice, type DeviceOptions, type SimDevice } from './device';

export type World = {
  readonly clock: MemoryClock;
  readonly network: MemoryNetwork;
  readonly bus: TransportBus;
  device(name: string, options?: DeviceOptions): SimDevice;
  devices(): readonly SimDevice[];
};

export type WorldOptions = { at?: number; utcOffsetMinutes?: number };

export function createWorld(options: WorldOptions = {}): World {
  const clock = createMemoryClock(options);
  const network = createMemoryNetwork();
  const bus = createTransportBus();
  const devices: SimDevice[] = [];
  return {
    clock,
    network,
    bus,
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
