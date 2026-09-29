import { describe, expect, it } from 'vitest';
import { utf8 } from '../burrito/files';
import {
  chunkBodyBytes,
  decodeFrame,
  encodeFrame,
  frameHeaderReserve,
  framesFor,
  protocolVersion,
  type Message,
} from './protocol';

const messages: Message[] = [
  { kind: 'hello', platform: 'ios' },
  {
    kind: 'offer',
    offer: {
      language: 'qaa',
      resources: [
        {
          publisher: 'unfoldingWord',
          resource: 'qaa_ult',
          language: 'qaa',
          tag: 'v1',
          row: 'text',
          title: 'Fixture Literal Text',
          bytes: 1200,
        },
      ],
      app: { bytes: 99 },
    },
  },
  { kind: 'offer', offer: { language: undefined, resources: [], app: { bytes: 5 } } },
  { kind: 'accept', resources: [{ publisher: 'unfoldingWord', resource: 'qaa_ult' }], app: false },
  {
    kind: 'plan',
    items: [
      { key: 'unfoldingWord/qaa_ult', bytes: 3 },
      { key: 'app', bytes: 5 },
    ],
  },
  { kind: 'chunk', item: 1, seq: 7, body: Uint8Array.from([0, 1, 2, 255]) },
  { kind: 'done', item: 1, md5: 'd41d8cd98f00b204e9800998ecf8427e' },
  { kind: 'received' },
  { kind: 'cancel' },
  { kind: 'error', code: 'pack.checksum-mismatch' },
];

function frame(header: unknown, body: Uint8Array = new Uint8Array(0)): Uint8Array {
  const text = utf8(JSON.stringify(header));
  const bytes = new Uint8Array(4 + text.byteLength + body.byteLength);
  new DataView(bytes.buffer).setUint32(0, text.byteLength);
  bytes.set(text, 4);
  bytes.set(body, 4 + text.byteLength);
  return bytes;
}

describe('transfer protocol', () => {
  it('round-trips every message as a JSON header and a binary body', () => {
    for (const message of messages) {
      expect(decodeFrame(encodeFrame(message))).toEqual({ ok: true, message });
    }
  });

  it('carries a chunk body as raw bytes, not base64', () => {
    const body = new Uint8Array(3000).fill(9);
    const encoded = encodeFrame({ kind: 'chunk', item: 0, seq: 0, body });
    expect(encoded.byteLength - body.byteLength).toBeLessThan(64);
  });

  it('keeps a full chunk inside the link limit', () => {
    const limit = 4096;
    const body = new Uint8Array(chunkBodyBytes(limit));
    const encoded = encodeFrame({ kind: 'chunk', item: 63, seq: 9_999_999, body });
    expect(encoded.byteLength).toBeLessThanOrEqual(limit);
    expect(chunkBodyBytes(limit)).toBe(limit - frameHeaderReserve);
  });

  it('splits a message larger than the link limit into parts that rejoin to the same frame', () => {
    const offer: Message = {
      kind: 'offer',
      offer: {
        language: 'qaa',
        resources: Array.from({ length: 12 }, (_, index) => ({
          publisher: 'unfoldingWord',
          resource: `qaa_r${index}`,
          language: 'qaa',
          tag: 'v1',
          row: 'notes' as const,
          title: `A resource with a long enough title to fill a frame ${index}`,
          bytes: index,
        })),
        app: undefined,
      },
    };
    const whole = encodeFrame(offer);
    const parts = framesFor(offer, 512);
    expect(parts.length).toBeGreaterThan(1);
    const bodies: Uint8Array[] = [];
    for (const [index, part] of parts.entries()) {
      expect(part.byteLength).toBeLessThanOrEqual(512);
      const decoded = decodeFrame(part);
      expect(decoded.ok && decoded.message.kind === 'part' && decoded.message.last).toBe(
        index === parts.length - 1,
      );
      if (decoded.ok && decoded.message.kind === 'part') {
        bodies.push(decoded.message.body);
      }
    }
    const rejoined = new Uint8Array(bodies.reduce((sum, body) => sum + body.byteLength, 0));
    let offset = 0;
    for (const body of bodies) {
      rejoined.set(body, offset);
      offset += body.byteLength;
    }
    expect(rejoined).toEqual(whole);
    expect(framesFor(offer, 64 * 1024)).toEqual([whole]);
  });

  it('names a peer speaking another version apart from a broken frame', () => {
    expect(decodeFrame(frame({ v: protocolVersion + 1, kind: 'hello', platform: 'ios' }))).toEqual({
      ok: false,
      reason: 'version',
      version: protocolVersion + 1,
    });
    for (const broken of [
      new Uint8Array([0, 0]),
      new Uint8Array([0, 0, 0, 200, 1]),
      frame('text'),
      frame({ kind: 'hello', platform: 'ios' }),
      frame({ v: 1, kind: 'hello', platform: 'windows' }),
      frame({ v: 1, kind: 'shout' }),
      frame({ v: 1, kind: 'done', item: 0, md5: 'not-a-digest' }),
      frame({ v: 1, kind: 'error', code: 'made.up' }),
      frame({ v: 1, kind: 'chunk', item: -1, seq: 0 }),
      frame({ v: 1, kind: 'accept', resources: [{ publisher: 'a b', resource: 'x' }], app: false }),
      frame({ v: 1, kind: 'offer', offer: { language: 'qaa', resources: [{ publisher: 'p' }], app: null } }),
      frame({ v: 1, kind: 'offer', offer: { language: 'qaa', resources: [], app: { bytes: -1 } } }),
      frame({ v: 1, kind: 'plan', items: [{ key: 'k' }] }),
    ]) {
      expect(decodeFrame(broken)).toEqual({ ok: false, reason: 'malformed' });
    }
  });
});
