import { describe, expect, it } from 'vitest';
import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito, type IngredientInput } from '@lib/burrito/build';
import { utf8 } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { unrecordedTag } from '@lib/burrito/metadata';
import { parseReference, type Reference } from '@lib/domain/reference';
import { fromFile } from '@lib/packs/source';
import type { SimDevice } from './device';
import { createWorld } from './world';

const language = 'qad';
const commit = '44ebc9fafe8101665f985007d566f5036a2be85b';
const licenceText =
  '# License\n\n## Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)\n';

type Shape = {
  readonly resource: string;
  readonly flavorType: string;
  readonly flavor: string;
  readonly abbreviation: string;
  readonly name: string;
  readonly statement?: string;
  readonly ingredients: readonly IngredientInput[];
};

function text(path: string, body: string, mimeType: string, book?: string): IngredientInput {
  return book === undefined
    ? { path, bytes: utf8(body), mimeType }
    : { path, bytes: utf8(body), mimeType, scope: { [book]: [] } };
}

function reference(value: string): Reference {
  const parsed = parseReference(value);
  if (!parsed.ok) {
    throw new Error(value);
  }
  return parsed.reference;
}

async function importShape(device: SimDevice, shape: Shape) {
  const files = buildBurrito({
    publisher: 'unfoldingWord',
    resource: shape.resource,
    commit,
    dateCreated: '2026-09-29T19:18:36.273Z',
    generator: { softwareName: 'go-rc2sb', softwareVersion: 'v0.5.0' },
    language: { tag: language, name: { en: 'Fixture language D' }, scriptDirection: 'ltr' },
    name: { en: shape.name },
    abbreviation: { en: shape.abbreviation },
    flavorType: shape.flavorType,
    flavor: shape.flavor,
    licence: {
      statement: shape.statement ?? '© unfoldingWord 2026, CC BY-SA 4.0',
      text: licenceText,
      bare: shape.statement !== undefined,
    },
    ingredients: shape.ingredients,
  });
  const path = `imports/${shape.resource}.zip`;
  await device.adapters.files.mkdir('imports');
  await device.adapters.files.writeBytes(
    path,
    writeArchive(files, { root: shape.resource, mtime: new Date(2026, 8, 29) }),
  );
  const outcome = await device.kernel.packs.install(fromFile(path));
  if (!outcome.ok) {
    throw new Error(`${shape.resource}: ${outcome.code}`);
  }
  return outcome;
}

const ruth = String.raw`\id RUT QAD_ULT qad_Fixture_ltr tc
\usfm 3.0
\ide UTF-8
\h Ruth
\toc1 The Book of Ruth
\toc2 Ruth
\toc3 Rut
\mt1 Ruth

\ts\*
\c 1
\p
\v 1 \zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,C:Vqw3ms" x-occurrence="1" x-occurrences="1" x-content="וַיְהִי"\*\w It|x-occurrence="1" x-occurrences="1"\w*
\w happened|x-occurrence="1" x-occurrences="1"\w*\zaln-e\* \zaln-s |x-strong="H7458" x-lemma="רָעָב" x-morph="He,Ncmsa" x-occurrence="1" x-occurrences="1" x-content="רָעָב"\*\w famine|x-occurrence="1" x-occurrences="1"\w*\zaln-e\* came to \zaln-s |x-strong="H5281" x-lemma="נׇעֳמִי" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="נָעֳמִי"\*\w Naomi|x-occurrence="1" x-occurrences="1"\w*\zaln-e\*.
`;

const frontMatter = '\\id FRT QAD_ULT\n\\usfm 3.0\n\\is Front matter\n\\ip An introduction.\n';
const stub =
  '\\id NEH QAD_ULT qad_Fixture_ltr\n\\usfm 3.0\n\\ide UTF-8\n\\h Nehemiah\n\\toc1 Nehemiah\n\\mt Nehemiah\n';

const twlHeader = 'Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink';
const payload: readonly IngredientInput[] = [
  text(
    'payload/kt/god.md',
    '# God\n\n## Definition:\n\nThe creator. See [Naomi](../names/naomi.md).\n',
    mimeTypes.markdown,
  ),
  text('payload/names/naomi.md', '# Naomi\n\n## Facts:\n\nA woman from Bethlehem.\n', mimeTypes.markdown),
  text('payload/other/famine.md', '# famine\n\n## Definition:\n\nNot enough food.\n', mimeTypes.markdown),
  text('payload/config.yaml', 'god:\n  false_positives: []\n  occurrences: []\n', mimeTypes.yaml),
];
const linksTsv = [
  twlHeader,
  '1:1\tr101\t\tרָעָב\t1\t./payload/other/famine.md',
  '1:1\tr102\tkeyterm; name\tנָעֳמִי\t1\t./payload/names/naomi.md',
  '',
].join('\n');

const story = [
  '# 1. The Creation',
  '',
  '![OBS Image](https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg)',
  '',
  'This is how God made everything in the beginning.',
  '',
  '_A Bible story from: Genesis 1-2_',
  '',
].join('\n');

async function device(): Promise<SimDevice> {
  const phone = createWorld().device('phone');
  await phone.start();
  return phone;
}

describe('corpus over the release shapes observed from go-rc2sb v0.5.0 (CI run 36618141715)', () => {
  it('reads USFM listed as text/plain, and lists neither front matter nor a stub book', async () => {
    const phone = await device();
    const outcome = await importShape(phone, {
      resource: 'qad_ult',
      flavorType: 'scripture',
      flavor: 'textTranslation',
      abbreviation: 'ULT',
      name: 'Fixture Literal Text',
      ingredients: [
        text('FRT.usfm', frontMatter, 'text/plain', 'FRT'),
        text('NEH.usfm', stub, 'text/plain', 'NEH'),
        text('RUT.usfm', ruth, 'text/plain', 'RUT'),
      ],
    });
    expect(outcome.pack.burritos[0]?.provenance).toMatchObject({ tag: unrecordedTag, commit });
    const contents = await phone.kernel.corpus.contents(language);
    expect(contents.texts.map((item) => item.books.map((book) => book.code))).toEqual([['RUT']]);
    const passage = await phone.kernel.corpus.passage(reference('RUT 1:1'), { language });
    expect(passage?.text.verses.map((verse) => verse.text)).toEqual(['It happened famine came to Naomi.']);
  });

  it('reads Words from an x-bcvarticles burrito under payload/, and Word Links by relative path', async () => {
    const phone = await device();
    await importShape(phone, {
      resource: 'qad_ult',
      flavorType: 'scripture',
      flavor: 'textTranslation',
      abbreviation: 'ULT',
      name: 'Fixture Literal Text',
      ingredients: [text('RUT.usfm', ruth, 'text/plain', 'RUT')],
    });
    await importShape(phone, {
      resource: 'qad_tw',
      flavorType: 'parascriptural',
      flavor: 'x-bcvarticles',
      abbreviation: 'TW',
      name: 'Fixture Translation Words',
      ingredients: [text('RUT.tsv', linksTsv, mimeTypes.tsv, 'RUT'), ...payload],
    });
    await importShape(phone, {
      resource: 'qad_twl',
      flavorType: 'parascriptural',
      flavor: 'x-bcvarticles',
      abbreviation: 'TW',
      name: 'Fixture Translation Words Links',
      ingredients: [text('RUT.tsv', linksTsv, mimeTypes.tsv, 'RUT'), ...payload],
    });
    const rows = phone.kernel.packs
      .installed()
      .flatMap((pack) => pack.burritos.map((burrito) => [burrito.provenance.resource, burrito.row]));
    expect(rows).toEqual([
      ['qad_tw', 'articles'],
      ['qad_twl', 'wordLinks'],
      ['qad_ult', 'text'],
    ]);
    const god = await phone.kernel.corpus.article('tw/bible/kt/god', language);
    expect(god?.title).toBe('God');
    expect(JSON.stringify(god?.blocks)).toContain('tw/bible/names/naomi');
    const passage = await phone.kernel.corpus.passage(reference('RUT 1:1'), { language });
    expect(passage?.wordLinks.map((link) => [link.id, link.article, link.title])).toEqual([
      ['r101', 'tw/bible/other/famine', 'famine'],
      ['r102', 'tw/bible/names/naomi', 'Naomi'],
    ]);
    const contents = await phone.kernel.corpus.contents(language);
    expect(contents.words.map((word) => word.id)).toEqual([
      'tw/bible/kt/god',
      'tw/bible/names/naomi',
      'tw/bible/other/famine',
    ]);
  });

  it('reads story helps flavored x-obsnotes, x-obsquestions, and x-bcvarticles scoped to OBS', async () => {
    const phone = await device();
    await importShape(phone, {
      resource: 'qad_obs',
      flavorType: 'gloss',
      flavor: 'textStories',
      abbreviation: 'OBS',
      name: 'Fixture Open Bible Stories',
      statement: 'Copyright © 2023 by unfoldingWord',
      ingredients: [{ ...text('content/01.md', story, mimeTypes.markdown), scope: { GEN: ['1-2'] } }],
    });
    await importShape(phone, {
      resource: 'qad_obs-tn',
      flavorType: 'peripheral',
      flavor: 'x-obsnotes',
      abbreviation: 'OBSTN',
      name: 'Fixture OBS Translation Notes',
      ingredients: [
        text(
          'OBS.tsv',
          'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote\n1:0\ti6lj\ttitle\t\tThe Creation\t1\tThis title tells what the story is about.\n1:1\tzzmo\t\trc://*/ta/man/translate/figs-idiom\tThis is how\t1\tThis introduces the story.\n',
          mimeTypes.tsv,
        ),
      ],
    });
    await importShape(phone, {
      resource: 'qad_obs-sq',
      flavorType: 'peripheral',
      flavor: 'x-obsquestions',
      abbreviation: 'OBSSQ',
      name: 'Fixture OBS Study Questions',
      ingredients: [
        text(
          'OBS.tsv',
          'Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse\nfront\tvj0h\tintro\t\t\t\t# A guide\\n\\nRead the story.\n1:1\tes4e\t\t\t\tWhere did everything come from?\tGod created everything.\n',
          mimeTypes.tsv,
        ),
      ],
    });
    await importShape(phone, {
      resource: 'qad_obs-twl',
      flavorType: 'parascriptural',
      flavor: 'x-bcvarticles',
      abbreviation: 'OBSTWL',
      name: 'Fixture OBS Translation Words Links',
      statement: 'Copyright © 2021 by unfoldingWord',
      ingredients: [
        {
          ...text(
            'OBS.tsv',
            `${twlHeader}\n1:1\taoaa\tkeyterm\tGod\t1\trc://*/tw/dict/bible/kt/god\n`,
            mimeTypes.tsv,
          ),
          scope: { OBS: [] },
        },
      ],
    });
    const rows = phone.kernel.packs
      .installed()
      .flatMap((pack) => pack.burritos.map((burrito) => burrito.row));
    expect(rows).toEqual(['stories', 'storyHelps', 'storyHelps', 'storyHelps']);
    const opened = await phone.kernel.corpus.story(1, language);
    expect(opened?.notes.map((note) => [note.id, note.frame])).toEqual([
      ['i6lj', 0],
      ['zzmo', 1],
    ]);
    expect(opened?.questions.map((question) => [question.id, question.frame, question.study])).toEqual([
      ['es4e', 1, true],
    ]);
    expect(opened?.wordLinks.map((link) => [link.id, link.article])).toEqual([['aoaa', 'tw/bible/kt/god']]);
    expect(opened?.provenance.licence).toBe('Copyright © 2023 by unfoldingWord, CC BY-SA 4.0');
    const twl = phone.kernel.packs
      .installed()
      .flatMap((pack) => pack.burritos)
      .find((burrito) => burrito.provenance.resource === 'qad_obs-twl');
    expect(twl?.provenance.licence).toBe('Copyright © 2021 by unfoldingWord, CC BY-SA 4.0');
  });
});
