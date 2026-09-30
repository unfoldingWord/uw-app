import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import type { Passage, Token, WordSpan } from '@lib/corpus/types';
import { utf8 } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { importLocalBurrito } from '../burritos';
import { installFromCatalog } from '../install';
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

const repeatedWords = String.raw`\id MAT
\c 1
\v 1 \zaln-s |x-occurrence="1" x-occurrences="2" x-content="καὶ"\*\w and|x-occurrence="1" x-occurrences="2"\w*\zaln-e\* \zaln-s |x-occurrence="1" x-occurrences="1" x-content="εἶπεν"\*\w said|x-occurrence="1" x-occurrences="1"\w*\zaln-e\* \zaln-s |x-occurrence="2" x-occurrences="2" x-content="καὶ"\*\w and|x-occurrence="2" x-occurrences="2"\w*\zaln-e\* \zaln-s |x-occurrence="1" x-occurrences="1" x-content="ἦλθεν"\*\w came|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*.`;

const psalmTitle = String.raw`\id PSA
\c 3
\d A psalm of David.
\q1
\v 1 Yahweh, how many are my foes!`;

const legacyNotes = [
  'Book\tChapter\tVerse\tID\tSupportReference\tOrigQuote\tOccurrence\tGLQuote\tOccurrenceNote',
  'MAT\tfront\tintro\tm000\t\t\t0\t\t# Matthew',
  'MAT\t1\t1\tm001\t\tκαὶ εἶπεν καὶ\t1\tand said and\tA repeated word.',
  'MAT\t1\t1\tm002\t\tκαὶ … καὶ\t1\tand and\tTwo parts.',
].join('\n');

export default scenario(
  'ST-2',
  'the passage view carries the text on top and its notes, word links and questions, with notes attached to the aligned words',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa')]);
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
    assert.deepEqual(
      opening.intros.map((intro) => [intro.id, intro.chapter ?? 'book']),
      [
        ['r001', 'book'],
        ['r004', 1],
      ],
      'a passage that opens the book carries its introduction, then the chapter introduction',
    );
    const chapterIntro = opening.intros.find((intro) => intro.id === 'r004');
    assert.equal(chapterIntro?.provenance.resource, 'qaa_tn');
    assert.deepEqual(
      chapterIntro?.blocks.flatMap((block) =>
        block.kind === 'paragraph'
          ? block.children.flatMap((inline) => (inline.kind === 'link' ? [inline.target] : []))
          : [],
      ),
      [{ kind: 'passage', reference: 'RUT 1:16' }],
      'a relative link in an introduction resolves against its book',
    );
    assert.deepEqual(ruth.intros, [], 'a passage inside a chapter carries no introduction');

    const letter = await corpus.passage(reference('3JN 1:1'), { language: 'qaa' });
    assert.ok(letter);
    const beloved = letter.notes.find((note) => note.id === 'j002');
    assert.ok(beloved);
    assert.deepEqual(wordsAt(letter, beloved.words), ['beloved']);

    const walking = await corpus.passage(reference('3JN 1:3'), { language: 'qaa' });
    assert.ok(walking);
    assert.deepEqual(
      walking.notes.map((note) => [note.id, wordsAt(walking, note.words).join(' ')]),
      [
        ['j003', 'walk in truth'],
        ['j004', 'brothers came'],
      ],
      'a quote in original order attaches where the target reorders its words',
    );

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
        { reference: '3JN 1:3', language: 'qaa' },
        { reference: 'RUT 1', language: 'qaa' },
      ],
    );

    await device.restart();
    const again = await device.kernel.corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.deepEqual(again?.notes, ruth.notes, 'a restart rebuilds the corpus from its own tables');

    const text = await importLocalBurrito(device, {
      resource: 'qaf_ult',
      language: 'qaf',
      abbreviation: 'ult',
      name: 'Literal text',
      flavorType: 'scripture',
      flavor: 'textTranslation',
      ingredients: [
        { path: '41-MAT.usfm', bytes: utf8(repeatedWords), mimeType: mimeTypes.usfm, scope: { MAT: ['1'] } },
        { path: '19-PSA.usfm', bytes: utf8(psalmTitle), mimeType: mimeTypes.usfm, scope: { PSA: ['3'] } },
      ],
    });
    assert.ok(text.ok, text.ok ? '' : text.code);
    const notes = await importLocalBurrito(device, {
      resource: 'qaf_tn',
      language: 'qaf',
      abbreviation: 'tn',
      name: 'Notes',
      flavorType: 'parascriptural',
      flavor: 'x-bcvnotes',
      ingredients: [
        { path: 'tn_MAT.tsv', bytes: utf8(legacyNotes), mimeType: mimeTypes.tsv, scope: { MAT: [] } },
      ],
    });
    assert.ok(notes.ok, notes.ok ? '' : notes.code);
    const matthew = await device.kernel.corpus.passage(reference('MAT 1:1'), { language: 'qaf' });
    assert.ok(matthew);
    assert.deepEqual(
      matthew.notes.map((note) => [note.id, wordsAt(matthew, note.words).join(' ')]),
      [
        ['m001', 'and said and'],
        ['m002', 'and and'],
      ],
      'a quote that repeats a word attaches to each of its words, from nine-column notes',
    );
    assert.equal(device.kernel.corpus.summary('qaf').notes?.items, 3, 'the count is of the rows read');
    const psalm = await device.kernel.corpus.passage(reference('PSA 3:1'), { language: 'qaf' });
    assert.deepEqual(psalm?.text.titles, [{ chapter: 3, text: 'A psalm of David.' }]);
    assert.equal(psalm?.text.verses[0]?.text, 'Yahweh, how many are my foes!');
  },
);
