import { isProvenance } from '@lib/domain/provenance';
import { parseReference } from '@lib/domain/reference';
import type { SimDevice } from '@sim/device';
import { catalogPacks, installFromCatalog } from '@sim/install';
import { createWorld } from '@sim/world';
import type { Check, CheckOutcome } from './check.ts';

const licence = /CC BY-SA 4\.0|creativecommons\.org\/licenses\/by-sa\/4\.0/i;

type Rendered = { readonly label: string; readonly value: unknown };

type Labels = { readonly label: string; readonly key: LabelKey; readonly entries: readonly unknown[] };

const labelFields = {
  words: ['id', 'title'],
  academy: ['id', 'title'],
  stories: ['number', 'title'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

type LabelKey = keyof typeof labelFields;

const labelKeys = Object.keys(labelFields) as LabelKey[];

function notLabels({ label, key, entries }: Labels): string[] {
  const fields: readonly string[] = labelFields[key];
  return entries.flatMap((entry, index) => {
    const path = `${label}.${key}[${index}]`;
    if (!isObject(entry)) {
      return [`${path}: is not a label`];
    }
    const extra = Object.keys(entry).filter((field) => !fields.includes(field));
    const missing = fields.filter((field) => !(field in entry));
    return [
      ...extra.map(
        (field) => `${path}.${field}: a label holds only ${fields.join(' and ')}; content needs provenance`,
      ),
      ...missing.map((field) => `${path}: a label needs ${field}`),
      ...(typeof entry.title === 'string' ? [] : [`${path}.title: is not text`]),
    ];
  });
}

function sourcedValues(value: unknown, path: string): { path: string; provenance: unknown }[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => sourcedValues(item, `${path}[${index}]`));
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const record = value as Record<string, unknown>;
  const own = 'provenance' in record ? [{ path, provenance: record.provenance }] : [];
  return [
    ...own,
    ...Object.entries(record)
      .filter(([key]) => key !== 'provenance')
      .flatMap(([key, item]) => sourcedValues(item, `${path}.${key}`)),
  ];
}

const sourcedKeys: ReadonlySet<string> = new Set([
  'text',
  'notes',
  'wordLinks',
  'questions',
  'audio',
  'frames',
  'image',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unsourced(value: unknown, path: string): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => unsourced(item, `${path}[${index}]`));
  }
  if (!isObject(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, item]) => {
    if (key === 'provenance') {
      return [];
    }
    const pieces: unknown[] = Array.isArray(item) ? item : [item];
    const missing = sourcedKeys.has(key)
      ? pieces.flatMap((piece, index) =>
          isObject(piece) && !('provenance' in piece) ? [`${path}.${key}[${index}]`] : [],
        )
      : [];
    return [...missing, ...unsourced(item, `${path}.${key}`)];
  });
}

async function render(device: SimDevice): Promise<{ rendered: Rendered[]; labels: Labels[] }> {
  const corpus = device.kernel.corpus;
  const rendered: Rendered[] = [];
  const labels: Labels[] = [];
  for (const language of corpus.languages()) {
    const contents = await corpus.contents(language);
    rendered.push({ label: `${language} contents`, value: contents.texts });
    labels.push(...labelKeys.map((key) => ({ label: `${language} contents`, key, entries: contents[key] })));
    for (const text of contents.texts) {
      for (const book of text.books) {
        for (const chapter of book.chapters) {
          const parsed = parseReference(`${book.code} ${chapter}`);
          if (parsed.ok) {
            const passage = await corpus.passage(parsed.reference, { language, text: text.reading });
            rendered.push({ label: `${language} ${text.reading} ${book.code} ${chapter}`, value: passage });
          }
        }
      }
    }
    for (const entry of [...contents.words, ...contents.academy]) {
      rendered.push({ label: `${language} ${entry.id}`, value: await corpus.article(entry.id, language) });
    }
    for (const story of contents.stories) {
      rendered.push({
        label: `${language} story ${story.number}`,
        value: await corpus.story(story.number, language),
      });
    }
    for (const story of contents.movements) {
      rendered.push({
        label: `${language} movements ${story}`,
        value: await corpus.movements(story, language),
      });
    }
    for (const query of ['a', 'god', 'the']) {
      rendered.push({
        label: `${language} search ${query}`,
        value: (await corpus.search(query, language)).titles,
      });
    }
    await corpus.reindex(language);
    for (const query of ['god', 'the']) {
      rendered.push({
        label: `${language} full text ${query}`,
        value: await corpus.fullText(query, language),
      });
    }
  }
  return { rendered, labels };
}

export async function provenanceFindings(): Promise<{
  findings: string[];
  values: number;
  sourced: number;
  labelled: number;
}> {
  const device = createWorld().device('provenance');
  await device.start();
  await device.kernel.catalog.refresh();
  await installFromCatalog(device, catalogPacks(device));
  const findings: string[] = [];
  let sourced = 0;
  const { rendered, labels } = await render(device);
  for (const { label, value } of rendered) {
    if (value === undefined) {
      findings.push(`${label}: listed in contents but renders nothing`);
      continue;
    }
    for (const { path, provenance } of sourcedValues(value, label)) {
      sourced += 1;
      if (!isProvenance(provenance)) {
        findings.push(`${path}: provenance is incomplete`);
      } else if (!licence.test(provenance.licence)) {
        findings.push(`${path}: provenance names no CC BY-SA 4.0 licence (${provenance.licence})`);
      }
    }
    findings.push(...unsourced(value, label).map((path) => `${path}: carries no provenance`));
  }
  const failures = device.kernel.journal.read().filter((entry) => entry.type === 'Failure');
  findings.push(
    ...failures.map((entry) => `the corpus recorded a failure: ${JSON.stringify(entry.payload)}`),
  );
  findings.push(...labels.flatMap(notLabels));
  const labelled = labels.reduce((total, group) => total + group.entries.length, 0);
  return { findings, values: rendered.length, sourced, labelled };
}

const check: Check = {
  name: 'provenance',
  rule: 'Every content value rendered from every fixture carries provenance with its licence; a title is a label and needs none',
  run: async (): Promise<CheckOutcome> => {
    const { findings, values, sourced, labelled } = await provenanceFindings();
    return findings.length === 0
      ? {
          status: 'pass',
          summary: `${values} corpus values rendered from every pack in the fixture catalog, installed through Packs, ${sourced} pieces, each with a CC BY-SA 4.0 licence; ${labelled} titles in words, academy and stories exempt as labels`,
        }
      : { status: 'fail', findings };
  },
};

export default check;
