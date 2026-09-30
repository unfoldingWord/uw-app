import { fromUtf8, utf8 } from '../burrito/files';
import { isFailureCode, type FailureCode } from '../domain/failures';
import { fieldValidators } from '../domain/fields';
import { resourceRows, type ResourceRow } from '../domain/pack';
import type { DevicePlatform } from '../ports';

export const protocolVersion = 1;

export const frameHeaderReserve = 256;

const lengthBytes = 4;

export type WireResource = {
  publisher: string;
  resource: string;
  language: string;
  tag: string;
  commit?: string;
  row: ResourceRow;
  title: string;
  bytes: number;
};

export type WireOffer = {
  language: string | undefined;
  resources: readonly WireResource[];
  app: { bytes: number } | undefined;
};

export type WireChoice = { publisher: string; resource: string };

export type PlanItem = { key: string; bytes: number };

export const appItemKey = 'app';

export type Message =
  | { kind: 'hello'; platform: DevicePlatform; code?: string }
  | { kind: 'offer'; offer: WireOffer }
  | { kind: 'accept'; resources: readonly WireChoice[]; app: boolean }
  | { kind: 'plan'; items: readonly PlanItem[] }
  | { kind: 'chunk'; item: number; seq: number; body: Uint8Array }
  | { kind: 'part'; last: boolean; body: Uint8Array }
  | { kind: 'done'; item: number; md5: string }
  | { kind: 'received' }
  | { kind: 'cancel' }
  | { kind: 'error'; code: FailureCode };

export type MessageKind = Message['kind'];

type Header = Readonly<Record<string, unknown>>;

function headerOf(message: Message): Header {
  switch (message.kind) {
    case 'chunk':
      return { kind: message.kind, item: message.item, seq: message.seq };
    case 'part':
      return { kind: message.kind, last: message.last };
    case 'offer':
      return {
        kind: message.kind,
        offer: {
          language: message.offer.language ?? null,
          resources: message.offer.resources,
          app: message.offer.app ?? null,
        },
      };
    default:
      return message;
  }
}

export function encodeFrame(message: Message): Uint8Array {
  const header = utf8(JSON.stringify({ v: protocolVersion, ...headerOf(message) }));
  const body = message.kind === 'chunk' || message.kind === 'part' ? message.body : new Uint8Array(0);
  const frame = new Uint8Array(lengthBytes + header.byteLength + body.byteLength);
  new DataView(frame.buffer).setUint32(0, header.byteLength);
  frame.set(header, lengthBytes);
  frame.set(body, lengthBytes + header.byteLength);
  return frame;
}

export function chunkBodyBytes(maxChunkBytes: number): number {
  return maxChunkBytes - frameHeaderReserve;
}

export function framesFor(message: Message, maxChunkBytes: number): Uint8Array[] {
  const whole = encodeFrame(message);
  if (whole.byteLength <= maxChunkBytes) {
    return [whole];
  }
  const size = chunkBodyBytes(maxChunkBytes);
  const frames: Uint8Array[] = [];
  for (let offset = 0; offset < whole.byteLength; offset += size) {
    const body = whole.subarray(offset, offset + size);
    frames.push(encodeFrame({ kind: 'part', last: offset + size >= whole.byteLength, body }));
  }
  return frames;
}

function isRecord(value: unknown): value is Header {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isPlatform(value: unknown): value is DevicePlatform {
  return value === 'ios' || value === 'android';
}

const md5Shape = /^[0-9a-f]{32}$/;

function choiceOf(value: unknown): WireChoice | undefined {
  if (!isRecord(value) || !fieldValidators.publisher(value.publisher)) {
    return undefined;
  }
  if (!fieldValidators.resource(value.resource)) {
    return undefined;
  }
  return { publisher: value.publisher as string, resource: value.resource as string };
}

function resourceOf(value: unknown): WireResource | undefined {
  const choice = choiceOf(value);
  if (choice === undefined || !isRecord(value)) {
    return undefined;
  }
  const row = resourceRows.find((item) => item === value.row);
  const valid =
    fieldValidators.language(value.language) &&
    fieldValidators.tag(value.tag) &&
    typeof value.title === 'string' &&
    isCount(value.bytes);
  if (row === undefined || !valid || (value.commit !== undefined && !fieldValidators.token(value.commit))) {
    return undefined;
  }
  const resource: WireResource = {
    ...choice,
    language: value.language as string,
    tag: value.tag as string,
    row,
    title: value.title as string,
    bytes: value.bytes as number,
  };
  return typeof value.commit === 'string' ? { ...resource, commit: value.commit } : resource;
}

function listOf<T>(value: unknown, item: (entry: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items: T[] = [];
  for (const entry of value) {
    const parsed = item(entry);
    if (parsed === undefined) {
      return undefined;
    }
    items.push(parsed);
  }
  return items;
}

function offerOf(value: unknown): WireOffer | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const resources = listOf(value.resources, resourceOf);
  const language = value.language === null ? undefined : value.language;
  const app = value.app;
  const appBytes = isRecord(app) && isCount(app.bytes) ? { bytes: app.bytes } : undefined;
  if (resources === undefined || (language !== undefined && !fieldValidators.language(language))) {
    return undefined;
  }
  if (app !== null && appBytes === undefined) {
    return undefined;
  }
  return { language: language as string | undefined, resources, app: appBytes };
}

function planItemOf(value: unknown): PlanItem | undefined {
  if (!isRecord(value) || typeof value.key !== 'string' || !isCount(value.bytes)) {
    return undefined;
  }
  return { key: value.key, bytes: value.bytes };
}

const pairingCodeShape = /^\d{4,8}$/;

function helloOf(header: Header): Message | undefined {
  if (!isPlatform(header.platform)) {
    return undefined;
  }
  if (header.code === undefined) {
    return { kind: 'hello', platform: header.platform };
  }
  return typeof header.code === 'string' && pairingCodeShape.test(header.code)
    ? { kind: 'hello', platform: header.platform, code: header.code }
    : undefined;
}

function messageOf(header: Header, body: Uint8Array): Message | undefined {
  switch (header.kind) {
    case 'hello':
      return helloOf(header);
    case 'offer': {
      const offer = offerOf(header.offer);
      return offer === undefined ? undefined : { kind: 'offer', offer };
    }
    case 'accept': {
      const resources = listOf(header.resources, choiceOf);
      return resources === undefined || typeof header.app !== 'boolean'
        ? undefined
        : { kind: 'accept', resources, app: header.app };
    }
    case 'plan': {
      const items = listOf(header.items, planItemOf);
      return items === undefined ? undefined : { kind: 'plan', items };
    }
    case 'chunk':
      return isCount(header.item) && isCount(header.seq)
        ? { kind: 'chunk', item: header.item, seq: header.seq, body }
        : undefined;
    case 'part':
      return typeof header.last === 'boolean' ? { kind: 'part', last: header.last, body } : undefined;
    case 'done':
      return isCount(header.item) && typeof header.md5 === 'string' && md5Shape.test(header.md5)
        ? { kind: 'done', item: header.item, md5: header.md5 }
        : undefined;
    case 'received':
      return { kind: 'received' };
    case 'cancel':
      return { kind: 'cancel' };
    case 'error':
      return isFailureCode(header.code) ? { kind: 'error', code: header.code } : undefined;
    default:
      return undefined;
  }
}

export type Decoded =
  { ok: true; message: Message } | { ok: false; reason: 'malformed' | 'version'; version?: number };

export function decodeFrame(frame: Uint8Array): Decoded {
  if (frame.byteLength < lengthBytes) {
    return { ok: false, reason: 'malformed' };
  }
  const headerLength = new DataView(frame.buffer, frame.byteOffset, frame.byteLength).getUint32(0);
  if (lengthBytes + headerLength > frame.byteLength) {
    return { ok: false, reason: 'malformed' };
  }
  let header: unknown;
  try {
    header = JSON.parse(fromUtf8(frame.subarray(lengthBytes, lengthBytes + headerLength)));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!isRecord(header)) {
    return { ok: false, reason: 'malformed' };
  }
  if (header.v !== protocolVersion) {
    return isCount(header.v)
      ? { ok: false, reason: 'version', version: header.v }
      : { ok: false, reason: 'malformed' };
  }
  const message = messageOf(header, frame.slice(lengthBytes + headerLength));
  return message === undefined ? { ok: false, reason: 'malformed' } : { ok: true, message };
}
