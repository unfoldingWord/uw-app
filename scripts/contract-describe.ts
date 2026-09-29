import { strFromU8, unzipSync } from 'fflate';

const door43 = 'https://git.door43.org';
const catalogSearch = `${door43}/api/v1/catalog/search`;
const describeTimeoutMs = 30000;
const pageLimit = 50;
const maxPages = 40;
const longString = 300;
const listedPaths = 40;
const listedIngredients = 8;
const sampleCharacters = 1500;
const pagingHeaders = ['x-total-count', 'link'] as const;
const peripheralFiles =
  /(^|\/)(manifest\.ya?ml|config\.ya?ml|toc\.ya?ml|media\.ya?ml|LICENSE\.md|README\.md)$/i;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Entry = { [key: string]: Json };

type Sample = { readonly name: string; readonly pick: (entries: readonly Entry[]) => Entry | undefined };

function print(label: string, value: unknown): void {
  console.log(`describe: ${label} ${JSON.stringify(value)}`);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function trimmed(value: Json): Json {
  if (typeof value === 'string') {
    return value.length > longString ? `${value.slice(0, longString)}...[${value.length} chars]` : value;
  }
  if (Array.isArray(value)) {
    return value.map(trimmed);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, trimmed(inner)]));
  }
  return value;
}

function isEntry(value: Json | undefined): value is Entry {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

async function fetchResponse(url: string): Promise<Response | string> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(describeTimeoutMs) });
  } catch (error) {
    return `fetch failed: ${messageOf(error)}`;
  }
}

async function fetchJson(
  url: string,
): Promise<{ status: number | string; headers: Headers | undefined; body: Json | undefined }> {
  const response = await fetchResponse(url);
  if (typeof response === 'string') {
    return { status: response, headers: undefined, body: undefined };
  }
  try {
    return { status: response.status, headers: response.headers, body: (await response.json()) as Json };
  } catch (error) {
    return {
      status: `${response.status} unparsable: ${messageOf(error)}`,
      headers: response.headers,
      body: undefined,
    };
  }
}

function dataOf(body: Json | undefined): Entry[] {
  if (!isEntry(body)) {
    return [];
  }
  const data = body['data'];
  return Array.isArray(data) ? data.filter(isEntry) : [];
}

function summaryOf(entry: Entry): Entry {
  const flavors = Object.fromEntries(Object.entries(entry).filter(([key]) => /flavor/i.test(key)));
  return {
    full_name: entry['full_name'] ?? null,
    subject: entry['subject'] ?? null,
    language: entry['language'] ?? null,
    branch_or_tag_name: entry['branch_or_tag_name'] ?? null,
    metadata_type: entry['metadata_type'] ?? null,
    ...flavors,
  };
}

async function describeCatalog(): Promise<Entry[]> {
  const all: Entry[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${catalogSearch}?stage=prod&topic=tc-ready&limit=${pageLimit}&page=${page}`;
    const { status, headers, body } = await fetchJson(url);
    const entries = dataOf(body);
    if (page === 1) {
      print('catalog page 1 status', {
        url,
        status,
        headers: Object.fromEntries(pagingHeaders.map((name) => [name, headers?.get(name) ?? null])),
        topLevelKeys: isEntry(body) ? Object.keys(body) : null,
        entries: entries.length,
      });
      entries.slice(0, 2).forEach((entry, index) => print(`catalog entry ${index + 1}`, trimmed(entry)));
    }
    print('catalog page', { page, status, count: entries.length });
    all.push(...entries);
    if (entries.length < pageLimit) {
      break;
    }
  }
  print('catalog total', { entries: all.length });
  if (process.env['CONTRACT_DESCRIBE'] === 'full') {
    for (const entry of all) {
      print('catalog item', summaryOf(entry));
    }
  }
  return all;
}

function byName(fullName: string): Sample {
  return { name: fullName, pick: (entries) => entries.find((entry) => entry['full_name'] === fullName) };
}

function byLanguage(label: string, language: string, subject: RegExp, index: number): Sample {
  return {
    name: label,
    pick: (entries) =>
      entries.filter(
        (entry) =>
          entry['language'] === language &&
          typeof entry['subject'] === 'string' &&
          subject.test(entry['subject']),
      )[index],
  };
}

const samples: readonly Sample[] = [
  ...[
    'unfoldingWord/en_ult',
    'unfoldingWord/en_ust',
    'unfoldingWord/en_tn',
    'unfoldingWord/en_twl',
    'unfoldingWord/en_tq',
    'unfoldingWord/en_tw',
    'unfoldingWord/en_ta',
    'unfoldingWord/en_obs',
    'unfoldingWord/en_obs-sq',
    'unfoldingWord/en_obs-tn',
    'unfoldingWord/en_obs-tq',
    'unfoldingWord/en_obs-twl',
    'unfoldingWord/en_obs-tf',
    'unfoldingWord/hbo_uhb',
    'unfoldingWord/el-x-koine_ugnt',
  ].map(byName),
  byLanguage('es-419 literal text', 'es-419', /Bible/i, 0),
  byLanguage('es-419 simplified text', 'es-419', /Bible/i, 1),
  byName('Door43-Catalog/sw_obs'),
];

async function lookupOutsideList(fullName: string): Promise<Entry | undefined> {
  const [owner, repo] = fullName.split('/');
  if (owner === undefined || repo === undefined) {
    return undefined;
  }
  const url = `${catalogSearch}?stage=prod&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
  const { status, body } = await fetchJson(url);
  const found = dataOf(body).find((entry) => entry['full_name'] === fullName);
  print('sample lookup', { fullName, url, status, found: found ? summaryOf(found) : null });
  return found;
}

function zipEntries(bytes: Uint8Array): { name: string; size: number }[] {
  const listed: { name: string; size: number }[] = [];
  unzipSync(bytes, {
    filter: (file) => {
      listed.push({ name: file.name, size: file.originalSize });
      return false;
    },
  });
  return listed;
}

function extract(bytes: Uint8Array, wanted: ReadonlySet<string>): Record<string, Uint8Array> {
  return unzipSync(bytes, { filter: (file) => wanted.has(file.name) });
}

function summarizeIngredients(ingredients: Json | undefined): Json {
  if (!isEntry(ingredients)) {
    return { ingredients: ingredients ?? null };
  }
  const keys = Object.keys(ingredients);
  const mimeTypes: Record<string, number> = {};
  for (const value of Object.values(ingredients)) {
    const mimeType = isEntry(value) && typeof value['mimeType'] === 'string' ? value['mimeType'] : 'none';
    mimeTypes[mimeType] = (mimeTypes[mimeType] ?? 0) + 1;
  }
  return {
    count: keys.length,
    mimeTypes,
    first: Object.fromEntries(keys.slice(0, listedIngredients).map((key) => [key, ingredients[key] ?? null])),
  };
}

function firstOfEachMimeType(ingredients: Json | undefined): Map<string, string> {
  const chosen = new Map<string, string>();
  if (!isEntry(ingredients)) {
    return chosen;
  }
  for (const [key, value] of Object.entries(ingredients)) {
    const mimeType = isEntry(value) && typeof value['mimeType'] === 'string' ? value['mimeType'] : 'none';
    if (!chosen.has(mimeType)) {
      chosen.set(mimeType, key);
    }
  }
  return chosen;
}

function describeArchive(label: string, bytes: Uint8Array): void {
  const listed = zipEntries(bytes);
  const topLevel = [...new Set(listed.map((file) => file.name.split('/')[0] ?? ''))];
  print('archive entries', {
    label,
    bytes: bytes.byteLength,
    entries: listed.length,
    topLevel,
    first: listed.slice(0, listedPaths),
  });
  const metadataName = listed
    .map((file) => file.name)
    .filter((name) => name === 'metadata.json' || /^[^/]+\/metadata\.json$/.test(name))
    .sort((left, right) => left.length - right.length)[0];
  const root = metadataName === undefined ? '' : metadataName.slice(0, -'metadata.json'.length);
  const peripherals = listed
    .map((file) => file.name)
    .filter((name) => peripheralFiles.test(name))
    .slice(0, 6);
  const first = extract(bytes, new Set([...(metadataName ? [metadataName] : []), ...peripherals]));
  let metadata: Json | undefined;
  if (metadataName === undefined) {
    print('metadata', { label, metadata: 'missing' });
  } else {
    const raw = first[metadataName];
    try {
      metadata = raw ? (JSON.parse(strFromU8(raw)) as Json) : undefined;
    } catch (error) {
      print('metadata', { label, path: metadataName, unparsable: messageOf(error) });
    }
    if (isEntry(metadata)) {
      const { ingredients, ...rest } = metadata;
      print('metadata', {
        label,
        path: metadataName,
        metadata: rest,
        ingredients: summarizeIngredients(ingredients),
      });
    }
  }
  for (const name of peripherals) {
    const content = first[name];
    print('peripheral sample', {
      label,
      path: name,
      text: content ? strFromU8(content).slice(0, sampleCharacters) : null,
    });
  }
  const chosen = firstOfEachMimeType(isEntry(metadata) ? metadata['ingredients'] : undefined);
  const wanted = new Map([...chosen].map(([mimeType, key]) => [`${root}${key}`, mimeType]));
  const samplesByPath = extract(bytes, new Set(wanted.keys()));
  for (const [path, mimeType] of wanted) {
    const content = samplesByPath[path];
    print('ingredient sample', {
      label,
      mimeType,
      path,
      text:
        content === undefined
          ? 'absent from zip'
          : mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('yaml')
            ? strFromU8(content).slice(0, sampleCharacters)
            : `binary ${content.byteLength} bytes`,
    });
  }
}

async function describeSample(sample: Sample, entries: readonly Entry[]): Promise<void> {
  const entry =
    sample.pick(entries) ?? (sample.name.includes('/') ? await lookupOutsideList(sample.name) : undefined);
  const fullName = entry?.['full_name'];
  const tag = entry?.['branch_or_tag_name'];
  if (typeof fullName !== 'string' || typeof tag !== 'string') {
    print('sample', { sample: sample.name, status: 'not in the catalog' });
    return;
  }
  const url = `${door43}/${fullName}/sb/${tag}.zip`;
  const response = await fetchResponse(url);
  if (typeof response === 'string') {
    print('sample', { sample: sample.name, url, status: response });
    return;
  }
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    const text = await response.text().catch((error: unknown) => `unreadable: ${messageOf(error)}`);
    print('sample', {
      sample: sample.name,
      url,
      status: response.status,
      contentType,
      body: text.slice(0, sampleCharacters),
    });
    return;
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  print('sample', {
    sample: sample.name,
    url,
    status: response.status,
    contentType,
    bytes: bytes.byteLength,
  });
  try {
    describeArchive(`${fullName} ${tag}`, bytes);
  } catch (error) {
    print('archive unreadable', {
      sample: sample.name,
      error: messageOf(error),
      head: strFromU8(bytes.slice(0, 200)),
    });
  }
}

export async function describeLive(): Promise<void> {
  const mode = process.env['CONTRACT_DESCRIBE'];
  if (mode !== '1' && mode !== 'full') {
    return;
  }
  try {
    const entries = await describeCatalog();
    if (entries.length === 0) {
      print('skipped', { reason: 'the catalog returned no entries, offline or refused' });
      return;
    }
    for (const sample of samples) {
      await describeSample(sample, entries);
    }
  } catch (error) {
    print('failed', { error: messageOf(error) });
  }
}
