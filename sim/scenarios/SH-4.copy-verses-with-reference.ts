import assert from 'node:assert/strict';
import { locales } from '@lib/strings/locales';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'SH-4',
  'a verse or a range is copied to the clipboard with its reference where the reader chose, and its licence and attribution',
  async (world) => {
    const phone = world.device('phone', { localeGate: 'drafts' });
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    await services.languages.select('qaa');
    assert.ok((await services.home.completeDownload())?.ok);
    phone.adapters.http.setOnline(false);
    const { study } = services;

    const opened = await study.passage('RUT 1');
    assert.ok(opened.state === 'passage');
    const { passage } = opened.view;
    const { provenance } = passage.text;
    const verse = (number: number) => {
      const found = passage.text.verses.find((item) => item.verse === number);
      assert.ok(found, `Ruth 1:${String(number)} is in the fixture`);
      return found;
    };
    const attribution = `${provenance.title} by ${provenance.publisher}, ${provenance.tag}, ${provenance.licence}.`;

    assert.equal(
      study.copyReference(),
      'before-short',
      'the reference goes before the text, short, by default',
    );
    assert.deepEqual(
      study.copyReferences().map((choice) => [choice.key, choice.selected]),
      [
        ['before-short', true],
        ['before-full', false],
        ['after-short', false],
        ['after-full', false],
        ['none', false],
      ],
    );

    const one = await study.copy(passage, { from: { chapter: 1, verse: 16 }, to: { chapter: 1, verse: 16 } });
    assert.ok(one.ok);
    assert.equal(one.text, ['Rut 1:16', verse(16).text, attribution].join('\n'));
    assert.equal(
      phone.adapters.clipboard.text(),
      one.text,
      'what the reader sees is what the clipboard holds',
    );
    assert.equal(one.label, 'Copied Ruth 1:16.');

    assert.equal(await study.setCopyReference('after-full'), true);
    const range = await study.copy(passage, { from: { chapter: 1, verse: 4 }, to: { chapter: 1, verse: 2 } });
    assert.ok(range.ok);
    assert.equal(
      range.text,
      [`2 ${verse(2).text} 3 ${verse(3).text} 4 ${verse(4).text}`, 'Ruth 1:2-4', attribution].join('\n'),
      'a range is ordered, numbered, and its reference follows it in full',
    );

    await study.setCopyReference('none');
    const bare = await study.copy(passage, { from: { chapter: 1, verse: 1 }, to: { chapter: 1, verse: 1 } });
    assert.ok(bare.ok);
    assert.equal(
      bare.text,
      [verse(1).text, attribution].join('\n'),
      'no reference, and still the attribution',
    );

    await study.setCopyReference('before-full');
    await phone.restart();
    const again = servicesOf(phone).study;
    assert.equal(again.copyReference(), 'before-full', 'the chosen format is remembered across a restart');

    for (const locale of locales) {
      const copied = await phone.kernel.share.copy(
        passage,
        { from: { chapter: 1, verse: 16 }, to: { chapter: 1, verse: 16 } },
        { locale, reference: 'before-short' },
      );
      assert.ok(copied.ok, locale);
      for (const field of [provenance.title, provenance.publisher, provenance.tag, provenance.licence]) {
        assert.ok(copied.text.includes(field), `${locale}: copied text says ${field}`);
      }
    }

    const copies = phone.kernel.journal.read().filter((entry) => entry.type === 'VersesCopied');
    assert.deepEqual(
      copies.slice(0, 3).map((entry) => entry.payload),
      [
        { reference: 'RUT 1:16', language: 'qaa' },
        { reference: 'RUT 1:2-4', language: 'qaa' },
        { reference: 'RUT 1:1', language: 'qaa' },
      ],
      'the journal names the reference and language, never the text',
    );
    assert.equal(phone.kernel.telemetry.counts().sharesSent, 0, 'a copy is not counted as a share');

    phone.adapters.clipboard.failNext('clipboard.unavailable');
    const held = phone.adapters.clipboard.text();
    const mark = phone.kernel.journal.stats().lastSeq;
    const refused = await again.copy(passage, {
      from: { chapter: 1, verse: 3 },
      to: { chapter: 1, verse: 3 },
    });
    assert.deepEqual(refused, { ok: false, code: 'clipboard.unavailable' });
    assert.equal(phone.adapters.clipboard.text(), held, 'a refused copy leaves the clipboard as it was');
    assert.deepEqual(
      phone.kernel.journal.read(mark).map((entry) => [entry.type, entry.payload]),
      [['Failure', { code: 'clipboard.unavailable', context: { step: 'copy' } }]],
      'a refused copy is a failure with a code, and no copy is claimed',
    );
  },
);
