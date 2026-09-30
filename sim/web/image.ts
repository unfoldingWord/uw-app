import type { DeviceLocale, DevicePlatform } from '@lib/ports';
import type { LocaleGate } from '@lib/strings/locales';

export type ImageRoute = {
  readonly url: string;
  readonly status?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly redirect?: string;
  readonly body: string;
};

export type ImageFile = { readonly path: string; readonly body: string };

export type DeviceImage = {
  readonly variant: string;
  readonly at: number;
  readonly platform: DevicePlatform;
  readonly locale: DeviceLocale;
  readonly directories: readonly string[];
  readonly files: readonly ImageFile[];
  readonly kv: Readonly<Record<string, string>>;
  readonly db: string;
  readonly routes: readonly ImageRoute[];
};

export const imageVariants = ['fresh', 'fresh-rtl', 'home', 'reduced-blur', 'rtl', 'ur', 'hi'] as const;

export type ImageVariant = (typeof imageVariants)[number];

export const harnessLocaleGate: LocaleGate = 'drafts';

export const imagePath = (variant: string): string => `qa/images/${variant}.json`;

export const sqlWasmPath = 'qa/sql-wasm-browser.wasm';

export function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let offset = 0; offset < bytes.byteLength; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
}

export function decodeBytes(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
