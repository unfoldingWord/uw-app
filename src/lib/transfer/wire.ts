import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { FailureCode } from '../domain/failures';
import type { TransportLink } from '../ports';
import { decodeFrame, framesFor, type Decoded, type Message, type MessageKind } from './protocol';

export class TransferStop extends Error {
  constructor(
    readonly failure: FailureCode,
    readonly local: boolean,
  ) {
    super(failure);
  }
}

export type Wire = {
  send(message: Message): Promise<void>;
  expect<K extends MessageKind>(kind: K): Promise<Extract<Message, { kind: K }>>;
  next(): Promise<Message>;
  drain(): Promise<FailureCode | undefined>;
  close(): Promise<void>;
};

function stopFor(message: Message): TransferStop {
  switch (message.kind) {
    case 'cancel':
      return new TransferStop('transfer.cancelled', false);
    case 'error':
      return new TransferStop(message.code, false);
    default:
      return new TransferStop('transfer.unsupported', true);
  }
}

function joined(parts: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

const maximumMessageBytes = 4 * 1024 * 1024;

export function createWire(link: TransportLink, maxChunkBytes: number): Wire {
  async function frame(): Promise<Decoded | undefined> {
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const bytes = await link.receive();
      if (bytes === undefined) {
        return undefined;
      }
      const decoded = decodeFrame(bytes);
      if (!decoded.ok || decoded.message.kind !== 'part') {
        return parts.length === 0 ? decoded : { ok: false, reason: 'malformed' };
      }
      parts.push(decoded.message.body);
      size += decoded.message.body.byteLength;
      if (size > maximumMessageBytes) {
        return { ok: false, reason: 'malformed' };
      }
      if (decoded.message.last) {
        const whole = decodeFrame(joined(parts));
        return whole.ok && whole.message.kind === 'part' ? { ok: false, reason: 'malformed' } : whole;
      }
    }
  }

  async function next(): Promise<Message> {
    const decoded = await frame();
    if (decoded === undefined) {
      throw new TransferStop('transfer.peer-lost', false);
    }
    if (!decoded.ok) {
      throw new TransferStop('transfer.unsupported', true);
    }
    return decoded.message;
  }

  async function expect<K extends MessageKind>(kind: K): Promise<Extract<Message, { kind: K }>> {
    const message = await next();
    if (message.kind !== kind) {
      throw stopFor(message);
    }
    return message as Extract<Message, { kind: K }>;
  }

  async function drain(): Promise<FailureCode | undefined> {
    for (;;) {
      const decoded = await frame();
      if (decoded === undefined) {
        return undefined;
      }
      if (decoded.ok && (decoded.message.kind === 'cancel' || decoded.message.kind === 'error')) {
        return stopFor(decoded.message).failure;
      }
    }
  }

  return {
    send: async (message) => {
      for (const bytes of framesFor(message, maxChunkBytes)) {
        await link.send(bytes);
      }
    },
    expect,
    next,
    drain,
    close: () => link.close(),
  };
}

export type Digest = { update(bytes: Uint8Array): void; hex(): string };

export function createDigest(): Digest {
  const hash = md5.create();
  return {
    update: (bytes) => {
      hash.update(bytes);
    },
    hex: () => bytesToHex(hash.digest()),
  };
}

const reportedSteps = 10;

export function crossesStep(before: number, after: number, total: number): boolean {
  if (total <= 0) {
    return false;
  }
  return Math.floor((after * reportedSteps) / total) > Math.floor((before * reportedSteps) / total);
}
