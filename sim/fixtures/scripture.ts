type SourceWord = { readonly content: string; readonly lemma: string; readonly strong: string };

type VersePart =
  | {
      readonly kind: 'aligned';
      readonly source: SourceWord;
      readonly target: string;
      readonly after?: string;
    }
  | { readonly kind: 'plain'; readonly text: string };

type Verse = { readonly number: number; readonly parts: readonly VersePart[] };

export type Book = {
  readonly code: string;
  readonly title: string;
  readonly short: string;
  readonly chapter: number;
  readonly verses: readonly Verse[];
};

const wordPattern = /[\p{L}\p{M}'’-]+/gu;

const plain = (text: string): VersePart => ({ kind: 'plain', text });
const aligned = (source: SourceWord, target: string, after?: string): VersePart =>
  after === undefined ? { kind: 'aligned', source, target } : { kind: 'aligned', source, target, after };

function countOccurrences(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function wordsOf(part: VersePart): string[] {
  return (part.kind === 'plain' ? part.text : part.target).match(wordPattern) ?? [];
}

function verseUsfm(verse: Verse): string {
  const targetTotals = countOccurrences(verse.parts.flatMap(wordsOf));
  const sourceTotals = countOccurrences(
    verse.parts.flatMap((part) => (part.kind === 'aligned' ? [part.source.content] : [])),
  );
  const targetSeen = new Map<string, number>();
  const sourceSeen = new Map<string, number>();
  const next = (seen: Map<string, number>, value: string): number => {
    const count = (seen.get(value) ?? 0) + 1;
    seen.set(value, count);
    return count;
  };
  const pieces = verse.parts.map((part) => {
    if (part.kind === 'plain') {
      for (const word of wordsOf(part)) {
        next(targetSeen, word);
      }
      return part.text;
    }
    const { content, lemma, strong } = part.source;
    const sourceOccurrence = next(sourceSeen, content);
    const opening = `\\zaln-s |x-strong="${strong}" x-lemma="${lemma}" x-occurrence="${sourceOccurrence}" x-occurrences="${sourceTotals.get(content) ?? 1}" x-content="${content}"\\*`;
    const words = wordsOf(part)
      .map(
        (word) =>
          `\\w ${word}|x-occurrence="${next(targetSeen, word)}" x-occurrences="${targetTotals.get(word) ?? 1}"\\w*`,
      )
      .join(' ');
    return `${opening}${words}\\zaln-e\\*${part.after ?? ''}`;
  });
  return `\\v ${verse.number} ${pieces.join(' ')}`;
}

function headerLines(
  book: Pick<Book, 'code' | 'title' | 'short'>,
  resource: string,
  language: string,
): string[] {
  return [
    `\\id ${book.code} ${language.toUpperCase()}_${resource.toUpperCase()} ${language}_Fixture_ltr tc`,
    '\\usfm 3.0',
    '\\ide UTF-8',
    `\\h ${book.title}`,
    `\\toc1 The Book of ${book.title}`,
    `\\toc2 ${book.title}`,
    `\\toc3 ${book.short}`,
    `\\mt1 ${book.title}`,
    '',
  ];
}

export function bookUsfm(book: Book, resource: string, language: string): string {
  return [
    ...headerLines(book, resource, language),
    '\\ts\\*',
    `\\c ${book.chapter}`,
    '\\p',
    ...book.verses.map(verseUsfm),
    '',
  ].join('\n');
}

export function frontMatterUsfm(resource: string, language: string): string {
  return [
    `\\id FRT ${language.toUpperCase()}_${resource.toUpperCase()} ${language}_Fixture_ltr tc`,
    '\\usfm 3.0',
    '\\ide UTF-8',
    '\\h Front Matter',
    '\\mt1 Front Matter',
    '\\is Introduction',
    '\\ip This fixture text is front matter, not a book of the Bible.',
    '',
  ].join('\n');
}

export function stubBookUsfm(code: string, title: string, resource: string, language: string): string {
  return [...headerLines({ code, title, short: title.slice(0, 3) }, resource, language)].join('\n');
}

const originalWordPattern = /[\p{L}\p{M}\u2060]+/gu;

function originalSources(): Map<string, SourceWord> {
  return new Map(
    [...Object.values(ruthHebrew), ...Object.values(johnGreek)].map((word) => [word.content, word]),
  );
}

function originalVerse(verse: Verse, hebrew: boolean): string {
  const known = originalSources();
  const text = verse.parts.map((part) => (part.kind === 'plain' ? part.text : part.target)).join(' ');
  const marked = text.replace(originalWordPattern, (word) => {
    const source = known.get(word);
    const lemma = source?.lemma ?? word;
    const strong = source?.strong ?? (hebrew ? 'H0000' : 'G00000');
    const morph = hebrew ? 'He,Ncmsa' : 'Gr,N,,,,,NMS,';
    return `\\w ${word}|lemma="${lemma}" strong="${strong}" x-morph="${morph}"\\w*`;
  });
  return `\\v ${verse.number}\n${marked}`;
}

export function originalUsfm(book: Book, resource: string, language: string): string {
  const hebrew = language === 'hbo';
  return [
    `\\id ${book.code} unfoldingWord® ${hebrew ? 'Hebrew Bible' : 'Greek New Testament'}`,
    ...headerLines(book, resource, language).slice(1),
    `\\c ${book.chapter}`,
    '\\p',
    '',
    ...book.verses.map((verse) => originalVerse(verse, hebrew)),
    '',
  ].join('\n');
}

const ruthHebrew = {
  ruth: { content: 'רוּת', lemma: 'רוּת', strong: 'H7327' },
  said: { content: 'וַתֹּאמֶר', lemma: 'אָמַר', strong: 'c:H0559' },
  yourGod: { content: 'וֵאלֹהַיִךְ', lemma: 'אֱלֹהִים', strong: 'c:H0430' },
  myGod: { content: 'אֱלֹהָי', lemma: 'אֱלֹהִים', strong: 'H0430' },
} as const;

const johnGreek = {
  the: { content: 'Ὁ', lemma: 'ὁ', strong: 'G35880' },
  elder: { content: 'πρεσβύτερος', lemma: 'πρεσβύτερος', strong: 'G42450' },
  gaius: { content: 'Γαΐῳ', lemma: 'Γάϊος', strong: 'G10500' },
  theDative: { content: 'τῷ', lemma: 'ὁ', strong: 'G35880' },
  beloved: { content: 'ἀγαπητῷ', lemma: 'ἀγαπητός', strong: 'G00270' },
  whom: { content: 'ὃν', lemma: 'ὅς', strong: 'G37390' },
  i: { content: 'ἐγὼ', lemma: 'ἐγώ', strong: 'G14730' },
  love: { content: 'ἀγαπῶ', lemma: 'ἀγαπάω', strong: 'G00250' },
  in: { content: 'ἐν', lemma: 'ἐν', strong: 'G17220' },
  truth: { content: 'ἀληθείᾳ', lemma: 'ἀλήθεια', strong: 'G02250' },
  for: { content: 'γὰρ', lemma: 'γάρ', strong: 'G10630' },
  rejoiced: { content: 'ἐχάρην', lemma: 'χαίρω', strong: 'G54630' },
  greatly: { content: 'λίαν', lemma: 'λίαν', strong: 'G30290' },
  coming: { content: 'ἐρχομένων', lemma: 'ἔρχομαι', strong: 'G20640' },
  brothers: { content: 'ἀδελφῶν', lemma: 'ἀδελφός', strong: 'G00800' },
  and: { content: 'καὶ', lemma: 'καί', strong: 'G25320' },
  testifying: { content: 'μαρτυρούντων', lemma: 'μαρτυρέω', strong: 'G31400' },
  your: { content: 'σου', lemma: 'σύ', strong: 'G47710' },
  justAs: { content: 'καθὼς', lemma: 'καθώς', strong: 'G25310' },
  you: { content: 'σὺ', lemma: 'σύ', strong: 'G47710' },
  walk: { content: 'περιπατεῖς', lemma: 'περιπατέω', strong: 'G40430' },
} as const;

export const literalBooks: readonly Book[] = [
  {
    code: 'RUT',
    title: 'Ruth',
    short: 'Rut',
    chapter: 1,
    verses: [
      {
        number: 1,
        parts: [
          plain(
            'In the days when the judges judged, there was a famine in the land. A certain man of Bethlehem Judah went to live in the country of Moab with his wife and his two sons.',
          ),
        ],
      },
      {
        number: 2,
        parts: [
          plain(
            'The name of the man was Elimelech, and the name of his wife Naomi. The names of his two sons were Mahlon and Chilion, Ephrathites of Bethlehem Judah. They came into the country of Moab and lived there.',
          ),
        ],
      },
      {
        number: 3,
        parts: [plain("Elimelech, Naomi's husband, died; and she was left with her two sons.")],
      },
      {
        number: 4,
        parts: [
          plain(
            'They took for themselves wives of the women of Moab. The name of the one was Orpah, and the name of the other was Ruth. They lived there about ten years.',
          ),
        ],
      },
      {
        number: 16,
        parts: [
          aligned(ruthHebrew.ruth, 'Ruth'),
          aligned(ruthHebrew.said, 'said', ','),
          plain(
            '"Do not urge me to leave you, for where you go, I will go; and where you stay, I will stay. Your people will be my people, and',
          ),
          aligned(ruthHebrew.yourGod, 'your God'),
          aligned(ruthHebrew.myGod, 'my God', '.'),
        ],
      },
    ],
  },
  {
    code: '3JN',
    title: '3 John',
    short: '3Jn',
    chapter: 1,
    verses: [
      {
        number: 1,
        parts: [
          aligned(johnGreek.the, 'The'),
          aligned(johnGreek.elder, 'elder'),
          aligned(johnGreek.gaius, 'to Gaius'),
          aligned(johnGreek.theDative, 'the'),
          aligned(johnGreek.beloved, 'beloved', ','),
          aligned(johnGreek.whom, 'whom'),
          aligned(johnGreek.i, 'I'),
          aligned(johnGreek.love, 'love'),
          aligned(johnGreek.in, 'in'),
          aligned(johnGreek.truth, 'truth', '.'),
        ],
      },
      {
        number: 2,
        parts: [
          plain(
            'Beloved, I pray that you may prosper in all things and be healthy, even as your soul prospers.',
          ),
        ],
      },
      {
        number: 3,
        parts: [
          aligned(johnGreek.for, 'For'),
          aligned(johnGreek.rejoiced, 'I rejoiced'),
          aligned(johnGreek.greatly, 'greatly'),
          plain('when'),
          aligned(johnGreek.brothers, 'brothers'),
          aligned(johnGreek.coming, 'came'),
          aligned(johnGreek.and, 'and'),
          aligned(johnGreek.testifying, 'testified'),
          plain('about'),
          aligned(johnGreek.your, 'your'),
          aligned(johnGreek.truth, 'truth', ','),
          aligned(johnGreek.justAs, 'even as'),
          aligned(johnGreek.you, 'you'),
          aligned(johnGreek.walk, 'walk'),
          aligned(johnGreek.in, 'in'),
          aligned(johnGreek.truth, 'truth', '.'),
        ],
      },
      {
        number: 4,
        parts: [plain('I have no greater joy than this: to hear about my children walking in truth.')],
      },
    ],
  },
];

const simple = (number: number, text: string): Verse => ({ number, parts: [plain(text)] });

export const simplifiedBooks: readonly Book[] = [
  {
    code: 'RUT',
    title: 'Ruth',
    short: 'Rut',
    chapter: 1,
    verses: [
      simple(
        1,
        'Long ago, before Israel had kings, there was no food in the land. So a man from the town of Bethlehem took his wife and his two sons and went to live in Moab.',
      ),
      simple(2, 'The man was Elimelech. His wife was Naomi. Their sons were Mahlon and Chilion.'),
      simple(3, 'Then Elimelech died, and Naomi was left alone with her two sons.'),
      simple(
        4,
        'The sons married women from Moab, one named Orpah and the other named Ruth. They lived there about ten years.',
      ),
      simple(
        16,
        'But Ruth answered, "Do not ask me to leave you. I will go where you go and live where you live. Your people will be my people, and your God will be my God."',
      ),
    ],
  },
  {
    code: '3JN',
    title: '3 John',
    short: '3Jn',
    chapter: 1,
    verses: [
      simple(1, 'I, the church leader, am writing to my dear friend Gaius, whom I truly love.'),
      simple(
        2,
        'Dear friend, I pray that everything goes well for you and that you are healthy in body and spirit.',
      ),
      simple(
        3,
        'Some believers came and told me that you live by the true message, and that made me very glad.',
      ),
      simple(4, 'Nothing makes me happier than hearing that the people I teach live by the truth.'),
    ],
  },
];

export const hebrewBooks: readonly Book[] = [
  {
    code: 'RUT',
    title: 'רות',
    short: 'Rut',
    chapter: 1,
    verses: [
      simple(
        1,
        'וַיְהִי בִּימֵי שְׁפֹט הַשֹּׁפְטִים וַיְהִי רָעָב בָּאָרֶץ וַיֵּלֶךְ אִישׁ מִבֵּית לֶחֶם יְהוּדָה לָגוּר בִּשְׂדֵי מוֹאָב הוּא וְאִשְׁתּוֹ וּשְׁנֵי בָנָיו׃',
      ),
      simple(
        16,
        'וַתֹּאמֶר רוּת אַל־תִּפְגְּעִי־בִי לְעָזְבֵךְ לָשׁוּב מֵאַחֲרָיִךְ כִּי אֶל־אֲשֶׁר תֵּלְכִי אֵלֵךְ וּבַאֲשֶׁר תָּלִינִי אָלִין עַמֵּךְ עַמִּי וֵאלֹהַיִךְ אֱלֹהָי׃',
      ),
    ],
  },
];

export const greekBooks: readonly Book[] = [
  {
    code: '3JN',
    title: 'Ἰωάννου γʹ',
    short: '3Jn',
    chapter: 1,
    verses: [
      simple(1, 'Ὁ πρεσβύτερος Γαΐῳ τῷ ἀγαπητῷ, ὃν ἐγὼ ἀγαπῶ ἐν ἀληθείᾳ.'),
      simple(2, 'Ἀγαπητέ, περὶ πάντων εὔχομαί σε εὐοδοῦσθαι καὶ ὑγιαίνειν, καθὼς εὐοδοῦταί σου ἡ ψυχή.'),
    ],
  },
];

export function usfmFileName(book: Book): string {
  return `${book.code}.usfm`;
}
