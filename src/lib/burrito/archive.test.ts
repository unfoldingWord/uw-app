import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { readArchive, writeArchive } from './archive';
import { utf8 } from './files';

const mtime = 315619200000;

const burrito = new Map<string, Uint8Array>([
  ['metadata.json', utf8('{}')],
  ['ingredients/08-RUT.usfm', utf8('\\id RUT\n')],
  ['ingredients/LICENSE.md', utf8('CC BY-SA 4.0\n')],
]);

const repositoryFiles = new Map<string, Uint8Array>([
  ['README.md', utf8('# qaa_ult\n')],
  ['.gitignore', utf8('.DS_Store\n')],
  ['.github/workflows/release.yml', utf8('name: release\n')],
]);

describe('readArchive', () => {
  it('strips the top-level repository directory and discards files outside the burrito', () => {
    const bytes = writeArchive(new Map([...burrito, ...repositoryFiles]), { root: 'qaa_ult', mtime });
    const read = readArchive(bytes);
    expect(read.ok && read.root).toBe('qaa_ult');
    expect(read.ok && [...read.files.keys()]).toEqual([
      'ingredients/08-RUT.usfm',
      'ingredients/LICENSE.md',
      'metadata.json',
    ]);
    expect(read.ok && read.discarded).toEqual([
      'qaa_ult/.github/workflows/release.yml',
      'qaa_ult/.gitignore',
      'qaa_ult/README.md',
    ]);
  });

  it('reads a burrito written at the archive root, as a transfer writes it', () => {
    const read = readArchive(writeArchive(burrito, { mtime }));
    expect(read.ok && read.root).toBe('');
    expect(read.ok && read.files.size).toBe(3);
  });

  it('round-trips the bytes of every burrito file', () => {
    const read = readArchive(writeArchive(burrito, { root: 'qaa_ult', mtime }));
    expect(read.ok && Object.fromEntries(read.files)).toEqual(Object.fromEntries(burrito));
  });

  it('refuses bytes that are not a zip', () => {
    const read = readArchive(utf8('not a zip'));
    expect(!read.ok && read.rule).toBe('archive-unreadable');
  });

  it('refuses an archive without metadata.json', () => {
    const read = readArchive(zipSync({ 'qaa_ult/README.md': utf8('# qaa_ult\n') }));
    expect(!read.ok && read.rule).toBe('metadata-missing');
  });

  it('refuses an archive with two candidate burritos', () => {
    const read = readArchive(zipSync({ 'a/metadata.json': utf8('{}'), 'b/metadata.json': utf8('{}') }));
    expect(!read.ok && read.rule).toBe('metadata-missing');
  });

  it('refuses a path that climbs out of the archive', () => {
    const read = readArchive(zipSync({ 'metadata.json': utf8('{}'), '../escape.txt': utf8('x') }));
    expect(!read.ok && read.rule).toBe('archive-path');
  });
});

describe('writeArchive', () => {
  it('writes the same bytes for the same files in any insertion order', () => {
    const reversed = new Map([...burrito].reverse());
    expect(writeArchive(reversed, { root: 'qaa_ult', mtime })).toEqual(
      writeArchive(burrito, { root: 'qaa_ult', mtime }),
    );
  });

  it('writes entries in sorted order under the root', () => {
    expect(Object.keys(unzipSync(writeArchive(burrito, { root: 'qaa_ult', mtime })))).toEqual([
      'qaa_ult/ingredients/08-RUT.usfm',
      'qaa_ult/ingredients/LICENSE.md',
      'qaa_ult/metadata.json',
    ]);
  });
});
