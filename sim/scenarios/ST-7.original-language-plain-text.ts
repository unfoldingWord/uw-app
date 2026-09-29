import assert from 'node:assert/strict';
import { languagePackId, originalPackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import { installFixturePacks } from '../corpus-fixtures';
import { scenario } from '../scenario';

function reference(text: string): Reference {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    throw new Error(`${text} is not a reference`);
  }
  return parsed.reference;
}

export default scenario(
  'ST-7',
  'the Hebrew and Greek texts install outside any language pack and read as plain text, right to left where written so',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFixturePacks(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;
    assert.equal(
      corpus.summary('qaa').original,
      undefined,
      'the language pack carries no original-language text',
    );
    assert.equal(await corpus.passage(reference('RUT 1:16'), { language: 'hbo' }), undefined);

    await installFixturePacks(device, [originalPackId('hbo'), originalPackId('el-x-koine')]);
    const hebrew = await corpus.passage(reference('RUT 1:16'), { language: 'hbo' });
    assert.ok(hebrew);
    assert.equal(hebrew.text.reading, 'original');
    assert.equal(hebrew.text.direction, 'rtl');
    assert.equal(
      hebrew.text.verses[0]?.text,
      'וַתֹּאמֶר רוּת אַל־תִּפְגְּעִי־בִי לְעָזְבֵךְ לָשׁוּב מֵאַחֲרָיִךְ כִּי אֶל־אֲשֶׁר תֵּלְכִי אֵלֵךְ וּבַאֲשֶׁר תָּלִינִי אָלִין עַמֵּךְ עַמִּי וֵאלֹהַיִךְ אֱלֹהָי׃',
    );
    assert.ok(
      hebrew.text.verses[0]?.tokens.every((token) => token.kind === 'text' || token.original.length === 0),
      'plain text: no alignment',
    );
    assert.equal(hebrew.text.provenance.resource, 'hbo_uhb');

    const greek = await corpus.passage(reference('3JN 1:1-2'), { language: 'el-x-koine' });
    assert.ok(greek);
    assert.equal(greek.text.direction, 'ltr');
    assert.equal(greek.text.verses[0]?.text, 'Ὁ πρεσβύτερος Γαΐῳ τῷ ἀγαπητῷ, ὃν ἐγὼ ἀγαπῶ ἐν ἀληθείᾳ.');
    assert.equal(greek.text.verses.length, 2);
    assert.deepEqual(corpus.summary('hbo'), {
      original: { burritos: 1, items: 1, publishers: ['unfoldingWord'] },
    });
  },
);
