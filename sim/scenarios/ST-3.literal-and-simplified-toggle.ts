import assert from 'node:assert/strict';
import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito } from '@lib/burrito/build';
import { utf8 } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { languagePackId, originalPackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { fromFile } from '@lib/packs/source';
import { importLocalBurrito } from '../burritos';
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

    for (const [publisher, resource, abbreviation] of [
      ['unfoldingWord', 'qae_t4t', 't4t'],
      ['Fixture-Press', 'qae_ust', 'ust'],
      ['unfoldingWord', 'qae_ust', 'ust'],
      ['unfoldingWord', 'qae_ult', 'ult'],
    ] as const) {
      const text = buildBurrito({
        publisher,
        resource,
        commit: 'c0ffee',
        dateCreated: '2026-09-01T00:00:00Z',
        generator: { softwareName: 'ST-3', softwareVersion: '1' },
        language: { tag: 'qae', name: { en: 'Fixture language E' } },
        name: { en: `${publisher} ${abbreviation}` },
        abbreviation: { en: abbreviation },
        flavorType: 'scripture',
        flavor: 'textTranslation',
        licence: { statement: 'Released under CC BY-SA 4.0', text: 'CC BY-SA 4.0' },
        ingredients: [
          {
            path: '08-RUT.usfm',
            bytes: utf8(`\\id RUT\n\\c 1\n\\v 16 Ruth spoke in the ${publisher} ${abbreviation}.`),
            mimeType: mimeTypes.usfm,
            scope: { RUT: ['1'] },
          },
        ],
      });
      const path = `imports/${publisher}-${resource}.zip`;
      await device.adapters.files.mkdir('imports');
      await device.adapters.files.writeBytes(
        path,
        writeArchive(text, { root: resource, mtime: new Date(2026, 8, 1) }),
      );
      const added = await device.kernel.packs.install(fromFile(path));
      assert.ok(added.ok, added.ok ? '' : added.code);
    }
    const byCode = await corpus.passage(parsed.reference, { language: 'qae' });
    assert.equal(byCode?.text.provenance.resource, 'qae_ult', 'the literal reading is the ult');
    const everyday = await corpus.passage(parsed.reference, { language: 'qae', text: 'simplified' });
    assert.equal(
      everyday?.text.verses[0]?.text,
      'Ruth spoke in the unfoldingWord ust.',
      'the simplified reading is the ust of the preferred publisher, never another simplified text or publisher',
    );
    assert.deepEqual(everyday?.availableTexts, ['literal', 'simplified']);

    const hebrew = await corpus.passage(parsed.reference, { language: 'hbo' });
    assert.equal(hebrew?.text.reading, 'original');
    assert.deepEqual(hebrew?.availableTexts, [], 'no toggle where neither reading exists');

    const literalOnly = buildBurrito({
      publisher: 'unfoldingWord',
      resource: 'qac_ult',
      commit: 'c0ffee',
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

    for (const [resource, abbreviation, verse] of [
      ['qad_rlob', 'rlob', 'Ruth said, Do not urge me.'],
      ['qad_rsob', 'rsob', 'But Ruth answered her.'],
    ] as const) {
      const outcome = await importLocalBurrito(device, {
        resource,
        language: 'qad',
        abbreviation,
        name: 'Texto',
        flavorType: 'scripture',
        flavor: 'textTranslation',
        ingredients: [
          {
            path: '08-RUT.usfm',
            bytes: utf8(`\\id RUT\n\\c 1\n\\v 16 ${verse}`),
            mimeType: mimeTypes.usfm,
            scope: { RUT: ['1'] },
          },
        ],
      });
      assert.ok(outcome.ok, outcome.ok ? '' : outcome.code);
    }
    const gateway = await corpus.passage(parsed.reference, { language: 'qad' });
    assert.deepEqual(
      gateway?.availableTexts,
      ['literal', 'simplified'],
      'the Russian gateway codes rlob and rsob',
    );
    assert.equal(gateway?.text.provenance.resource, 'qad_rlob');
    const gatewaySimplified = await corpus.passage(parsed.reference, { language: 'qad', text: 'simplified' });
    assert.equal(gatewaySimplified?.text.provenance.resource, 'qad_rsob');
  },
);
