import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import type { Passage, Token, WordSpan } from '@lib/corpus/types';
import { installFixturePacks } from '../corpus-fixtures';
import { scenario } from '../scenario';

function reference(text: string): Reference {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    throw new Error(`${text} is not a reference`);
  }
  return parsed.reference;
}

function wordsAt(passage: Passage, spans: readonly WordSpan[]): string[] {
  return spans.flatMap((span) => {
    const verse = passage.text.verses.find(
      (item) => item.chapter === span.chapter && item.verse === span.verse,
    );
    const words = (verse?.tokens ?? []).filter(
      (token): token is Extract<Token, { kind: 'word' }> => token.kind === 'word',
    );
    return span.tokens.map((index) => words.find((word) => word.index === index)?.text ?? '?');
  });
}

export default scenario(
  'ST-2',
  'the passage view carries the text on top and its notes, word links and questions, with notes attached to the aligned words',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFixturePacks(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;

    const ruth = await corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.ok(ruth, 'Ruth 1:16 is in the qaa pack');
    assert.equal(ruth.reference, 'RUT 1:16');
    assert.equal(ruth.text.reading, 'literal');
    assert.equal(ruth.text.book, 'RUT');
    assert.equal(ruth.text.bookName, 'Ruth');
    assert.equal(ruth.text.verses.length, 1);
    assert.match(
      ruth.text.verses[0]?.text ?? '',
      /^Ruth said, "Do not urge me to leave you,.* your God my God\.$/,
    );
    assert.equal(ruth.text.provenance.resource, 'qaa_ult');
    assert.match(ruth.text.provenance.licence, /CC BY-SA 4\.0/);

    const idiom = ruth.notes.find((note) => note.id === 'r003');
    assert.ok(idiom, 'the Ruth 1:16 note is a help on the passage');
    assert.equal(idiom.reference, 'RUT 1:16');
    assert.deepEqual(wordsAt(ruth, idiom.words), ['your', 'God', 'my', 'God']);
    assert.deepEqual(idiom.support, { kind: 'article', id: 'ta/translate/figs-idiom' });
    assert.equal(idiom.provenance.resource, 'qaa_tn');
    assert.ok(
      !ruth.notes.some((note) => note.id === 'r002'),
      'a note on another verse stays off the passage',
    );

    assert.deepEqual(
      ruth.wordLinks.map((link) => [link.id, link.article, link.title, wordsAt(ruth, link.words).join(' ')]),
      [
        ['r103', 'tw/bible/names/ruth', 'Ruth', 'Ruth'],
        ['r104', 'tw/bible/kt/god', 'God', 'my God'],
      ],
    );
    assert.deepEqual(
      ruth.questions.map((question) => question.id),
      ['r202'],
    );

    const opening = await corpus.passage(reference('RUT 1:1-4'), { language: 'qaa' });
    assert.ok(opening);
    assert.deepEqual(
      opening.text.verses.map((verse) => verse.verse),
      [1, 2, 3, 4],
    );
    const bethlehem = opening.notes.find((note) => note.id === 'r002');
    assert.ok(bethlehem, 'a note on a verse with no alignment is still attached to the verse');
    assert.deepEqual(bethlehem.words, []);
    assert.ok(!opening.notes.some((note) => note.id === 'r001'), 'the book introduction is not a verse help');

    const letter = await corpus.passage(reference('3JN 1:1'), { language: 'qaa' });
    assert.ok(letter);
    const beloved = letter.notes.find((note) => note.id === 'j002');
    assert.ok(beloved);
    assert.deepEqual(wordsAt(letter, beloved.words), ['beloved']);

    const chapter = await corpus.passage(reference('RUT 1'), { language: 'qaa' });
    assert.equal(chapter?.text.verses.length, 5);
    assert.equal(await corpus.passage(reference('RUT 2:1'), { language: 'qaa' }), undefined);
    assert.equal(await corpus.passage(reference('GEN 1:1'), { language: 'qaa' }), undefined);

    const opened = device.kernel.journal.read().filter((entry) => entry.type === 'PassageOpened');
    assert.deepEqual(
      opened.map((entry) => entry.payload),
      [
        { reference: 'RUT 1:16', language: 'qaa' },
        { reference: 'RUT 1:1-4', language: 'qaa' },
        { reference: '3JN 1:1', language: 'qaa' },
        { reference: 'RUT 1', language: 'qaa' },
      ],
    );

    await device.restart();
    const again = await device.kernel.corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.deepEqual(again?.notes, ruth.notes, 'a restart rebuilds the corpus from its own tables');
  },
);
