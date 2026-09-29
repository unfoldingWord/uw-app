import { readArchive } from '@lib/burrito/archive';
import { pinnedRows, type ContractRow, type RowId } from '@lib/burrito/flavors';
import { readProvenance } from '@lib/burrito/metadata';
import { validate, type ValidationReport } from '@lib/burrito/validate';
import { fixtureResponses } from '@sim/fixtures/load';
import { fixtureRows } from '@sim/fixtures/rows';

const liveCatalogUrl =
  'https://git.door43.org/api/v1/catalog/search?stage=prod&topic=tc-ready&lang=en&owner=unfoldingWord';
const liveTimeoutMs = 8000;

const liveSubjects: readonly { row: RowId; subject: string }[] = [
  { row: 'text', subject: 'Aligned Bible' },
  { row: 'notes', subject: 'TSV Translation Notes' },
  { row: 'wordLinks', subject: 'TSV Translation Words Links' },
  { row: 'questions', subject: 'TSV Translation Questions' },
  { row: 'articles', subject: 'Translation Words' },
  { row: 'stories', subject: 'Open Bible Stories' },
  { row: 'storyHelps', subject: 'TSV OBS Study Questions' },
];

const liveRows: readonly ContractRow[] = pinnedRows;

const expectedFixtureRows: readonly (readonly [RegExp, RowId])[] = [
  [/_obs-tf$/, 'formation'],
  [/_obs-(tn|sq|tq)$/, 'storyHelps'],
  [/_obs$/, 'stories'],
  [/-audio$/, 'audio'],
  [/^obs-images$/, 'images'],
  [/_(ult|ust|uhb|ugnt)$/, 'text'],
  [/_tn$/, 'notes'],
  [/_twl$/, 'wordLinks'],
  [/_tq$/, 'questions'],
  [/_(tw|ta)$/, 'articles'],
];

function expectedRowOf(file: string): RowId | undefined {
  const resource = file.split('/')[2] ?? '';
  return expectedFixtureRows.find(([pattern]) => pattern.test(resource))?.[1];
}

type Outcome = { line: string; failed: boolean };

function describe(label: string, report: ValidationReport, expected: RowId): Outcome {
  if (report.ok) {
    const provenance = readProvenance(report.metadata);
    const origin = provenance ? `${provenance.publisher} ${provenance.tag}` : 'no provenance';
    const mismatch = report.row.id !== expected;
    return {
      line: `${mismatch ? 'FAIL ' : 'ok   '} ${label}: ${report.row.id} (${report.row.status}) ${report.metadata.type.flavorType.name}/${report.metadata.type.flavorType.flavor.name}, ${origin}${mismatch ? `, expected ${expected}` : ''}`,
      failed: mismatch,
    };
  }
  return {
    line: `FAIL  ${label}: ${report.kind} ${report.rule} at ${report.path}: ${report.message}`,
    failed: true,
  };
}

function checkArchive(
  label: string,
  bytes: Uint8Array,
  rows: readonly ContractRow[],
  expected: RowId | undefined,
): Outcome {
  if (expected === undefined) {
    return { line: `FAIL  ${label}: no expected row is named for it`, failed: true };
  }
  const archive = readArchive(bytes);
  if (!archive.ok) {
    return { line: `FAIL  ${label}: ${archive.rule} at ${archive.path}: ${archive.message}`, failed: true };
  }
  return describe(label, validate(archive.files, { rows }), expected);
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { signal: AbortSignal.timeout(liveTimeoutMs) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

type LiveEntry = { full_name?: unknown; branch_or_tag_name?: unknown; subject?: unknown };

async function liveOutcomes(): Promise<Outcome[]> {
  let entries: LiveEntry[];
  try {
    const catalog = JSON.parse(new TextDecoder().decode(await fetchBytes(liveCatalogUrl))) as {
      data?: unknown;
    };
    entries = Array.isArray(catalog.data) ? (catalog.data as LiveEntry[]) : [];
  } catch (error) {
    return [
      {
        line: `live: skipped, offline (${error instanceof Error ? error.message : String(error)})`,
        failed: false,
      },
    ];
  }
  const outcomes: Outcome[] = [];
  for (const { row, subject } of liveSubjects) {
    const entry = entries.find((candidate) => candidate.subject === subject);
    if (typeof entry?.full_name !== 'string' || typeof entry.branch_or_tag_name !== 'string') {
      outcomes.push({
        line: `FAIL  live ${row}: no production release with subject "${subject}"`,
        failed: true,
      });
      continue;
    }
    const url = `https://git.door43.org/${entry.full_name}/sb/${entry.branch_or_tag_name}.zip`;
    try {
      outcomes.push(
        checkArchive(
          `live ${entry.full_name} ${entry.branch_or_tag_name}`,
          await fetchBytes(url),
          liveRows,
          row,
        ),
      );
    } catch (error) {
      outcomes.push({
        line: `FAIL  live ${row}: ${error instanceof Error ? error.message : String(error)}`,
        failed: true,
      });
    }
  }
  return outcomes;
}

const fixtureOutcomes = fixtureResponses()
  .filter((response) => response.contentType === 'application/zip')
  .map((response) => checkArchive(response.file, response.bytes, fixtureRows, expectedRowOf(response.file)));
const outcomes = [...fixtureOutcomes, ...(await liveOutcomes())];
for (const outcome of outcomes) {
  console.log(outcome.line);
}
const failures = outcomes.filter((outcome) => outcome.failed).length;
console.log(`contract: ${fixtureOutcomes.length} fixture burritos, ${failures} failed`);
process.exitCode = failures === 0 ? 0 : 1;
