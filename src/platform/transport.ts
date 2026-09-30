import { File } from 'expo-file-system';
import { NativeModules } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import type { Advertisement, DevicePlatform, Peer, Transport, TransportLink } from '@lib/ports';
import { messageOf, portError } from './errors';
import { installNotPermitted, radioModule, type RadioModule, type RadioService } from './radio';
import { createStreamLink, type Duplex } from './stream-link';

type Socket = InstanceType<typeof TcpSocket.Socket>;

type Server = InstanceType<typeof TcpSocket.Server>;

const chunkBytes = 64 * 1024;

const serviceName = (code: string): string => `unfoldingWord ${code}`;

const codeShape = /^\d{4,8}$/;

const listenHost = '0.0.0.0';

export type TransportOptions = {
  platform: DevicePlatform;
  uriOf(path: string): string | undefined;
};

function unavailable(): never {
  throw portError('transfer.unavailable', 'the radio module is not in this build');
}

function bytesOf(data: unknown): Uint8Array | undefined {
  return data instanceof Uint8Array
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : undefined;
}

function duplexOf(socket: Socket): Duplex {
  return {
    write: (bytes) =>
      new Promise<void>((resolve, reject) => {
        socket.write(bytes, undefined, (error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        });
      }),
    onData: (listener) => {
      socket.on('data', (data) => {
        const bytes = bytesOf(data);
        if (bytes === undefined) {
          socket.destroy();
          return;
        }
        listener(bytes);
      });
    },
    onEnd: (listener) => {
      socket.on('close', listener);
      socket.on('error', listener);
    },
    pause: () => {
      socket.pause();
    },
    resume: () => {
      socket.resume();
    },
    destroy: () => {
      socket.destroy();
    },
  };
}

function splitAddress(address: string): { host: string; port: number } | undefined {
  const index = address.lastIndexOf(':');
  const host = address.slice(0, index).replace(/^\[|\]$/g, '');
  const port = Number(address.slice(index + 1));
  if (index <= 0 || host === '' || !Number.isInteger(port) || port <= 0 || port > 65_535) {
    return undefined;
  }
  return { host, port };
}

function joinAddress(host: string, port: number): string {
  return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`;
}

function peerOf(service: RadioService): Peer | undefined {
  const platform = service.platform;
  if ((platform !== 'ios' && platform !== 'android') || !codeShape.test(service.code)) {
    return undefined;
  }
  return { id: joinAddress(service.host, service.port), code: service.code, platform };
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', (error) => reject(portError('transfer.unavailable', messageOf(error))));
    server.listen({ port: 0, host: listenHost }, () => {
      const port = server.address()?.port;
      if (port === undefined) {
        reject(portError('transfer.unavailable', 'the listener has no port'));
        return;
      }
      resolve(port);
    });
  });
}

function socketsReady(): boolean {
  return (NativeModules as Record<string, unknown>).TcpSockets !== undefined;
}

async function addressFor(radio: RadioModule, port: number): Promise<string | undefined> {
  try {
    const host = await radio.localAddress();
    return host === null ? undefined : joinAddress(host, port);
  } catch {
    return undefined;
  }
}

async function advertiseWith(
  radio: RadioModule,
  platform: DevicePlatform,
  code: string,
): Promise<Advertisement> {
  const ready: TransportLink[] = [];
  const waiters: ((link: TransportLink | undefined) => void)[] = [];
  let stopped = false;
  const server = TcpSocket.createServer({ noDelay: true }, (socket) => {
    const remote = joinAddress(socket.remoteAddress ?? '', socket.remotePort ?? 0);
    const link = createStreamLink({ id: remote, code, platform }, duplexOf(socket), chunkBytes);
    if (stopped) {
      void link.close();
      return;
    }
    const waiter = waiters.shift();
    if (waiter === undefined) {
      ready.push(link);
    } else {
      waiter(link);
    }
  });

  let port: number;
  try {
    port = await listen(server);
  } catch (error) {
    server.close();
    throw error;
  }
  await radio.register(serviceName(code), port, code, platform).catch(() => undefined);
  const address = await addressFor(radio, port);

  return {
    code,
    address,
    accept: (timeoutMs) => {
      const next = ready.shift();
      if (next !== undefined || stopped) {
        return Promise.resolve(next);
      }
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          const index = waiters.indexOf(settle);
          if (index !== -1) {
            waiters.splice(index, 1);
          }
          resolve(undefined);
        }, timeoutMs);
        const settle = (link: TransportLink | undefined): void => {
          clearTimeout(timer);
          resolve(link);
        };
        waiters.push(settle);
      });
    },
    stop: async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      for (const waiter of waiters.splice(0)) {
        waiter(undefined);
      }
      await Promise.all(ready.splice(0).map((link) => link.close()));
      try {
        await radio.unregister();
      } finally {
        server.close();
      }
    },
  };
}

function connectTo(peer: Peer, timeoutMs: number): Promise<TransportLink> {
  const target = splitAddress(peer.id);
  if (target === undefined) {
    return Promise.reject(portError('transfer.peer-lost', 'the address is not host:port'));
  }
  return new Promise((resolve, reject) => {
    let connected = false;
    const socket = TcpSocket.createConnection(
      { host: target.host, port: target.port, connectTimeout: timeoutMs },
      () => {
        connected = true;
        socket.setNoDelay(true);
        resolve(createStreamLink(peer, duplexOf(socket), chunkBytes));
      },
    );
    socket.once('error', (error) => {
      if (!connected) {
        socket.destroy();
        reject(portError('transfer.peer-lost', messageOf(error)));
      }
    });
  });
}

function installFailure(error: unknown): Error {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return code === installNotPermitted
    ? portError('transfer.unsupported', messageOf(error))
    : portError('transfer.unavailable', messageOf(error));
}

export function createPlatformTransport(options: TransportOptions): Transport {
  const { platform } = options;
  const radio = radioModule();
  const own = new Set<string>();
  const required = (): RadioModule => (radio !== null && socketsReady() ? radio : unavailable());

  return {
    available: async () => radio !== null && socketsReady(),
    platform: () => platform,
    maxChunkBytes: () => chunkBytes,
    advertise: async (code) => {
      const advertisement = await advertiseWith(required(), platform, code);
      if (advertisement.address !== undefined) {
        own.add(advertisement.address);
      }
      return {
        ...advertisement,
        stop: async () => {
          if (advertisement.address !== undefined) {
            own.delete(advertisement.address);
          }
          await advertisement.stop();
        },
      };
    },
    discover: async (timeoutMs) => {
      const found = await required().browse(timeoutMs);
      const peers = found.flatMap((service) => {
        const peer = peerOf(service);
        return peer === undefined || own.has(peer.id) ? [] : [peer];
      });
      return [...new Map(peers.map((peer) => [peer.id, peer])).values()];
    },
    connect: (peer, timeoutMs) => {
      required();
      return connectTo(peer, timeoutMs);
    },
    appPackage: async () => {
      if (platform === 'ios' || radio === null) {
        return undefined;
      }
      const found = await radio.appPackage();
      return found === null ? undefined : { source: found.uri, bytes: found.bytes };
    },
    install: async (path) => {
      const uri = options.uriOf(path);
      if (platform === 'ios' || radio === null) {
        throw portError('transfer.unsupported', 'this phone does not install app packages');
      }
      if (uri === undefined) {
        throw portError('files.not-found', `${path} is not on this phone`);
      }
      try {
        await radio.install(new File(uri).contentUri);
      } catch (error) {
        throw installFailure(error);
      }
    },
  };
}
