import { readArchive } from '@lib/burrito/archive';
import type { ContractRow, RowId } from '@lib/burrito/flavors';
import { readProvenance } from '@lib/burrito/metadata';
import { unparsedTsv, unparsedTsvMessage } from '@lib/burrito/unparsed';
import { validate, type ValidationReport } from '@lib/burrito/validate';
import { fixtureResponses } from '@sim/fixtures/load';
import { fixtureRows } from '@sim/fixtures/rows';
import { describeLive } from './contract-describe';
import { ingestSmoke } from './contract-ingest';
import { fetchLiveCatalog, liveOutcomes, type Outcome } from './contract-live';

const expectedFixtureRows: readonly (readonly [RegExp, RowId])[] = [
  [/_obs-tf$/, 'formation'],
  [/_obs-(tn|sq|tq|twl)$/, 'storyHelps'],
  [/_obs$/, 'stories'],
  [/-audio$/, 'audio'],
  [/^obs-images$/, 'images'],
  [/_(ult|ust|t4t|bsb|uhb|ugnt)$/, 'text'],
  [/_tn$/, 'notes'],
  [/_twl$/, 'wordLinks'],
  [/_tq$/, 'questions'],
  [/_(tw|ta)$/, 'articles'],
];

function expectedRowOf(file: string): RowId | undefined {
  const resource = file.split('/')[2] ?? '';
  return expectedFixtureRows.find(([pattern]) => pattern.test(resource))?.[1];
}

function describe(label: string, report: ValidationReport, expected: RowId): Outcome {
  if (report.ok) {
    const provenance = readProvenance(report.metadata);
    const origin = provenance ? `${provenance.publisher} commit ${provenance.commit}` : 'no provenance';
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

function checkFixture(
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
  const outcome = describe(label, validate(archive.files, { rows }), expected);
  const unparsed = unparsedTsvMessage(unparsedTsv(archive.files));
  return unparsed === undefined
    ? outcome
    : { line: `${outcome.line}\nFAIL  ${label}: ${unparsed}`, failed: true };
}

async function online(): Promise<Outcome[]> {
  const catalog = await fetchLiveCatalog();
  if (!catalog.ok) {
    return [{ line: `live: skipped, offline (${catalog.reason})`, failed: false }];
  }
  const outcomes = [
    {
      line: `live: ${catalog.entries.length} tc-ready production entries over ${catalog.pages.length} pages`,
      failed: false,
    },
    ...(await liveOutcomes(catalog.entries)),
  ];
  if (process.env['CI'] === 'true') {
    outcomes.push(...(await ingestSmoke(catalog)));
  } else {
    outcomes.push({ line: 'ingest: skipped outside CI', failed: false });
  }
  return outcomes;
}

const fixtureOutcomes = fixtureResponses()
  .filter((response) => response.contentType === 'application/zip')
  .map((response) => checkFixture(response.file, response.bytes, fixtureRows, expectedRowOf(response.file)));
const outcomes = [...fixtureOutcomes, ...(await online())];
for (const outcome of outcomes) {
  console.log(outcome.line);
}
const failures = outcomes.filter((outcome) => outcome.failed).length;
console.log(`contract: ${fixtureOutcomes.length} fixture burritos, ${failures} failed`);
await describeLive();
process.exitCode = failures === 0 ? 0 : 1;
