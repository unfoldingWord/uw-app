import { describe, expect, it } from 'vitest';
import type { Peer } from '@lib/ports';
import {
  createFrameReader,
  createStreamLink,
  framed,
  pauseAboveBytes,
  resumeBelowBytes,
  type Duplex,
} from './stream-link';

type FakeDuplex = Duplex & {
  feed(bytes: Uint8Array): void;
  hangUp(): void;
  written(): Uint8Array[];
  paused(): boolean;
  destroyed(): boolean;
  failWrites(): void;
};

function fakeDuplex(): FakeDuplex {
  let data: ((bytes: Uint8Array) => void) | undefined;
  let ended: (() => void) | undefined;
  const writes: Uint8Array[] = [];
  let isPaused = false;
  let isDestroyed = false;
  let failing = false;
  return {
    write: async (bytes) => {
      if (failing) {
        throw new Error('socket closed');
      }
      writes.push(bytes);
    },
    onData: (listener) => {
      data = listener;
    },
    onEnd: (listener) => {
      ended = listener;
    },
    pause: () => {
      isPaused = true;
    },
    resume: () => {
      isPaused = false;
    },
    destroy: () => {
      isDestroyed = true;
    },
    feed: (bytes) => data?.(bytes),
    hangUp: () => ended?.(),
    written: () => writes,
    paused: () => isPaused,
    destroyed: () => isDestroyed,
    failWrites: () => {
      failing = true;
    },
  };
}

const peer: Peer = { id: '192.0.2.7:47000', code: '0427', platform: 'android' };

function codeOf(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

describe('the length-prefixed stream link under the Transport platform adapter', () => {
  it('rejoins frames however the stream splits them', () => {
    const frames = [
      Uint8Array.of(1, 2, 3),
      new Uint8Array(0),
      Uint8Array.from({ length: 700 }, (_, i) => i % 7),
    ];
    const stream = concat(frames.map(framed));
    for (const size of [1, 2, 3, 5, 64, stream.byteLength]) {
      const reader = createFrameReader(1024);
      const seen: Uint8Array[] = [];
      for (let offset = 0; offset < stream.byteLength; offset += size) {
        seen.push(...(reader.push(stream.subarray(offset, offset + size)) ?? []));
      }
      expect(seen).toEqual(frames);
    }
    expect(createFrameReader(8).push(framed(new Uint8Array(9)))).toBeUndefined();
  });

  it('sends each chunk as one frame and receives in order, then ends when the peer hangs up', async () => {
    const duplex = fakeDuplex();
    const link = createStreamLink(peer, duplex, 1024);
    await link.send(Uint8Array.of(9, 8));
    expect(duplex.written()).toEqual([framed(Uint8Array.of(9, 8))]);
    const waiting = link.receive();
    duplex.feed(concat([framed(Uint8Array.of(1)), framed(Uint8Array.of(2))]));
    expect(await waiting).toEqual(Uint8Array.of(1));
    duplex.hangUp();
    expect(await link.receive()).toEqual(Uint8Array.of(2));
    expect(await link.receive()).toBeUndefined();
    expect(codeOf(await link.send(Uint8Array.of(1)).catch((error: unknown) => error))).toBe(
      'transfer.peer-lost',
    );
    expect(duplex.destroyed()).toBe(true);
  });

  it('refuses a chunk over the limit, ends on an oversized frame, and turns a failed write into peer-lost', async () => {
    const duplex = fakeDuplex();
    const link = createStreamLink(peer, duplex, 16);
    expect(codeOf(await link.send(new Uint8Array(17)).catch((error: unknown) => error))).toBe(
      'transfer.unsupported',
    );
    duplex.feed(framed(new Uint8Array(17)));
    expect(await link.receive()).toBeUndefined();

    const broken = fakeDuplex();
    const other = createStreamLink(peer, broken, 16);
    broken.failWrites();
    expect(codeOf(await other.send(Uint8Array.of(1)).catch((error: unknown) => error))).toBe(
      'transfer.peer-lost',
    );
    expect(broken.destroyed()).toBe(true);
  });

  it('pauses the socket while unread frames pile up and resumes once they are read', async () => {
    const duplex = fakeDuplex();
    const chunk = 64 * 1024;
    const link = createStreamLink(peer, duplex, chunk);
    const count = Math.ceil(pauseAboveBytes / chunk) + 1;
    for (let index = 0; index < count; index += 1) {
      duplex.feed(framed(new Uint8Array(chunk)));
    }
    expect(duplex.paused()).toBe(true);
    const keep = Math.floor(resumeBelowBytes / chunk) - 1;
    for (let index = 0; index < count - keep; index += 1) {
      await link.receive();
    }
    expect(duplex.paused()).toBe(false);
  });
});
