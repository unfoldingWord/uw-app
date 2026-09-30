import { readTsv, type UnparsedTsvLine } from '../corpus/tsv';
import { fromUtf8, type BurritoFiles } from './files';

export type UnparsedTsv = { readonly path: string; readonly lines: readonly UnparsedTsvLine[] };

export function unparsedTsv(files: BurritoFiles): UnparsedTsv[] {
  return [...files].flatMap(([path, bytes]) => {
    if (!path.toLowerCase().endsWith('.tsv')) {
      return [];
    }
    const lines = readTsv(fromUtf8(bytes)).unparsed;
    return lines.length === 0 ? [] : [{ path, lines }];
  });
}

export function unparsedTsvMessage(found: readonly UnparsedTsv[]): string | undefined {
  if (found.length === 0) {
    return undefined;
  }
  const total = found.reduce((sum, file) => sum + file.lines.length, 0);
  const places = found.map(
    (file) =>
      `${file.path} lines ${file.lines.map((line) => `${line.line} (${line.columns} of ${line.expected} columns)`).join(', ')}`,
  );
  return `${total} TSV ${total === 1 ? 'line' : 'lines'} could not be read as a row: ${places.join('; ')}`;
}
