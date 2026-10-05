import assert from 'node:assert/strict';
import { languagePackId, originalPackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

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
    await installFromCatalog(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;
    assert.equal(
      corpus.summary('qaa').original,
      undefined,
      'the language pack carries no original-language text',
    );
    assert.equal(await corpus.passage(reference('RUT 1:16'), { language: 'hbo' }), undefined);

    await installFromCatalog(device, [originalPackId('hbo'), originalPackId('el-x-koine')]);
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

    const services = servicesOf(device);
    assert.ok(await services.languages.select('qaa'));
    const ruth = await services.study.passage('RUT 1:16');
    assert.deepEqual(
      ruth.state === 'passage' && ruth.view.choices,
      [
        { text: 'literal', label: 'Close to the original', selected: true },
        { text: 'simplified', label: 'Everyday words', selected: false },
        { text: 'original', label: 'Hebrew Old Testament', selected: false },
      ],
      'the original is a reading choice once its pack is on the phone',
    );
    const shown = await services.study.passage('RUT 1:16', { original: true });
    assert.ok(shown.state === 'passage');
    assert.equal(shown.view.reading, 'original');
    assert.equal(shown.view.original?.language, 'hbo');
    assert.equal(shown.view.original?.text.direction, 'rtl');
    assert.equal(shown.view.passage.language, 'qaa', 'the helps stay with the passage in the language');
    assert.deepEqual(
      shown.view.choices.map((choice) => [choice.text, choice.selected]),
      [
        ['literal', false],
        ['simplified', false],
        ['original', true],
      ],
    );
    const reopened = await services.study.open({ original: true });
    assert.equal(
      reopened.state === 'passage' && reopened.view.reading,
      'original',
      'opening Study at the last-read place keeps the original choice',
    );
    const letter = await services.study.passage('3JN 1');
    assert.equal(
      letter.state === 'passage' && letter.view.choices.at(-1)?.label,
      'Greek New Testament',
      'the New Testament offers the Greek',
    );

    await installFromCatalog(device, [languagePackId('qab')]);
    assert.ok(await services.languages.select('qab'));
    assert.deepEqual(
      await services.study.open(),
      {
        state: 'no-text',
        language: 'qab',
        originals: [
          { language: 'hbo', label: 'Hebrew Old Testament', reference: 'RUT 1' },
          { language: 'el-x-koine', label: 'Greek New Testament', reference: '3JN 1' },
        ],
      },
      'a language with no Bible text offers the originals on the phone',
    );
    const originalOnly = await services.study.passage('RUT 1', { original: true });
    assert.ok(originalOnly.state === 'original', 'the original reads where the language has no text');
    assert.equal(originalOnly.passage.language, 'hbo');
    assert.equal(originalOnly.reference, 'RUT 1');
    assert.equal(originalOnly.choice.label, 'Hebrew Old Testament');
    assert.equal((await services.study.passage('RUT 1')).state, 'missing');
  },
);
