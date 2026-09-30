export type ArticleFile = {
  readonly path: string;
  readonly text: string;
  readonly mimeType: 'markdown' | 'yaml';
};

type Word = {
  readonly path: string;
  readonly title: string;
  readonly definition: string;
  readonly seeAlso: readonly string[];
  readonly references: readonly { readonly label: string; readonly link: string }[];
  readonly strongs: string;
};

const words: readonly Word[] = [
  {
    path: 'payload/kt/god.md',
    title: 'God',
    definition:
      'In the Bible, the term "God" refers to the eternal being who created the universe out of nothing. God exists as Father, Son and Holy Spirit.',
    seeAlso: ['[love](../kt/love.md)', '[[rc://*/tw/dict/bible/kt/truth]]'],
    references: [
      { label: 'Ruth 1:16', link: 'rc://*/ult/book/rut/01/16' },
      { label: '3 John 1:1', link: 'rc://*/ult/book/3jn/01/01' },
    ],
    strongs: 'H0430, G2316',
  },
  {
    path: 'payload/kt/love.md',
    title: 'love, beloved',
    definition:
      'To love another person is to care for that person and do things that will benefit him. The word "beloved" describes someone who is loved.',
    seeAlso: ['[God](../kt/god.md)', '[[rc://*/tw/dict/bible/kt/truth]]'],
    references: [{ label: '3 John 1:1', link: 'rc://*/ult/book/3jn/01/01' }],
    strongs: 'G0025, G0027',
  },
  {
    path: 'payload/kt/truth.md',
    title: 'truth, true',
    definition: 'Truth refers to what agrees with how things really are and with what God has said.',
    seeAlso: ['[[rc://*/tw/dict/bible/kt/god]]'],
    references: [
      { label: '3 John 1:1', link: 'rc://*/ult/book/3jn/01/01' },
      { label: '3 John 1:3', link: 'rc://*/ult/book/3jn/01/03' },
    ],
    strongs: 'G0225',
  },
  {
    path: 'payload/names/ruth.md',
    title: 'Ruth',
    definition:
      'Ruth was a woman from Moab who married an Israelite. She stayed with her mother-in-law Naomi after her husband died.',
    seeAlso: ['[Naomi](../names/naomi.md)', '[[rc://*/tw/dict/bible/kt/god]]'],
    references: [{ label: 'Ruth 1:16', link: 'rc://*/ult/book/rut/01/16' }],
    strongs: 'H7327',
  },
  {
    path: 'payload/names/naomi.md',
    title: 'Naomi',
    definition: 'Naomi was a woman from Bethlehem who moved to Moab with her husband and two sons.',
    seeAlso: ['[Ruth](../names/ruth.md)', '[famine](../other/famine.md)'],
    references: [{ label: 'Ruth 1:2', link: 'rc://*/ult/book/rut/01/02' }],
    strongs: 'H5281',
  },
  {
    path: 'payload/other/famine.md',
    title: 'famine',
    definition:
      'A famine is a time when there is not enough food in a land, often because the rain did not come.',
    seeAlso: ['[Naomi](../names/naomi.md)'],
    references: [{ label: 'Ruth 1:1', link: 'rc://*/ult/book/rut/01/01' }],
    strongs: 'H7458',
  },
];

function wordMarkdown(word: Word): string {
  return [
    `# ${word.title}`,
    '',
    '## Definition:',
    '',
    word.definition,
    '',
    '## Translation Suggestions:',
    '',
    '* Use the word the language already uses for this idea, if there is one.',
    '',
    `(See also: ${word.seeAlso.join(', ')})`,
    '',
    '## Bible References:',
    '',
    ...word.references.map((reference) => `* [${reference.label}](${reference.link})`),
    '',
    '## Word Data:',
    '',
    `* Strong's: ${word.strongs}`,
    '',
  ].join('\n');
}

function wordsConfig(): string {
  return words
    .flatMap((word) => [
      `${word.path.split('/').at(-1)?.replace(/\.md$/, '') ?? ''}:`,
      '  false_positives: []',
      '  occurrences:',
      ...word.references.map((reference) => `    - ${reference.link.replace('rc://*/ult/', 'rc://*/*/')}`),
    ])
    .concat('')
    .join('\n');
}

export const wordArticles: readonly ArticleFile[] = [
  ...words.map((word): ArticleFile => ({ path: word.path, text: wordMarkdown(word), mimeType: 'markdown' })),
  { path: 'payload/config.yaml', text: wordsConfig(), mimeType: 'yaml' },
];

type Lesson = {
  readonly slug: string;
  readonly title: string;
  readonly question: string;
  readonly body: string;
  readonly dependencies: readonly string[];
  readonly recommended: readonly string[];
};

const lessons: readonly Lesson[] = [
  {
    slug: 'figs-metaphor',
    title: 'Metaphor',
    question: 'What is a metaphor and how can I translate one?',
    body: [
      '### Description',
      '',
      'A metaphor is a figure of speech in which one thing is spoken of as if it were another. In 3 John 1:3, walking stands for how a person lives ([3 John 1:3](rc://*/ult/book/3jn/01/03)).',
      '',
      'An idiom is a related figure; see [Idiom](../figs-idiom/01.md).',
      '',
      '### Translation Strategies',
      '',
      '1. Keep the metaphor if readers will understand it.',
      '1. Say plainly what the metaphor means.',
    ].join('\n'),
    dependencies: ['figs-idiom'],
    recommended: ['translate-names'],
  },
  {
    slug: 'figs-idiom',
    title: 'Idiom',
    question: 'What is an idiom and how can I translate one?',
    body: [
      '### Description',
      '',
      'An idiom is a group of words whose meaning is different from the meaning of each word on its own.',
      '',
      'See also [[rc://*/ta/man/translate/figs-metaphor]].',
    ].join('\n'),
    dependencies: [],
    recommended: ['figs-metaphor'],
  },
  {
    slug: 'translate-names',
    title: 'How to Translate Names',
    question: 'How can I translate names that my readers have never heard?',
    body: [
      '### Description',
      '',
      'The Bible contains names of people and places, such as Bethlehem in [Ruth 1:1](rc://*/ult/book/rut/01/01).',
      '',
      '### Translation Strategies',
      '',
      '1. Spell the name so that it sounds like the name in the source.',
    ].join('\n'),
    dependencies: [],
    recommended: [],
  },
];

function yamlList(key: string, values: readonly string[]): string[] {
  return values.length === 0 ? [`  ${key}: []`] : [`  ${key}:`, ...values.map((value) => `    - ${value}`)];
}

export const academyArticles: readonly ArticleFile[] = [
  ...lessons.flatMap((lesson): ArticleFile[] => [
    { path: `translate/${lesson.slug}/title.md`, text: `${lesson.title}\n`, mimeType: 'markdown' },
    { path: `translate/${lesson.slug}/sub-title.md`, text: `${lesson.question}\n`, mimeType: 'markdown' },
    { path: `translate/${lesson.slug}/01.md`, text: `${lesson.body}\n`, mimeType: 'markdown' },
  ]),
  {
    path: 'translate/config.yaml',
    mimeType: 'yaml',
    text: lessons
      .flatMap((lesson) => [
        `${lesson.slug}:`,
        ...yamlList('dependencies', lesson.dependencies),
        ...yamlList('recommended', lesson.recommended),
      ])
      .concat('')
      .join('\n'),
  },
  {
    path: 'translate/toc.yaml',
    mimeType: 'yaml',
    text: [
      'title: Translation Manual',
      'sections:',
      ...lessons.flatMap((lesson) => [`  - title: ${lesson.title}`, `    link: ${lesson.slug}`]),
      '',
    ].join('\n'),
  },
];
