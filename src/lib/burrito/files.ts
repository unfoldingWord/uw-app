import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { strFromU8, strToU8 } from 'fflate';

export type BurritoFiles = ReadonlyMap<string, Uint8Array>;

export const metadataPath = 'metadata.json';
export const ingredientsDirectory = 'ingredients/';

export function utf8(text: string): Uint8Array {
  return strToU8(text);
}

export function fromUtf8(bytes: Uint8Array): string {
  return strFromU8(bytes);
}

export function md5Hex(bytes: Uint8Array): string {
  return bytesToHex(md5(bytes));
}
