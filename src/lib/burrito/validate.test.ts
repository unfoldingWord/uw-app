import { describe, expect, it } from 'vitest';
import { buildBurrito, type BurritoInput, type IngredientInput } from './build';
import { fromUtf8, md5Hex, utf8, type BurritoFiles } from './files';
import {
  admittedRows,
  mimeTypes,
  pinnedRows,
  provisionalFlavors,
  requiredFormationSections,
  type RowId,
} from './flavors';
import { readProvenance, unrecordedTag } from './metadata';
import { validate, type ValidationReport } from './validate';

const markdown = (path: string, text = `# ${path}\n`): IngredientInput => ({
  path,
  bytes: utf8(text),
  mimeType: mimeTypes.markdown,
});

const scoped = (path: string, mimeType: string, book: string): IngredientInput => ({
  path,
  bytes: utf8(`${path}\n`),
  mimeType,
  scope: { [book]: ['1'] },
});

const tsv = (path: string): IngredientInput => ({
  path,
  bytes: utf8('Reference\tID\tTags\tQuote\tOccurrence\tNote\n1:1\tabcd\t\t\t0\tA note\n'),
  mimeType: mimeTypes.tsv,
});

const base: BurritoInput = {
  publisher: 'unfoldingWord',
  resource: 'qaa_ult',
  commit: 'a'.repeat(40),
  dateCreated: '2026-09-01T00:00:00Z',
  generator: { softwareName: 'test', softwareVersion: '1' },
  language: { tag: 'qaa', name: { en: 'Fixture' } },
  name: { en: 'Fixture Literal Text' },
  abbreviation: { en: 'ult' },
  flavorType: 'scripture',
  flavor: 'textTranslation',
  licence: { statement: 'Released under CC BY-SA 4.0', text: 'CC BY-SA 4.0\n' },
  ingredients: [scoped('08-RUT.usfm', mimeTypes.usfm, 'RUT')],
};

const rowInputs: Record<RowId, Partial<BurritoInput>> = {
  text: {},
  notes: {
    flavorType: 'parascriptural',
    flavor: 'x-bcvnotes',
    ingredients: [scoped('tn_RUT.tsv', mimeTypes.tsv, 'RUT')],
  },
  wordLinks: {
    flavorType: 'parascriptural',
    flavor: 'x-bcvarticles',
    ingredients: [scoped('twl_RUT.tsv', mimeTypes.tsv, 'RUT')],
  },
  questions: {
    flavorType: 'parascriptural',
    flavor: 'x-bcvquestions',
    ingredients: [scoped('tq_RUT.tsv', mimeTypes.tsv, 'RUT')],
  },
  articles: {
    flavorType: 'peripheral',
    flavor: 'x-peripheralArticles',
    ingredients: [
      markdown('translate/figs-metaphor/01.md'),
      { path: 'translate/config.yaml', bytes: utf8('a: 1\n'), mimeType: mimeTypes.yaml },
    ],
  },
  stories: { flavorType: 'gloss', flavor: 'textStories', ingredients: [markdown('content/01.md')] },
  storyHelps: { flavorType: 'parascriptural', flavor: 'x-bcvquestions', ingredients: [tsv('sq_OBS.tsv')] },
  formation: {
    flavorType: provisionalFlavors.formation.flavorType,
    flavor: provisionalFlavors.formation.flavor,
    ingredients: requiredFormationSections.map((section) => markdown(`01/${section}.md`)),
  },
  audio: {
    flavorType: provisionalFlavors.audio.flavorType,
    flavor: provisionalFlavors.audio.flavor,
    ingredients: [scoped('RUT/RUT_001.mp3', mimeTypes.mp3, 'RUT')],
  },
  images: {
    flavorType: provisionalFlavors.images.flavorType,
    flavor: provisionalFlavors.images.flavor,
    ingredients: [
      {
        path: 'images/obs-en-01-01.jpg',
        bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
        mimeType: mimeTypes.jpeg,
      },
    ],
  },
};

function burrito(overrides: Partial<BurritoInput> = {}): Map<string, Uint8Array> {
  return new Map(buildBurrito({ ...base, ...overrides }));
}

type Json = Record<string, unknown>;

function editMetadata(files: BurritoFiles, edit: (metadata: Json) => void): Map<string, Uint8Array> {
  const copy = new Map(files);
  const metadata = JSON.parse(fromUtf8(copy.get('metadata.json') ?? utf8('{}'))) as Json;
  edit(metadata);
  copy.set('metadata.json', utf8(JSON.stringify(metadata)));
  return copy;
}

function failure(report: ValidationReport): { kind: string; rule: string; path: string } {
  if (report.ok) {
    throw new Error(`expected a failure, got row ${report.row.id}`);
  }
  return { kind: report.kind, rule: report.rule, path: report.path };
}

describe('validate', () => {
  it.each(Object.entries(rowInputs))('matches the %s row', (row, overrides) => {
    const report = validate(burrito(overrides), { rows: admittedRows });
    expect(report.ok && report.row.id).toBe(row);
  });

  it('accepts all fifty stories and refuses a fifty-first', () => {
    const fifty = Array.from({ length: 50 }, (_, index) =>
      markdown(`content/${String(index + 1).padStart(2, '0')}.md`),
    );
    expect(validate(burrito({ ...rowInputs.stories, ingredients: fifty })).ok).toBe(true);
    const report = validate(
      burrito({ ...rowInputs.stories, ingredients: [...fifty, markdown('content/51.md')] }),
    );
    expect(failure(report)).toEqual({
      kind: 'invalid',
      rule: 'row-ingredients',
      path: 'ingredients/content/51.md',
    });
  });

  it('carries provenance in the metadata: publisher, commit and licence, the tag left to the catalog', () => {
    const report = validate(burrito());
    expect(report.ok && readProvenance(report.metadata)).toEqual({
      publisher: 'unfoldingWord',
      resource: 'qaa_ult',
      tag: unrecordedTag,
      commit: 'a'.repeat(40),
      language: 'qaa',
      licence: 'Released under CC BY-SA 4.0',
      title: 'Fixture Literal Text',
    });
  });

  it('ignores an unknown flavor rather than failing it', () => {
    const report = validate(burrito({ flavorType: 'scripture', flavor: 'signLanguageVideoTranslation' }));
    expect(failure(report)).toEqual({ kind: 'ignored', rule: 'unknown-flavor', path: 'type.flavorType' });
  });

  it('admits only the pinned rows unless the provisional ones are asked for (content contract)', () => {
    for (const row of ['formation', 'audio', 'images'] as const) {
      expect(failure(validate(burrito(rowInputs[row]))).kind).toBe('ignored');
      expect(failure(validate(burrito(rowInputs[row]), { rows: pinnedRows })).kind).toBe('ignored');
      expect(validate(burrito(rowInputs[row]), { rows: admittedRows }).ok).toBe(true);
    }
  });

  it('requires config.yaml beside each Academy section and lists it as YAML', () => {
    const withoutConfig = burrito({
      ...rowInputs.articles,
      ingredients: [markdown('translate/figs-metaphor/01.md')],
    });
    expect(failure(validate(withoutConfig))).toEqual({
      kind: 'invalid',
      rule: 'row-ingredients',
      path: 'ingredients/translate/config.yaml',
    });
    const mislabelled = burrito({
      ...rowInputs.articles,
      ingredients: [
        markdown('translate/figs-metaphor/01.md'),
        { path: 'translate/config.yaml', bytes: utf8('a: 1\n'), mimeType: mimeTypes.markdown },
      ],
    });
    expect(failure(validate(mislabelled)).path).toBe('ingredients/translate/config.yaml');
    const words = burrito({ ...rowInputs.articles, ingredients: [markdown('bible/kt/god.md')] });
    expect(validate(words).ok).toBe(true);
  });

  it('refuses an ingredient key that is not a plain path under ingredients/', () => {
    for (const key of [
      '../metadata.json',
      'ingredients/../x.usfm',
      'README.md',
      'ingredients//a',
      'ingredients/a\\b',
    ]) {
      const files = editMetadata(burrito(), (metadata) => {
        const ingredients = metadata.ingredients as Json;
        ingredients[key] = ingredients['ingredients/08-RUT.usfm'];
      });
      expect(failure(validate(files))).toEqual({ kind: 'invalid', rule: 'ingredient-path', path: key });
    }
  });

  it('refuses a burrito that is not Scripture Burrito 1.0', () => {
    for (const version of ['0.2.0', '2.0.0', 'latest']) {
      const files = editMetadata(burrito(), (metadata) => {
        (metadata.meta as Json).version = version;
      });
      expect(failure(validate(files))).toEqual({
        kind: 'invalid',
        rule: 'metadata-version',
        path: 'meta.version',
      });
    }
  });

  it('fails without metadata.json', () => {
    const files = burrito();
    files.delete('metadata.json');
    expect(failure(validate(files))).toEqual({
      kind: 'invalid',
      rule: 'metadata-missing',
      path: 'metadata.json',
    });
  });

  it('fails on metadata that is not JSON', () => {
    const files = burrito();
    files.set('metadata.json', utf8('{ not json'));
    expect(failure(validate(files)).rule).toBe('metadata-unreadable');
  });

  it('fails when the format is not scripture burrito', () => {
    const files = editMetadata(burrito(), (metadata) => {
      metadata.format = 'resource container';
    });
    expect(failure(validate(files))).toEqual({ kind: 'invalid', rule: 'metadata-format', path: 'format' });
  });

  it.each([
    ['meta.version', (m: Json) => delete (m.meta as Json).version],
    ['type.flavorType.name', (m: Json) => delete ((m.type as Json).flavorType as Json).name],
    [
      'type.flavorType.flavor.name',
      (m: Json) => delete (((m.type as Json).flavorType as Json).flavor as Json).name,
    ],
    ['languages[0].tag', (m: Json) => (m.languages = [])],
    ['identification.name', (m: Json) => ((m.identification as Json).name = {})],
    ['identification.abbreviation', (m: Json) => delete (m.identification as Json).abbreviation],
    ['copyright.shortStatements[0].statement', (m: Json) => ((m.copyright as Json).shortStatements = [])],
    ['ingredients', (m: Json) => delete m.ingredients],
  ])('fails on a missing %s', (path, edit) => {
    expect(failure(validate(editMetadata(burrito(), edit)))).toEqual({
      kind: 'invalid',
      rule: 'metadata-field',
      path,
    });
  });

  it.each(['mimeType', 'size', 'checksum'])('fails on an ingredient without %s', (field) => {
    const files = editMetadata(burrito(), (metadata) => {
      const ingredients = metadata.ingredients as Json;
      const entry = ingredients['ingredients/08-RUT.usfm'] as Json;
      ingredients['ingredients/08-RUT.usfm'] = Object.fromEntries(
        Object.entries(entry).filter(([key]) => key !== field),
      );
    });
    expect(failure(validate(files))).toEqual({
      kind: 'invalid',
      rule: 'ingredient-field',
      path: 'ingredients/08-RUT.usfm',
    });
  });

  it('fails on a listed ingredient that is not present', () => {
    const files = burrito();
    files.delete('ingredients/08-RUT.usfm');
    expect(failure(validate(files))).toEqual({
      kind: 'invalid',
      rule: 'ingredient-missing',
      path: 'ingredients/08-RUT.usfm',
    });
  });

  it('fails on an ingredient whose size differs', () => {
    const files = burrito();
    files.set('ingredients/08-RUT.usfm', utf8('08-RUT.usfm\nextra\n'));
    expect(failure(validate(files))).toEqual({
      kind: 'invalid',
      rule: 'ingredient-size',
      path: 'ingredients/08-RUT.usfm',
    });
  });

  it('fails on an ingredient whose checksum differs', () => {
    const files = burrito();
    files.set('ingredients/08-RUT.usfm', utf8('08-RUT.usfX\n'));
    expect(failure(validate(files))).toEqual({
      kind: 'invalid',
      rule: 'ingredient-checksum',
      path: 'ingredients/08-RUT.usfm',
    });
  });

  it('fails without a CC BY-SA 4.0 licence', () => {
    const files = editMetadata(
      burrito({ licence: { statement: 'All rights reserved', text: 'All rights reserved\n' } }),
      (metadata) => {
        delete (metadata.copyright as Json).licenses;
      },
    );
    expect(failure(validate(files))).toEqual({ kind: 'invalid', rule: 'licence', path: 'copyright' });
  });

  it('accepts a licence ingredient naming CC BY-SA 4.0 when the statement does not', () => {
    const files = editMetadata(
      burrito({
        licence: { statement: 'See LICENSE.md', text: 'Creative Commons Attribution-ShareAlike 4.0\n' },
      }),
      (metadata) => {
        delete (metadata.copyright as Json).licenses;
      },
    );
    expect(validate(files).ok).toBe(true);
  });

  it('fails a text ingredient without a book scope', () => {
    const report = validate(
      burrito({ ingredients: [{ path: '08-RUT.usfm', bytes: utf8('x'), mimeType: mimeTypes.usfm }] }),
    );
    expect(failure(report)).toEqual({
      kind: 'invalid',
      rule: 'row-ingredients',
      path: 'ingredients/08-RUT.usfm',
    });
  });

  it.each(['FRT.usfm', 'A0-FRT.usfm', 'BAK.usfm', 'GLO.usfm', 'TOB.usfm', '1MA.usfm', 'XXA.usfm'])(
    'accepts %s listed without a scope beside a book, as go-rc2sb v0.5.0 lists front matter (CI run 36629971685)',
    (path) => {
      const report = validate(
        burrito({
          ingredients: [
            scoped('08-RUT.usfm', mimeTypes.usfm, 'RUT'),
            { path, bytes: utf8('\\id FRT\n'), mimeType: mimeTypes.usfm },
          ],
        }),
      );
      expect(report.ok && report.row.id).toBe('text');
    },
  );

  it('accepts a peripheral USFM ingredient scoped to its own book id', () => {
    const report = validate(
      burrito({
        ingredients: [
          scoped('08-RUT.usfm', mimeTypes.usfm, 'RUT'),
          { path: 'FRT.usfm', bytes: utf8('x'), mimeType: mimeTypes.usfm, scope: { FRT: [] } },
        ],
      }),
    );
    expect(report.ok && report.row.id).toBe('text');
  });

  it('fails a text burrito whose only USFM ingredient is front matter', () => {
    const report = validate(
      burrito({ ingredients: [{ path: 'FRT.usfm', bytes: utf8('x'), mimeType: mimeTypes.usfm }] }),
    );
    expect(failure(report)).toEqual({ kind: 'invalid', rule: 'row-ingredients', path: 'ingredients' });
  });

  it('fails a USFM ingredient scoped to an id that is not a USFM book', () => {
    const report = validate(burrito({ ingredients: [scoped('08-RUT.usfm', mimeTypes.usfm, 'QQQ')] }));
    expect(failure(report)).toEqual({
      kind: 'invalid',
      rule: 'row-ingredients',
      path: 'ingredients/08-RUT.usfm',
    });
  });

  it('fails a formation story that lacks a movement', () => {
    const sections = requiredFormationSections.filter((section) => section !== 'journal');
    const report = validate(
      burrito({
        ...rowInputs.formation,
        ingredients: sections.map((section) => markdown(`01/${section}.md`)),
      }),
      { rows: admittedRows },
    );
    expect(failure(report)).toEqual({
      kind: 'invalid',
      rule: 'row-ingredients',
      path: 'ingredients/01/journal.md',
    });
  });
});

describe('md5Hex', () => {
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['The quick brown fox jumps over the lazy dog', '9e107d9d372bb6826bd81d3542a419d6'],
  ])('hashes %j per RFC 1321', (text, digest) => {
    expect(md5Hex(utf8(text))).toBe(digest);
  });
});
