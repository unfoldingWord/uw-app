import { describe, expect, it } from 'vitest';
import type { Token } from './types';
import { parseUsfm } from './usfm';

function words(tokens: readonly Token[]): string[] {
  return tokens.flatMap((token) => (token.kind === 'word' ? [token.text] : []));
}

const aligned = String.raw`\id TIT EN_ULT en_English_ltr
\usfm 3.0
\h Titus
\toc1 The Letter of Paul to Titus
\toc2 Titus
\toc3 Tit
\mt Titus

\s5
\c 1
\p
\v 1 \zaln-s |x-strong="G39720" x-lemma="Παῦλος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="Παῦλος"\*\w Paul|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*,
\zaln-s |x-strong="G14010" x-lemma="δοῦλος" x-occurrence="1" x-occurrences="1" x-content="δοῦλος"\*\zaln-s |x-strong="G23160" x-lemma="θεός" x-occurrence="1" x-occurrences="1" x-content="Θεοῦ"\*\w a|x-occurrence="1" x-occurrences="1"\w*
\w servant|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*
\w of|x-occurrence="1" x-occurrences="1"\w*
\w God|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*\f + \ft A footnote that is not text.\f*.
\ts\*
\v 2-3 \add In\add* the hope of \nd eternal\nd* life.
\q1 A poetic line
\c 2
\p
\v 1 Speak what fits.`;

describe('parseUsfm', () => {
  it('reads the book code and its names', () => {
    const book = parseUsfm(aligned);
    expect(book.code).toBe('TIT');
    expect(book.name).toBe('Titus');
    expect(book.names).toEqual(['Titus', 'The Letter of Paul to Titus', 'Tit']);
  });

  it('keeps each word with the original words it is aligned to, nested alignment included', () => {
    const [first] = parseUsfm(aligned).chapters.get(1) ?? [];
    expect(first?.text).toBe('Paul, a servant of God.');
    const tokens = (first?.tokens ?? []).filter((token) => token.kind === 'word');
    expect(
      tokens.map((token) => [token.index, token.text, token.original.map((word) => word.content)]),
    ).toEqual([
      [0, 'Paul', ['Παῦλος']],
      [1, 'a', ['δοῦλος', 'Θεοῦ']],
      [2, 'servant', ['δοῦλος', 'Θεοῦ']],
      [3, 'of', ['δοῦλος']],
      [4, 'God', ['δοῦλος']],
    ]);
    expect(tokens[0]?.original[0]).toEqual({
      content: 'Παῦλος',
      lemma: 'Παῦλος',
      strong: 'G39720',
      occurrence: 1,
      occurrences: 1,
    });
  });

  it('drops footnotes, milestones and character markers, and keeps a verse bridge', () => {
    const verses = parseUsfm(aligned).chapters.get(1) ?? [];
    expect(verses.map((verse) => [verse.verse, verse.through, verse.text])).toEqual([
      [1, undefined, 'Paul, a servant of God.'],
      [2, 3, 'In the hope of eternal life. A poetic line'],
    ]);
  });

  it('splits plain text into words with no alignment and starts each chapter afresh', () => {
    const book = parseUsfm(aligned);
    const [second] = book.chapters.get(2) ?? [];
    expect(second?.text).toBe('Speak what fits.');
    expect(words(second?.tokens ?? [])).toEqual(['Speak', 'what', 'fits']);
    expect(second?.tokens.every((token) => token.kind === 'text' || token.original.length === 0)).toBe(true);
  });

  it('passes right-to-left text and original-language word markers through unchanged', () => {
    const hebrew = parseUsfm(
      String.raw`\id RUT
\h רות
\c 1
\p
\v 16 \w וַתֹּאמֶר|lemma="אָמַר" strong="c:H0559" x-morph="He,C:Vqw3fs"\w* \w רוּת|lemma="רוּת" strong="H7327"\w*׃`,
    );
    const [verse] = hebrew.chapters.get(1) ?? [];
    expect(hebrew.name).toBe('רות');
    expect(verse?.text).toBe('וַתֹּאמֶר רוּת׃');
    expect(words(verse?.tokens ?? [])).toEqual(['וַתֹּאמֶר', 'רוּת']);
  });

  it('reads Windows line endings and a book with no verses', () => {
    expect(parseUsfm('\\id JUD\r\n\\h Jude\r\n').chapters.size).toBe(0);
    expect(parseUsfm('\\id JUD\r\n\\c 1\r\n\\v 1 Jude.\r\n').chapters.get(1)?.[0]?.text).toBe('Jude.');
  });

  it('keeps a psalm title as the chapter title and drops figures, alternate and published numbers', () => {
    const psalm = parseUsfm(
      String.raw`\id PSA
\c 3
\d A psalm of David, when he fled from Absalom his son.
\q1
\v 1 Yahweh, how many are my foes!
\v 2 \fig A picture|src="x.jpg" size="col"\fig* Many say \va 3\va* of my soul.
\v 3 \vp 3b\vp* But you \ca 4\ca* are a shield.`,
    );
    expect(psalm.titles.get(3)).toBe('A psalm of David, when he fled from Absalom his son.');
    expect((psalm.chapters.get(3) ?? []).map((verse) => verse.text)).toEqual([
      'Yahweh, how many are my foes!',
      'Many say of my soul.',
      'But you are a shield.',
    ]);
  });

  it('keeps a title that closes a chapter inside the last verse', () => {
    const habakkuk = parseUsfm(
      String.raw`\id HAB
\c 3
\v 19 He makes my feet like a deer.
\d For the music director, on my stringed instruments.`,
    );
    expect(habakkuk.titles.size).toBe(0);
    expect(habakkuk.chapters.get(3)?.[0]?.text).toBe(
      'He makes my feet like a deer. For the music director, on my stringed instruments.',
    );
  });

  describe('the heads captured from real releases (CI run 36618141715)', () => {
    const ult = String.raw`\id 1CO EN_ULT en_English_ltr Wed Dec 14 2022 15:04:37 GMT-0500 (Eastern Standard Time) tc
\usfm 3.0
\ide UTF-8
\h 1 Corinthians
\toc1 The First Letter of Paul to the Corinthians
\toc2 First Corinthians
\toc3 1Co
\mt1 First Corinthians

\ts\*
\c 1
\p
\v 1 \zaln-s |x-strong="G39720" x-lemma="Παῦλος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="Παῦλος"\*\w Paul|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*,
\zaln-s |x-strong="G28220" x-lemma="κλητός" x-morph="Gr,NS,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="κλητὸς"\*\w called|x-occurrence="1" x-occurrences="1"\w*\zaln-e\* {\zaln-s |x-strong="G06520" x-lemma="ἀπόστολος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="ἀπόστολος"\*\w to|x-occurrence="1" x-occurrences="1"\w*
\w be|x-occurrence="1" x-occurrences="1"\w*}
\w an|x-occurrence="1" x-occurrences="1"\w*
\w apostle|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*`;

    it('reads an aligned gateway text with chunk markers and implied words in braces', () => {
      const book = parseUsfm(ult);
      expect(book.code).toBe('1CO');
      expect(book.names).toEqual([
        'First Corinthians',
        '1 Corinthians',
        'The First Letter of Paul to the Corinthians',
        '1Co',
      ]);
      const [first] = book.chapters.get(1) ?? [];
      expect(first?.text).toBe('Paul, called {to be} an apostle');
      const aligned = (first?.tokens ?? []).flatMap((token) =>
        token.kind === 'word' ? [[token.text, token.original.map((word) => word.content).join('+')]] : [],
      );
      expect(aligned).toEqual([
        ['Paul', 'Παῦλος'],
        ['called', 'κλητὸς'],
        ['to', 'ἀπόστολος'],
        ['be', 'ἀπόστολος'],
        ['an', 'ἀπόστολος'],
        ['apostle', 'ἀπόστολος'],
      ]);
    });

    it('reads two alignments opened together and closed together', () => {
      const [verse] =
        parseUsfm(String.raw`\id 3JN ES-419_GST es-419_Español⋅Latin⋅America_ltr
\cl Capítulo 1
\mt2 (Simple)
\c 1
\p
\v 1 \zaln-s |x-strong="G35880" x-lemma="ὁ" x-occurrence="1" x-occurrences="1" x-content="Ὁ"\*\zaln-s |x-strong="G42450" x-lemma="πρεσβύτερος" x-occurrence="1" x-occurrences="1" x-content="πρεσβύτερος"\*\w El|x-occurrence="1" x-occurrences="1"\w*
\w anciano|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*\zaln-e\*.`).chapters.get(1) ?? [];
      expect(verse?.text).toBe('El anciano.');
      expect(
        (verse?.tokens ?? []).flatMap((token) =>
          token.kind === 'word' ? [token.original.map((word) => word.content)] : [],
        ),
      ).toEqual([
        ['Ὁ', 'πρεσβύτερος'],
        ['Ὁ', 'πρεσβύτερος'],
      ]);
    });

    it('reads original-language words with unprefixed lemma and strong, prefixes and word joiners kept', () => {
      const book = parseUsfm(String.raw`\id 1CH unfoldingWord® Hebrew Bible
\usfm 3.0
\ide UTF-8
\h 1 Chronicles
\toc1 The First Book of the Chronicles
\toc2 First Chronicles
\toc3 1Ch
\mt First Chronicles

\c 1
\p

\v 1
\w אָדָ֥ם|lemma="אָדָם" strong="H0121" x-morph="He,Np"\w*
\w וָ⁠יָֽפֶת|lemma="יֶפֶת" strong="c:H3315" x-morph="He,C:Np"\w*׃ס`);
      const [verse] = book.chapters.get(1) ?? [];
      expect(verse?.text).toBe('אָדָ֥ם וָ⁠יָֽפֶת׃ס');
      expect(verse?.text).not.toContain('lemma');
      const words = (verse?.tokens ?? []).flatMap((token) => (token.kind === 'word' ? [token.text] : []));
      expect(words.slice(0, 2)).toEqual(['אָדָ֥ם', 'וָ⁠יָֽפֶת']);
    });

    it('finds no verses in front matter or in a stub book', () => {
      const front = parseUsfm('\\id FRT EN_ULT\n\\usfm 3.0\n\\is Introduction\n\\ip This is front matter.\n');
      expect(front.code).toBe('FRT');
      expect(front.chapters.size).toBe(0);
      const stub = parseUsfm('\\id NEH ES-419_TPL\n\\usfm 3.0\n\\ide UTF-8\n\\h Nehemías\n\\mt Nehemías\n');
      expect(stub.chapters.size).toBe(0);
      expect(stub.name).toBe('Nehemías');
    });
  });
});
