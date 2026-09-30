import { encode } from 'uqr';

export type QrMatrix = readonly (readonly boolean[])[];

export type TypedEntry = { readonly address: string; readonly code: string };

const addressShape = /^[^\s:/?#]+:\d{1,5}$/;

const codeShape = /^\d{6}$/;

const transferLinkBase = 'unfoldingword://transfer';

export function typedEntryOf(address: string, code: string): TypedEntry | undefined {
  const entry = { address: address.trim(), code: code.trim() };
  return addressShape.test(entry.address) && codeShape.test(entry.code) ? entry : undefined;
}

export function transferLink(entry: TypedEntry): string {
  const address = encodeURIComponent(entry.address);
  return `${transferLinkBase}?address=${address}&code=${encodeURIComponent(entry.code)}`;
}

export function qrPathOf(matrix: QrMatrix): string {
  return matrix.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join('');
}

export function qrMatrixOf(text: string): QrMatrix {
  return encode(text, { ecc: 'M', border: 0 }).data;
}
