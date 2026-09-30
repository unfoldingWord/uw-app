import { readArchive } from '@lib/burrito/archive';
import { pinnedRows, type ContractRow, type RowId } from '@lib/burrito/flavors';
import { readProvenance } from '@lib/burrito/metadata';
import { unparsedTsv, unparsedTsvMessage } from '@lib/burrito/unparsed';
import { validate, type ValidationReport } from '@lib/burrito/validate';
import { readingOfText } from '@lib/corpus/readings';

const door43 = 'https://git.door43.org';
const catalogSearch = `${door43}/api/v1/catalog/search?stage=prod&topic=tc-ready`;
const catalogTimeoutMs = 15_000;
const archiveTimeoutMs = 90_000;
const pageLimit = 50;
const maxPages = 40;

export type Outcome = { line: string; failed: boolean };

export type LiveEntry = {
  full_name?: unknown;
  branch_or_tag_name?: unknown;
  subject?: unknown;
  language?: unknown;
  commit_sha?: unknown;
  released?: unknown;
};

type Reading = 'literal' | 'simplified';

type LiveSample = {
  readonly fullName: string;
  readonly row: RowId;
  readonly reading?: Reading;
  readonly gap?: string;
};

const liveSamples: readonly LiveSample[] = [
  { fullName: 'unfoldingWord/en_ult', row: 'text', reading: 'literal' },
  { fullName: 'unfoldingWord/en_ust', row: 'text', reading: 'simplified' },
  { fullName: 'unfoldingWord/hbo_uhb', row: 'text' },
  { fullName: 'unfoldingWord/el-x-koine_ugnt', row: 'text' },
  { fullName: 'es-419_gl/es-419_glt', row: 'text', reading: 'literal' },
  { fullName: 'es-419_gl/es-419_gst', row: 'text', reading: 'simplified' },
  { fullName: 'unfoldingWord/en_tn', row: 'notes' },
  { fullName: 'unfoldingWord/en_twl', row: 'wordLinks' },
  { fullName: 'unfoldingWord/en_tq', row: 'questions' },
  { fullName: 'unfoldingWord/en_tw', row: 'articles' },
  { fullName: 'unfoldingWord/en_ta', row: 'articles' },
  { fullName: 'unfoldingWord/en_obs', row: 'stories' },
  { fullName: 'Door43-Catalog/sw_obs', row: 'stories' },
  { fullName: 'unfoldingWord/en_obs-tn', row: 'storyHelps' },
  { fullName: 'unfoldingWord/en_obs-sq', row: 'storyHelps' },
  { fullName: 'unfoldingWord/en_obs-tq', row: 'storyHelps' },
  { fullName: 'unfoldingWord/en_obs-twl', row: 'storyHelps' },
  {
    fullName: 'unfoldingWord/en_obs-tf',
    row: 'formation',
    gap: 'the sb archive for en_obs-tf is a known supply gap',
  },
];

const liveRows: readonly ContractRow[] = pinnedRows;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function fetchBytes(url: string, timeoutMs = archiveTimeoutMs): Promise<Uint8Array> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export type LiveCatalog =
  | {
      ok: true;
      entries: LiveEntry[];
      pages: readonly { url: string; body: Uint8Array; headers: Record<string, string> }[];
    }
  | { ok: false; reason: string };

export async function fetchLiveCatalog(): Promise<LiveCatalog> {
  const entries: LiveEntry[] = [];
  const pages: { url: string; body: Uint8Array; headers: Record<string, string> }[] = [];
  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const url = `${catalogSearch}&limit=${pageLimit}&page=${page}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(catalogTimeoutMs) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      const body = new Uint8Array(await response.arrayBuffer());
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });
      pages.push({ url, body, headers });
      const document = JSON.parse(new TextDecoder().decode(body)) as { data?: unknown };
      const data = Array.isArray(document.data) ? (document.data as LiveEntry[]) : [];
      entries.push(...data);
      if (data.length < pageLimit) {
        break;
      }
    }
  } catch (error) {
    return { ok: false, reason: messageOf(error) };
  }
  return { ok: true, entries, pages };
}

function readingOf(report: ValidationReport, sample: LiveSample): Reading | undefined {
  if (!report.ok || sample.reading === undefined) {
    return undefined;
  }
  const [publisher, resource = ''] = sample.fullName.split('/');
  const language = report.metadata.languages[0]?.tag ?? publisher ?? '';
  const reading = readingOfText(resource, language, report.metadata.identification);
  return reading === 'literal' || reading === 'simplified' ? reading : undefined;
}

export function checkArchive(
  label: string,
  bytes: Uint8Array,
  rows: readonly ContractRow[],
  expected: RowId,
  reading?: Reading,
  resource?: string,
): Outcome {
  const archive = readArchive(bytes);
  if (!archive.ok) {
    return { line: `FAIL  ${label}: ${archive.rule} at ${archive.path}: ${archive.message}`, failed: true };
  }
  const report = validate(archive.files, { rows });
  if (!report.ok) {
    return {
      line: `FAIL  ${label}: ${report.kind} ${report.rule} at ${report.path}: ${report.message}`,
      failed: true,
    };
  }
  const provenance = readProvenance(report.metadata);
  const origin = provenance
    ? `${provenance.publisher}/${provenance.resource} commit ${provenance.commit}`
    : 'no provenance';
  const rowWrong = report.row.id !== expected;
  const found =
    reading === undefined
      ? undefined
      : readingOf(report, { fullName: resource ?? '', row: expected, reading });
  const readingWrong = reading !== undefined && found !== reading;
  const failed = rowWrong || readingWrong;
  const flavor = `${report.metadata.type.flavorType.name}/${report.metadata.type.flavorType.flavor.name}`;
  const details = [
    `${report.row.id} (${report.row.status}) ${flavor}`,
    ...(reading === undefined ? [] : [`reads ${found ?? 'unknown'}`]),
    origin,
    ...(rowWrong ? [`expected ${expected}`] : []),
    ...(readingWrong ? [`expected ${reading}`] : []),
  ];
  const unparsed = unparsedTsvMessage(unparsedTsv(archive.files));
  const note = unparsed === undefined ? '' : `\nnote  ${label}: ${unparsed}`;
  return { line: `${failed ? 'FAIL ' : 'ok   '} ${label}: ${details.join(', ')}${note}`, failed };
}

export async function liveOutcomes(entries: readonly LiveEntry[]): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  for (const sample of liveSamples) {
    const entry = entries.find((candidate) => candidate.full_name === sample.fullName);
    if (typeof entry?.branch_or_tag_name !== 'string') {
      outcomes.push({
        line: `FAIL  live ${sample.fullName}: not in the tc-ready production catalog`,
        failed: true,
      });
      continue;
    }
    const label = `live ${sample.fullName} ${entry.branch_or_tag_name}`;
    const url = `${door43}/${sample.fullName}/sb/${entry.branch_or_tag_name}.zip`;
    let bytes: Uint8Array;
    try {
      bytes = await fetchBytes(url);
    } catch (error) {
      outcomes.push(
        sample.gap === undefined
          ? { line: `FAIL  ${label}: ${messageOf(error)}`, failed: true }
          : { line: `gap   ${label}: ${messageOf(error)} (${sample.gap})`, failed: false },
      );
      continue;
    }
    const resource = sample.fullName.split('/')[1] ?? '';
    outcomes.push(checkArchive(label, bytes, liveRows, sample.row, sample.reading, resource));
  }
  return outcomes;
}
