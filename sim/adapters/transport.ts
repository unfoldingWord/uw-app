import type { Advertisement, AppPackage, DevicePlatform, Peer, Transport, TransportLink } from '@lib/ports';
import { portError } from './errors';

export type MemoryTransport = Transport & {
  setAvailable(available: boolean): void;
  expireWaits(): void;
  setInstaller(allowed: boolean): void;
  installs(): readonly string[];
};

export type AppPackageSource = AppPackage | (() => AppPackage | undefined);

export type TransportTap = (chunk: Uint8Array) => void;

export type TransportBus = {
  transport(options: { platform: DevicePlatform; appPackage?: AppPackageSource }): MemoryTransport;
  cut(): void;
  cutAfter(bytes: number): void;
  tap(listener: TransportTap): () => void;
  delivered(): number;
};

type Channel = {
  inbox: Uint8Array[];
  waiters: ((chunk: Uint8Array | undefined) => void)[];
  closed: boolean;
};

type Listing = {
  peer: Peer;
  owner: MemoryTransport;
  incoming: TransportLink[];
  waiters: ((link: TransportLink | undefined) => void)[];
};

const defaultMaxChunkBytes = 64 * 1024;

function memoryAddress(count: number): string {
  return `192.0.2.${count}:47000`;
}

function channel(): Channel {
  return { inbox: [], waiters: [], closed: false };
}

function wake(target: Channel): void {
  for (const waiter of target.waiters.splice(0)) {
    waiter(undefined);
  }
}

export function createTransportBus(options: { maxChunkBytes?: number } = {}): TransportBus {
  const maxChunkBytes = options.maxChunkBytes ?? defaultMaxChunkBytes;
  const listings = new Map<string, Listing>();
  const channels = new Set<Channel>();
  const taps = new Set<TransportTap>();
  let peerCount = 0;
  let deliveredBytes = 0;
  let cutAt: number | undefined;

  function cut(): void {
    for (const side of channels) {
      side.closed = true;
      wake(side);
    }
  }

  function link(peer: Peer, outgoing: Channel, incoming: Channel): TransportLink {
    return {
      peer,
      send: async (chunk) => {
        if (outgoing.closed) {
          throw portError('transfer.peer-lost', 'the link is closed');
        }
        if (chunk.byteLength > maxChunkBytes) {
          throw portError('transfer.unsupported', `chunk of ${chunk.byteLength} bytes is over the limit`);
        }
        if (cutAt !== undefined && deliveredBytes + chunk.byteLength > cutAt) {
          cutAt = undefined;
          cut();
          throw portError('transfer.peer-lost', 'the link was lost');
        }
        deliveredBytes += chunk.byteLength;
        for (const listener of taps) {
          listener(chunk.slice());
        }
        const waiter = outgoing.waiters.shift();
        if (waiter === undefined) {
          outgoing.inbox.push(chunk.slice());
        } else {
          waiter(chunk.slice());
        }
      },
      receive: () => {
        const next = incoming.inbox.shift();
        if (next !== undefined || incoming.closed) {
          return Promise.resolve(next);
        }
        return new Promise((resolve) => incoming.waiters.push(resolve));
      },
      close: async () => {
        for (const side of [outgoing, incoming]) {
          side.closed = true;
          wake(side);
        }
      },
    };
  }

  function transport(settings: { platform: DevicePlatform; appPackage?: AppPackageSource }): MemoryTransport {
    let available = true;
    let installer = settings.platform === 'android';
    const installs: string[] = [];
    const own = new Set<string>();
    const requireAvailable = (): void => {
      if (!available) {
        throw portError('transfer.unavailable', 'radios are off');
      }
    };
    const self: MemoryTransport = {
      available: async () => available,
      platform: () => settings.platform,
      maxChunkBytes: () => maxChunkBytes,
      advertise: async (code): Promise<Advertisement> => {
        requireAvailable();
        peerCount += 1;
        const peer: Peer = { id: memoryAddress(peerCount), code, platform: settings.platform };
        const listing: Listing = { peer, owner: self, incoming: [], waiters: [] };
        listings.set(peer.id, listing);
        own.add(peer.id);
        return {
          code,
          address: peer.id,
          accept: () => {
            const ready = listing.incoming.shift();
            if (ready !== undefined || !listings.has(peer.id)) {
              return Promise.resolve(ready);
            }
            return new Promise((resolve) => listing.waiters.push(resolve));
          },
          stop: async () => {
            listings.delete(peer.id);
            own.delete(peer.id);
            listing.waiters.splice(0).forEach((waiter) => waiter(undefined));
          },
        };
      },
      discover: async () => {
        requireAvailable();
        return [...listings.values()]
          .filter((listing) => listing.owner !== self)
          .map((listing) => listing.peer);
      },
      connect: async (peer) => {
        requireAvailable();
        const listing = listings.get(peer.id);
        if (listing === undefined) {
          throw portError('transfer.peer-lost', `${peer.id} is not advertising`);
        }
        const toListener = channel();
        const toCaller = channel();
        channels.add(toListener).add(toCaller);
        const caller: Peer = {
          id: memoryAddress((peerCount += 1)),
          code: peer.code,
          platform: settings.platform,
        };
        const listenerSide = link(caller, toCaller, toListener);
        const waiter = listing.waiters.shift();
        if (waiter === undefined) {
          listing.incoming.push(listenerSide);
        } else {
          waiter(listenerSide);
        }
        return link(peer, toListener, toCaller);
      },
      appPackage: async () =>
        typeof settings.appPackage === 'function' ? settings.appPackage() : settings.appPackage,
      install: async (path) => {
        if (!installer) {
          throw portError('transfer.unsupported', 'this build cannot open the package installer');
        }
        installs.push(path);
      },
      setInstaller: (allowed) => {
        installer = allowed && settings.platform === 'android';
      },
      installs: () => installs.slice(),
      setAvailable: (next) => {
        available = next;
      },
      expireWaits: () => {
        for (const id of own) {
          listings
            .get(id)
            ?.waiters.splice(0)
            .forEach((waiter) => waiter(undefined));
        }
      },
    };
    return self;
  }

  return {
    transport,
    cut,
    cutAfter: (bytes) => {
      cutAt = deliveredBytes + bytes;
    },
    tap: (listener) => {
      taps.add(listener);
      return () => {
        taps.delete(listener);
      };
    },
    delivered: () => deliveredBytes,
  };
}
