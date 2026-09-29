import { describe, expect, it } from 'vitest';
import { md5Hex, utf8 } from './files';
import { admittedRows, pinnedRows, provisionalFlavors, type RowId } from './flavors';
import { displayedLicence } from './licence';
import { readProvenance, unrecordedTag } from './metadata';
import { validate } from './validate';

type Ingredient = {
  readonly path: string;
  readonly text: string;
  readonly mimeType: string;
  readonly scope?: Record<string, string[]>;
};

const licenceMarkdown =
  '# License\n\n## Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)\n\nThis is a human-readable summary of the License.\n';

type Shape = {
  readonly repository: string;
  readonly flavorType: string;
  readonly flavor: string;
  readonly abbreviation: string;
  readonly name: string;
  readonly statement: { readonly statement: string; readonly mimetype?: string; readonly lang?: string };
  readonly currentScope?: Record<string, string[]>;
  readonly ingredients: readonly Ingredient[];
};

const revision = '35d215957f3203fd2e2fac5702ce14902d417f9d';
const generatedAt = '2026-09-29T19:18:36.273Z';

function goRc2sb(shape: Shape): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  const ingredients: Record<string, unknown> = {};
  for (const ingredient of [
    ...shape.ingredients,
    { path: 'LICENSE.md', text: licenceMarkdown, mimeType: 'text/markdown' },
  ]) {
    const bytes = utf8(ingredient.text);
    const key = `ingredients/${ingredient.path}`;
    files.set(key, bytes);
    ingredients[key] = {
      checksum: { md5: md5Hex(bytes) },
      mimeType: ingredient.mimeType,
      size: bytes.byteLength,
      ...('scope' in ingredient && ingredient.scope ? { scope: ingredient.scope } : {}),
    };
  }
  const metadata = {
    format: 'scripture burrito',
    meta: {
      version: '1.0.0',
      category: 'source',
      generator: { softwareName: 'go-rc2sb', softwareVersion: 'v0.5.0', userName: '' },
      defaultLocale: 'en',
      dateCreated: generatedAt,
      normalization: 'NFC',
    },
    idAuthorities: { dcs: { id: 'https://git.door43.org', name: { en: 'Door43 Content Service' } } },
    identification: {
      primary: { dcs: { [shape.repository]: { revision, timestamp: generatedAt } } },
      name: { en: shape.name },
      description: { en: shape.name },
      abbreviation: { en: shape.abbreviation },
    },
    languages: [{ tag: 'en', name: { en: 'English' }, scriptDirection: 'ltr' }],
    type: {
      flavorType: {
        name: shape.flavorType,
        flavor: { name: shape.flavor },
        ...(shape.currentScope ? { currentScope: shape.currentScope } : {}),
      },
    },
    confidential: false,
    copyright: { shortStatements: [shape.statement] },
    ingredients,
  };
  files.set('metadata.json', utf8(JSON.stringify(metadata)));
  return files;
}

const statement = { statement: '© unfoldingWord 2026, CC BY-SA 4.0', mimetype: 'text/plain', lang: 'en' };
const twlHeader = 'Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink\n';
const wordLinksTsv = `${twlHeader}1:1\ts5jq\tname\tΠαῦλος\t1\t./payload/names/paul.md\n`;
const bookTsv = (book: string, text: string): Ingredient => ({
  path: `${book}.tsv`,
  text,
  mimeType: 'text/tab-separated-values',
  scope: { [book]: [] },
});
const payload: readonly Ingredient[] = [
  { path: 'payload/kt/god.md', text: '# God\n', mimeType: 'text/markdown' },
  { path: 'payload/names/paul.md', text: '# Paul\n', mimeType: 'text/markdown' },
  { path: 'payload/config.yaml', text: 'god:\n  false_positives: []\n', mimeType: 'text/yaml' },
];
const obsTsv = (header: string, scope?: Record<string, string[]>): Ingredient => ({
  path: 'OBS.tsv',
  text: `${header}\n`,
  mimeType: 'text/tab-separated-values',
  ...(scope ? { scope } : {}),
});

const observed: Readonly<Record<string, { shape: Shape; row: RowId }>> = {
  'unfoldingWord/en_ult v91': {
    row: 'text',
    shape: {
      repository: 'unfoldingWord/en_ult',
      flavorType: 'scripture',
      flavor: 'textTranslation',
      abbreviation: 'ULT',
      name: 'unfoldingWord® Literal Text',
      statement,
      currentScope: { '1CO': [] },
      ingredients: [
        {
          path: '1CO.usfm',
          text: '\\id 1CO EN_ULT\n\\c 1\n\\p\n\\v 1 Paul\n',
          mimeType: 'text/plain',
          scope: { '1CO': [] },
        },
        { path: 'FRT.usfm', text: '\\id FRT\n\\is Front\n', mimeType: 'text/plain', scope: { FRT: [] } },
      ],
    },
  },
  'unfoldingWord/en_tw v91': {
    row: 'articles',
    shape: {
      repository: 'unfoldingWord/en_tw',
      flavorType: 'parascriptural',
      flavor: 'x-bcvarticles',
      abbreviation: 'TW',
      name: 'unfoldingWord® Translation Words',
      statement,
      currentScope: { '1CO': [] },
      ingredients: [bookTsv('1CO', wordLinksTsv), ...payload],
    },
  },
  'translationCore-Create-BCS/mr_tW v4': {
    row: 'articles',
    shape: {
      repository: 'translationCore-Create-BCS/mr_tW',
      flavorType: 'parascriptural',
      flavor: 'x-bcvarticles',
      abbreviation: 'TW',
      name: 'Translation Words',
      statement,
      ingredients: [bookTsv('1CO', wordLinksTsv), ...payload],
    },
  },
  'unfoldingWord/en_twl v91': {
    row: 'wordLinks',
    shape: {
      repository: 'unfoldingWord/en_twl',
      flavorType: 'parascriptural',
      flavor: 'x-bcvarticles',
      abbreviation: 'TW',
      name: 'unfoldingWord® Translation Words Links',
      statement,
      currentScope: { '1CO': [] },
      ingredients: [bookTsv('1CO', wordLinksTsv), ...payload],
    },
  },
  'unfoldingWord/en_obs-sq v4': {
    row: 'storyHelps',
    shape: {
      repository: 'unfoldingWord/en_obs-sq',
      flavorType: 'peripheral',
      flavor: 'x-obsquestions',
      abbreviation: 'OBSSQ',
      name: 'unfoldingWord® Open Bible Stories Study Questions',
      statement,
      ingredients: [obsTsv('Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse')],
    },
  },
  'unfoldingWord/en_obs-tn v13': {
    row: 'storyHelps',
    shape: {
      repository: 'unfoldingWord/en_obs-tn',
      flavorType: 'peripheral',
      flavor: 'x-obsnotes',
      abbreviation: 'OBSTN',
      name: 'unfoldingWord® Open Bible Stories Translation Notes',
      statement,
      ingredients: [obsTsv('Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote')],
    },
  },
  'unfoldingWord/en_obs-twl v3': {
    row: 'storyHelps',
    shape: {
      repository: 'unfoldingWord/en_obs-twl',
      flavorType: 'parascriptural',
      flavor: 'x-bcvarticles',
      abbreviation: 'OBSTWL',
      name: 'unfoldingWord® OBS Translation Words Links',
      statement: { statement: 'Copyright © 2021 by unfoldingWord' },
      currentScope: { OBS: [] },
      ingredients: [obsTsv(twlHeader.trimEnd(), { OBS: [] })],
    },
  },
};

describe('the release shapes observed from go-rc2sb v0.5.0 (CI run 36618141715)', () => {
  it.each(Object.entries(observed))('classifies %s', (_, { shape, row }) => {
    const report = validate(goRc2sb(shape), { rows: pinnedRows });
    expect(report.ok ? report.row.id : report).toBe(row);
  });

  it('reads USFM listed as text/plain by its extension, and still reads text/x-usfm', () => {
    const shape = observed['unfoldingWord/en_ult v91']?.shape;
    if (shape === undefined) {
      throw new Error('missing shape');
    }
    const legacy = goRc2sb({
      ...shape,
      ingredients: [{ path: '1CO.usfm', text: '\\id 1CO\n', mimeType: 'text/x-usfm', scope: { '1CO': [] } }],
    });
    expect(validate(legacy).ok).toBe(true);
    const plainTextOnly = goRc2sb({
      ...shape,
      ingredients: [{ path: 'notes.txt', text: 'x\n', mimeType: 'text/plain', scope: { '1CO': [] } }],
    });
    const report = validate(plainTextOnly);
    expect(report.ok ? report.row.id : report.kind).toBe('invalid');
  });

  it('takes the commit from the revision, and leaves the tag and release date to the catalog', () => {
    const shape = observed['unfoldingWord/en_obs-twl v3']?.shape;
    if (shape === undefined) {
      throw new Error('missing shape');
    }
    const report = validate(goRc2sb({ ...shape, repository: 'Door43/sw_obs' }));
    expect(report.ok && readProvenance(report.metadata)).toEqual({
      publisher: 'Door43',
      resource: 'sw_obs',
      language: 'en',
      tag: unrecordedTag,
      commit: revision,
      licence: 'Copyright © 2021 by unfoldingWord',
      title: 'unfoldingWord® OBS Translation Words Links',
    });
  });

  it('shows the licence the LICENSE ingredient names when the statement names none', () => {
    expect(displayedLicence('Copyright © 2023 by unfoldingWord', licenceMarkdown)).toBe(
      'Copyright © 2023 by unfoldingWord, CC BY-SA 4.0',
    );
    expect(displayedLicence('© unfoldingWord 2026, CC BY-SA 4.0', licenceMarkdown)).toBe(
      '© unfoldingWord 2026, CC BY-SA 4.0',
    );
    expect(displayedLicence('Copyright © 2017 by Door43', undefined)).toBe('Copyright © 2017 by Door43');
  });

  it('names the formation row by the catalog flavor, still provisional', () => {
    expect(provisionalFlavors.formation).toEqual({
      flavorType: 'peripheral',
      flavor: 'x-OBSTheologicalFormation',
    });
    expect(admittedRows.some((row) => row.id === 'formation' && row.status === 'provisional')).toBe(true);
    expect(pinnedRows.some((row) => row.id === 'formation')).toBe(false);
  });
});
