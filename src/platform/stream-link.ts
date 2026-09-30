import type { Peer, TransportLink } from '@lib/ports';
import { portError } from './errors';

export type Duplex = {
  write(bytes: Uint8Array): Promise<void>;
  onData(listener: (bytes: Uint8Array) => void): void;
  onEnd(listener: () => void): void;
  pause(): void;
  resume(): void;
  destroy(): void;
};

const lengthPrefixBytes = 4;

export const pauseAboveBytes = 4 * 1024 * 1024;

export const resumeBelowBytes = 1024 * 1024;

export function framed(chunk: Uint8Array): Uint8Array {
  const frame = new Uint8Array(lengthPrefixBytes + chunk.byteLength);
  new DataView(frame.buffer).setUint32(0, chunk.byteLength);
  frame.set(chunk, lengthPrefixBytes);
  return frame;
}

type FrameReader = {
  push(bytes: Uint8Array): Uint8Array[] | undefined;
};

export function createFrameReader(maxFrameBytes: number): FrameReader {
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;

  function take(count: number): Uint8Array {
    const out = new Uint8Array(count);
    let offset = 0;
    while (offset < count) {
      const head = pending[0];
      if (head === undefined) {
        break;
      }
      const used = Math.min(head.byteLength, count - offset);
      out.set(head.subarray(0, used), offset);
      offset += used;
      if (used === head.byteLength) {
        pending.shift();
      } else {
        pending[0] = head.subarray(used);
      }
    }
    pendingBytes -= count;
    return out;
  }

  function peekLength(): number {
    const head = new Uint8Array(lengthPrefixBytes);
    let offset = 0;
    for (const part of pending) {
      const used = Math.min(part.byteLength, lengthPrefixBytes - offset);
      head.set(part.subarray(0, used), offset);
      offset += used;
      if (offset === lengthPrefixBytes) {
        break;
      }
    }
    return new DataView(head.buffer).getUint32(0);
  }

  return {
    push(bytes) {
      pending.push(bytes);
      pendingBytes += bytes.byteLength;
      const frames: Uint8Array[] = [];
      while (pendingBytes >= lengthPrefixBytes) {
        const length = peekLength();
        if (length > maxFrameBytes) {
          return undefined;
        }
        if (pendingBytes < lengthPrefixBytes + length) {
          break;
        }
        take(lengthPrefixBytes);
        frames.push(take(length));
      }
      return frames;
    },
  };
}

export function createStreamLink(peer: Peer, duplex: Duplex, maxChunkBytes: number): TransportLink {
  const reader = createFrameReader(maxChunkBytes);
  const inbox: Uint8Array[] = [];
  const waiters: ((chunk: Uint8Array | undefined) => void)[] = [];
  let queuedBytes = 0;
  let paused = false;
  let ended = false;

  function end(): void {
    if (ended) {
      return;
    }
    ended = true;
    duplex.destroy();
    for (const waiter of waiters.splice(0)) {
      waiter(undefined);
    }
  }

  function deliver(frame: Uint8Array): void {
    const waiter = waiters.shift();
    if (waiter !== undefined) {
      waiter(frame);
      return;
    }
    inbox.push(frame);
    queuedBytes += frame.byteLength;
    if (!paused && queuedBytes > pauseAboveBytes) {
      paused = true;
      duplex.pause();
    }
  }

  duplex.onData((bytes) => {
    if (ended) {
      return;
    }
    const frames = reader.push(bytes);
    if (frames === undefined) {
      end();
      return;
    }
    frames.forEach(deliver);
  });
  duplex.onEnd(end);

  return {
    peer,
    send: async (chunk) => {
      if (ended) {
        throw portError('transfer.peer-lost', 'the link is closed');
      }
      if (chunk.byteLength > maxChunkBytes) {
        throw portError('transfer.unsupported', `chunk of ${chunk.byteLength} bytes is over the limit`);
      }
      try {
        await duplex.write(framed(chunk));
      } catch (error) {
        end();
        throw portError('transfer.peer-lost', error instanceof Error ? error.message : 'write failed');
      }
    },
    receive: () => {
      const next = inbox.shift();
      if (next !== undefined) {
        queuedBytes -= next.byteLength;
        if (paused && queuedBytes < resumeBelowBytes) {
          paused = false;
          duplex.resume();
        }
        return Promise.resolve(next);
      }
      if (ended) {
        return Promise.resolve(undefined);
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    close: async () => {
      end();
    },
  };
}
