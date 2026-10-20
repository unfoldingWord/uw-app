import { Unzip, UnzipInflate } from 'fflate';
import { md5Hex } from '@lib/burrito/files';
import type { CatalogRelease } from '@lib/catalog/types';
import { languagesOf } from '@lib/catalog/languages';
import { helpsRowCount, noteRows } from '@lib/corpus/tsv';
import { parseUsfm } from '@lib/corpus/usfm';

type BenchInput = {
  readonly usfm: string;
  readonly tsv: string;
  readonly zip: string;
  readonly releases: readonly CatalogRelease[];
};

declare const perfInput: BenchInput;
declare const print: ((line: string) => void) | undefined;

const emit = (line: string): void => {
  if (typeof print === 'function') {
    print(line);
  } else {
    console.log(line);
  }
};

function fromBase64(text: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(128);
  for (let index = 0; index < alphabet.length; index += 1) {
    lookup[alphabet.charCodeAt(index)] = index;
  }
  const clean = text.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let at = 0;
  for (let index = 0; index < clean.length; index += 1) {
    value = (value << 6) | (lookup[clean.charCodeAt(index)] ?? 0);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at] = (value >> bits) & 0xff;
      at += 1;
    }
  }
  return out;
}

function time(label: string, runs: number, work: () => unknown): void {
  const started = Date.now();
  for (let run = 0; run < runs; run += 1) {
    work();
  }
  emit(`${label}\t${((Date.now() - started) / runs).toFixed(1)}`);
}

const zip = fromBase64(perfInput.zip);
const unpacked: Uint8Array[] = [];
time('inflate archive', 1, () => {
  const unzip = new Unzip((file) => {
    file.ondata = (_error, chunk) => {
      unpacked.push(chunk);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < zip.length; offset += 65536) {
    unzip.push(zip.subarray(offset, offset + 65536), offset + 65536 >= zip.length);
  }
});
const unpackedBytes = unpacked.reduce((sum, chunk) => sum + chunk.length, 0);
emit(`unpacked bytes\t${unpackedBytes}`);
time('md5 unpacked', 1, () => unpacked.map((chunk) => md5Hex(chunk)));
time('parseUsfm one book', 3, () => parseUsfm(perfInput.usfm));
time('noteRows one book', 3, () => noteRows(perfInput.tsv));
time('helpsRowCount one book', 3, () => helpsRowCount(perfInput.tsv));
time('languagesOf catalog', 5, () => languagesOf(perfInput.releases, new Set(['qaa'])));
