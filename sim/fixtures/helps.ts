export type HelpsTable = {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

export function tsv(table: HelpsTable): string {
  return [table.header, ...table.rows].map((row) => row.join('\t')).join('\n') + '\n';
}

const notesHeader = ['Reference', 'ID', 'Tags', 'SupportReference', 'Quote', 'Occurrence', 'Note'];
const wordLinksHeader = ['Reference', 'ID', 'Tags', 'OrigWords', 'Occurrence', 'TWLink'];
const questionsHeader = ['Reference', 'ID', 'Tags', 'Quote', 'Occurrence', 'Question', 'Response'];

export const bookNotes: Readonly<Record<string, HelpsTable>> = {
  RUT: {
    header: notesHeader,
    rows: [
      [
        'front:intro',
        'r001',
        '',
        '',
        '',
        '0',
        '# Introduction to Ruth\\n\\nRuth is a story of loyalty and of God providing for a family.',
      ],
      [
        '1:1',
        'r002',
        '',
        'rc://*/ta/man/translate/translate-names',
        'בֵּית לֶחֶם',
        '1',
        'Bethlehem is the name of a town. See [Translate names](rc://*/ta/man/translate/translate-names).',
      ],
      [
        '1:16',
        'r003',
        'grammar',
        'rc://*/ta/man/translate/figs-idiom',
        'וֵאלֹהַיִךְ אֱלֹהָי',
        '1',
        'Ruth promises to worship the God of Naomi. Alternate translation: "your God will be the God I worship"',
      ],
    ],
  },
  '3JN': {
    header: notesHeader,
    rows: [
      [
        'front:intro',
        'j001',
        '',
        '',
        '',
        '0',
        '# Introduction to 3 John\\n\\nJohn writes to Gaius, a believer he loves.',
      ],
      [
        '1:1',
        'j002',
        '',
        '',
        'ἀγαπητῷ',
        '1',
        'John calls Gaius "beloved" to show how much he cares for him. See [Love](rc://*/tw/dict/bible/kt/love).',
      ],
      [
        '1:3',
        'j003',
        '',
        'rc://*/ta/man/translate/figs-metaphor',
        'ἐν ἀληθείᾳ περιπατεῖς',
        '1',
        'Walking is a metaphor for how a person lives. Alternate translation: "you live according to the truth"',
      ],
      [
        '1:3',
        'j004',
        '',
        '',
        'ἐρχομένων ἀδελφῶν',
        '1',
        'These brothers were believers who had visited Gaius and then come to John.',
      ],
    ],
  },
};

export const bookWordLinks: Readonly<Record<string, HelpsTable>> = {
  RUT: {
    header: wordLinksHeader,
    rows: [
      ['1:1', 'r101', '', 'רָעָב', '1', './payload/other/famine.md'],
      ['1:2', 'r102', 'name', 'נָעֳמִי', '1', './payload/names/naomi.md'],
      ['1:16', 'r103', 'keyterm; name', 'רוּת', '1', './payload/names/ruth.md'],
      ['1:16', 'r104', 'keyterm', 'אֱלֹהָי', '1', './payload/kt/god.md'],
    ],
  },
  '3JN': {
    header: wordLinksHeader,
    rows: [
      ['1:1', 'j101', 'keyterm', 'ἀγαπῶ', '1', './payload/kt/love.md'],
      ['1:1', 'j102', 'keyterm', 'ἀληθείᾳ', '1', './payload/kt/truth.md'],
    ],
  },
};

export const storyWordLinks: HelpsTable = {
  header: wordLinksHeader,
  rows: [
    ['1:1', 'aoaa', 'keyterm', 'God', '1', 'rc://*/tw/dict/bible/kt/god'],
    ['2:1', 'aoab', 'keyterm', 'love', '1', 'rc://*/tw/dict/bible/kt/love'],
  ],
};

export const bookQuestions: Readonly<Record<string, HelpsTable>> = {
  RUT: {
    header: questionsHeader,
    rows: [
      [
        '1:1',
        'r201',
        '',
        '',
        '',
        'Why did the man from Bethlehem go to Moab?',
        'There was a famine in the land.',
      ],
      [
        '1:16',
        'r202',
        '',
        '',
        '',
        'What did Ruth promise Naomi?',
        'She promised to go where Naomi went and to worship her God.',
      ],
    ],
  },
  '3JN': {
    header: questionsHeader,
    rows: [
      ['1:1', 'j201', '', '', '', 'To whom did John write this letter?', 'He wrote to Gaius.'],
      [
        '1:4',
        'j202',
        '',
        '',
        '',
        'What gives John the greatest joy?',
        'Hearing that his children walk in the truth.',
      ],
    ],
  },
};

export const storyNotes: HelpsTable = {
  header: notesHeader,
  rows: [
    [
      'front:intro',
      's001',
      '',
      '',
      '',
      '0',
      '# About these notes\\n\\nThese notes help a translator with each story.',
    ],
    [
      '1:1',
      's002',
      '',
      'rc://*/ta/man/translate/figs-idiom',
      'This is how',
      '1',
      'This introduces the whole story.',
    ],
    ['1:2', 's003', '', '', 'God', '1', 'See [God](rc://*/tw/dict/bible/kt/god).'],
    ['2:1', 's004', '', '', 'garden', '1', 'A place with many plants and trees.'],
    [
      '3:1',
      's005',
      '',
      'rc://*/ta/man/translate/figs-metaphor',
      'full of',
      '1',
      'Covered completely, as a cup is full of water.',
    ],
  ],
};

export function storyQuestions(language: 'qaa' | 'qab'): HelpsTable {
  const noun = language === 'qaa' ? 'God' : 'Yahweh';
  return {
    header: questionsHeader,
    rows: [
      [
        '1:1',
        'q001',
        '',
        '',
        '',
        `What did ${noun} make at the beginning?`,
        'Everything: the world and all that is in it.',
      ],
      [
        '1:3',
        'q002',
        '',
        '',
        '',
        'How did God make the first man?',
        'He formed him from the soil and gave him life.',
      ],
      [
        '2:1',
        'q003',
        '',
        '',
        '',
        'Where did the man and the woman live?',
        'In a beautiful garden God had made.',
      ],
      [
        '3:2',
        'q004',
        '',
        '',
        '',
        'Why did God tell Noah to build a boat?',
        'God was going to send a great flood.',
      ],
    ],
  };
}
