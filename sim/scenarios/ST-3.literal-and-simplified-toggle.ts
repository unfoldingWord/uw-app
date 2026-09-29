import assert from 'node:assert/strict';
import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito } from '@lib/burrito/build';
import { utf8 } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { languagePackId, originalPackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { fromFile } from '@lib/packs/source';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';

export default scenario(
  'ST-3',
  'the passage offers the literal and the simplified text when both exist, and only what exists otherwise',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa'), originalPackId('hbo')]);
    const corpus = device.kernel.corpus;
    const parsed = parseReference('Ruth 1:16');
    assert.ok(parsed.ok);

    const literal = await corpus.passage(parsed.reference, { language: 'qaa' });
    assert.deepEqual(literal?.availableTexts, ['literal', 'simplified']);
    assert.equal(literal?.text.reading, 'literal');

    const simplified = await corpus.passage(parsed.reference, { language: 'qaa', text: 'simplified' });
    assert.ok(simplified);
    assert.equal(simplified.text.reading, 'simplified');
    assert.equal(simplified.text.provenance.resource, 'qaa_ust');
    assert.match(simplified.text.verses[0]?.text ?? '', /^But Ruth answered,/);
    assert.deepEqual(simplified.availableTexts, ['literal', 'simplified']);
    assert.deepEqual(
      simplified.notes.map((note) => note.id),
      literal?.notes.map((note) => note.id),
      'the helps stay with the passage when the text changes',
    );

    const hebrew = await corpus.passage(parsed.reference, { language: 'hbo' });
    assert.equal(hebrew?.text.reading, 'original');
    assert.deepEqual(hebrew?.availableTexts, [], 'no toggle where neither reading exists');

    const literalOnly = buildBurrito({
      publisher: 'unfoldingWord',
      resource: 'qac_ult',
      tag: 'v1',
      commit: 'c0ffee',
      released: '2026-09-01T00:00:00Z',
      dateCreated: '2026-09-01T00:00:00Z',
      generator: { softwareName: 'ST-3', softwareVersion: '1' },
      language: { tag: 'qac', name: { en: 'Fixture language C' } },
      name: { en: 'Literal text only' },
      abbreviation: { en: 'ult' },
      flavorType: 'scripture',
      flavor: 'textTranslation',
      licence: { statement: 'Released under CC BY-SA 4.0', text: 'CC BY-SA 4.0' },
      ingredients: [
        {
          path: '08-RUT.usfm',
          bytes: utf8(String.raw`\id RUT
\c 1
\v 16 Ruth answered.`),
          mimeType: mimeTypes.usfm,
          scope: { RUT: ['1'] },
        },
      ],
    });
    await device.adapters.files.mkdir('imports');
    await device.adapters.files.writeBytes(
      'imports/qac_ult.zip',
      writeArchive(literalOnly, { root: 'qac_ult', mtime: new Date(2026, 8, 1) }),
    );
    const imported = await device.kernel.packs.install(fromFile('imports/qac_ult.zip'));
    assert.ok(imported.ok, imported.ok ? '' : imported.code);
    assert.equal(imported.pack.pack, languagePackId('qac'));
    const single = await corpus.passage(parsed.reference, { language: 'qac' });
    assert.equal(single?.text.reading, 'literal');
    assert.equal(single?.text.verses[0]?.text, 'Ruth answered.');
    assert.deepEqual(single?.availableTexts, [], 'no toggle when only one reading exists');
    assert.equal(await corpus.passage(parsed.reference, { language: 'qac', text: 'simplified' }), undefined);
  },
);
