import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { utf8 } from '@lib/burrito/files';
import { unpackArchive } from '@lib/burrito/unpack';
import { createMemoryFiles } from './adapters/files';

const archive = zipSync({
  'en_tw/LICENSE.md': utf8('repository licence\n'),
  'en_tw/README.md': utf8('# en_tw\n'),
  'en_tw/.github/workflows/release.yml': utf8('name: release\n'),
  'en_tw/metadata.json': utf8('{}'),
  'en_tw/ingredients/LICENSE.md': utf8('CC BY-SA 4.0\n'),
  'en_tw/ingredients/bible/kt/god.md': utf8('# God\n'),
});

async function filesWithArchive() {
  const files = createMemoryFiles();
  await files.mkdir('stage');
  await files.writeBytes('stage/en_tw.zip', archive);
  return files;
}

describe('unpackArchive (LA-2)', () => {
  it('keeps the burrito, drops the repository files around it, and reads the licence from ingredients', async () => {
    const files = await filesWithArchive();
    const unpacked = await unpackArchive(files, 'stage/en_tw.zip', { into: 'stage/out' });
    expect(unpacked.ok, unpacked.ok ? '' : `${unpacked.rule} ${unpacked.path}`).toBe(true);
    if (!unpacked.ok) {
      return;
    }
    expect(unpacked.directory).toBe('stage/out/en_tw');
    expect([...unpacked.written].sort()).toEqual([
      'ingredients/LICENSE.md',
      'ingredients/bible/kt/god.md',
      'metadata.json',
    ]);
    expect(unpacked.facts.text('ingredients/LICENSE.md')).toBe('CC BY-SA 4.0\n');
    expect(unpacked.facts.fact('ingredients/bible/kt/god.md')).toEqual({ size: 6 });
    expect(await files.exists('stage/out/en_tw/README.md')).toBe(false);
    expect(await files.exists('stage/out/en_tw/.github')).toBe(false);
  });

  it('peeks at metadata and the licence without writing anything', async () => {
    const files = await filesWithArchive();
    const peeked = await unpackArchive(files, 'stage/en_tw.zip');
    expect(peeked.ok).toBe(true);
    if (peeked.ok) {
      expect(peeked.facts.text('ingredients/LICENSE.md')).toBe('CC BY-SA 4.0\n');
      expect(peeked.written).toEqual([]);
    }
    expect(await files.list('stage')).toEqual([
      { name: 'en_tw.zip', kind: 'file', bytes: archive.byteLength },
    ]);
  });
});
