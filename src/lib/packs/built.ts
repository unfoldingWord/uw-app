import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { burritoMetadata, licenceIngredient } from '../burrito/build';
import { fromUtf8, ingredientsDirectory, metadataPath, utf8 } from '../burrito/files';
import { mimeTypes, unpinnedFlavors, storyImagesDirectory } from '../burrito/flavors';
import { licenceKeyOf } from '../burrito/licence';
import type { IngredientEntry, JsonValue, Scope } from '../burrito/metadata';
import { unpackArchive } from '../burrito/unpack';
import type { BurritoFacts, IngredientFact } from '../burrito/validate';
import { isStoryAudio } from '../catalog/built';
import type { ReleaseAsset } from '../catalog/types';
import { bookByCode } from '../domain/books';
import type { FailureCode } from '../domain/failures';
import { archiveUrlOf, door43 } from '../domain/release';
import type { ModulePorts } from '../module';
import type { HttpDownloaded } from '../ports';
import type { CatalogChoice } from './source';
import { parentOf, removeIfPresent } from './tree';

const assetTimeoutMs = 120_000;

const hashChunk = 64 * 1024;

const storyImageUrl = /https:\/\/cdn\.door43\.org\/obs\/jpg\/360px\/obs-[a-z]+-\d{2}-\d{2}\.jpg/g;

const storyFile = /(?:^|\/)content\/\d{1,2}\.md$/;

const storiesScope = 'OBS';

const generator = { softwareName: 'unfoldingWord app', softwareVersion: '1' } as const;

const storyCount = 50;

const parallelDownloads = 4;

export type OnItems = (done: number, total: number) => void;

export type BuiltDirectory = {
  ok: true;
  directory: string;
  facts: BurritoFacts;
  written: readonly string[];
};

export type Built = BuiltDirectory | { ok: false; code: FailureCode };

type Planned = { url: string; path: string; mimeType: string; scope?: Scope };

type Licence = { statement: string; text: string };

function problemOf(outcome: HttpDownloaded): FailureCode | undefined {
  switch (outcome.kind) {
    case 'offline':
      return 'http.offline';
    case 'timeout':
      return 'http.timeout';
    case 'refused':
      return 'http.host-refused';
    case 'cancelled':
      return 'http.cancelled';
    case 'response':
      return outcome.status >= 200 && outcome.status < 300 ? undefined : 'http.status';
  }
}

async function factOfFile(ports: ModulePorts, path: string): Promise<IngredientFact> {
  const size = await ports.files.size(path);
  const hash = md5.create();
  for (let offset = 0; offset < size; offset += hashChunk) {
    hash.update(await ports.files.readRange(path, offset, Math.min(hashChunk, size - offset)));
  }
  return { size, md5: bytesToHex(hash.digest()) };
}

function extensionOf(name: string): string {
  return (name.split('.').at(-1) ?? '').toLowerCase();
}

function audioMimeType(name: string): string | undefined {
  switch (extensionOf(name)) {
    case 'm4a':
      return mimeTypes.m4a;
    case 'mp3':
      return mimeTypes.mp3;
    default:
      return undefined;
  }
}

function tokensOf(name: string): string[] {
  return name.replace(/\.[a-z0-9]+$/i, '').split(/[_\s-]+/);
}

function storyAudio(asset: ReleaseAsset, mimeType: string): Planned | undefined {
  const story = tokensOf(asset.name)
    .map((token) => (/^\d{1,2}$/.test(token) ? Number(token) : Number.NaN))
    .find((number) => number >= 1 && number <= storyCount);
  if (story === undefined) {
    return undefined;
  }
  const number = String(story).padStart(2, '0');
  return {
    url: asset.url,
    path: `${storiesScope}/${storiesScope}_${number}.${extensionOf(asset.name)}`,
    mimeType,
    scope: { [storiesScope]: [String(story)] },
  };
}

function chapterAudio(asset: ReleaseAsset, mimeType: string): Planned | undefined {
  const tokens = tokensOf(asset.name);
  for (const [index, token] of tokens.entries()) {
    const book = token.toUpperCase();
    const chapter = Number(tokens[index + 1]);
    if (bookByCode(book) !== undefined && Number.isInteger(chapter) && chapter > 0) {
      return {
        url: asset.url,
        path: `${book}/${book}_${String(chapter).padStart(3, '0')}.${extensionOf(asset.name)}`,
        mimeType,
        scope: { [book]: [String(chapter)] },
      };
    }
  }
  return undefined;
}

export function plannedAudio(assets: readonly ReleaseAsset[], byStory: boolean): Planned[] {
  const planned = new Map<string, Planned>();
  for (const asset of [...assets].sort((left, right) => (left.name < right.name ? -1 : 1))) {
    const mimeType = audioMimeType(asset.name);
    const item =
      mimeType === undefined
        ? undefined
        : byStory
          ? storyAudio(asset, mimeType)
          : chapterAudio(asset, mimeType);
    if (item !== undefined && !planned.has(item.path)) {
      planned.set(item.path, item);
    }
  }
  return [...planned.values()];
}

export function storyImageUrls(texts: Iterable<string>): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(storyImageUrl)) {
      found.add(match[0]);
    }
  }
  return [...found].sort();
}

function mergedScope(planned: readonly Planned[]): Scope {
  const merged: Record<string, string[]> = {};
  for (const item of planned) {
    for (const [book, chapters] of Object.entries(item.scope ?? {})) {
      merged[book] = [...(merged[book] ?? []), ...chapters];
    }
  }
  return merged;
}

function rawLicenceUrl(choice: Pick<CatalogChoice, 'publisher' | 'resource' | 'tag'>): string {
  return `${door43}/${choice.publisher}/${choice.resource}/raw/tag/${choice.tag}/LICENSE.md`;
}

async function releaseLicence(ports: ModulePorts, choice: CatalogChoice): Promise<Licence | FailureCode> {
  const response = await ports.http.request({ url: rawLicenceUrl(choice), timeoutMs: assetTimeoutMs });
  if (response.kind !== 'response') {
    return problemOf(response) ?? 'http.status';
  }
  if (response.status < 200 || response.status >= 300) {
    return 'http.status';
  }
  return { statement: `Copyright © ${choice.publisher}`, text: fromUtf8(response.body) };
}

type Source = { urls: string[]; licence: Licence };

async function storiesSource(
  ports: ModulePorts,
  choice: CatalogChoice,
  stage: string,
): Promise<Source | FailureCode> {
  const archive = `${stage}.source.zip`;
  const outcome = await ports.http.download({
    url: archiveUrlOf(choice),
    to: archive,
    timeoutMs: assetTimeoutMs,
  });
  const problem = problemOf(outcome);
  if (problem !== undefined) {
    await removeIfPresent(ports.files, archive);
    return problem;
  }
  const unpacked = `${stage}.source`;
  try {
    const read = await unpackArchive(ports.files, archive, { into: unpacked, hash: false });
    await removeIfPresent(ports.files, archive);
    if (!read.ok || read.directory === undefined) {
      return 'pack.invalid-burrito';
    }
    const urls = new Set<string>();
    for (const key of read.written.filter((path) => storyFile.test(path))) {
      for (const url of storyImageUrls([await ports.files.readText(`${read.directory}/${key}`)])) {
        urls.add(url);
      }
    }
    const metadata = read.facts.metadata;
    const licenceKey = licenceKeyOf(read.written);
    const licenceText = licenceKey === undefined ? undefined : read.facts.text(licenceKey);
    const statement = metadata === undefined ? undefined : statementOf(fromUtf8(metadata));
    if (licenceText === undefined || statement === undefined) {
      return 'pack.no-provenance';
    }
    return { urls: [...urls].sort(), licence: { statement, text: licenceText } };
  } finally {
    await removeIfPresent(ports.files, archive);
    await removeIfPresent(ports.files, unpacked);
  }
}

function statementOf(metadata: string): string | undefined {
  try {
    const parsed = JSON.parse(metadata) as { copyright?: { shortStatements?: { statement?: unknown }[] } };
    const statement = parsed.copyright?.shortStatements?.[0]?.statement;
    return typeof statement === 'string' && statement.trim() !== '' ? statement : undefined;
  } catch {
    return undefined;
  }
}

async function writeIngredients(
  ports: ModulePorts,
  directory: string,
  planned: readonly Planned[],
  onBytes: (bytes: number) => void,
  onItems: OnItems,
): Promise<Map<string, IngredientEntry> | FailureCode> {
  const written: (IngredientEntry | undefined)[] = planned.map(() => undefined);
  const inFlight = new Map<number, number>();
  let received = 0;
  let done = 0;
  let next = 0;
  let problem: FailureCode | undefined;
  const report = (): void => {
    onBytes(received + [...inFlight.values()].reduce((sum, bytes) => sum + bytes, 0));
  };
  const fetchOne = async (index: number, item: Planned): Promise<void> => {
    const path = `${directory}/${ingredientsDirectory}${item.path}`;
    await ports.files.mkdir(parentOf(path));
    inFlight.set(index, 0);
    const outcome = await ports.http.download({
      url: item.url,
      to: path,
      timeoutMs: assetTimeoutMs,
      onProgress: (bytes) => {
        inFlight.set(index, bytes);
        report();
      },
    });
    inFlight.delete(index);
    problem ??= problemOf(outcome);
    if (problem !== undefined) {
      return;
    }
    const fact = await factOfFile(ports, path);
    received += fact.size;
    done += 1;
    written[index] = {
      checksum: { md5: fact.md5 },
      mimeType: item.mimeType,
      size: fact.size,
      ...(item.scope === undefined ? {} : { scope: item.scope }),
    };
    report();
    onItems(done, planned.length);
  };
  const worker = async (): Promise<void> => {
    while (problem === undefined && next < planned.length) {
      const index = next;
      next += 1;
      const item = planned[index];
      if (item !== undefined) {
        await fetchOne(index, item);
      }
    }
  };
  onItems(0, planned.length);
  await Promise.all(Array.from({ length: Math.min(parallelDownloads, planned.length) }, worker));
  if (problem !== undefined) {
    return problem;
  }
  const entries = new Map<string, IngredientEntry>();
  planned.forEach((item, index) => {
    const entry = written[index];
    if (entry !== undefined) {
      entries.set(`${ingredientsDirectory}${item.path}`, entry);
    }
  });
  return entries;
}

type Shape = {
  flavorType: string;
  flavor: string;
  language: { tag: string; name: { en: string } };
  abbreviation: string;
  flavorDetails?: { readonly [detail: string]: JsonValue };
  currentScope?: Scope;
};

async function finish(
  ports: ModulePorts,
  directory: string,
  choice: CatalogChoice,
  shape: Shape,
  licence: Licence,
  entries: Map<string, IngredientEntry>,
): Promise<BuiltDirectory> {
  const licenceKey = `${ingredientsDirectory}${licenceIngredient}`;
  const licenceBytes = utf8(licence.text);
  await ports.files.writeBytes(`${directory}/${licenceKey}`, licenceBytes);
  const facts = new Map<string, IngredientFact>();
  for (const [key, entry] of entries) {
    facts.set(key, { size: entry.size, md5: entry.checksum.md5 });
  }
  const licenceFact = await factOfFile(ports, `${directory}/${licenceKey}`);
  facts.set(licenceKey, licenceFact);
  const listed: Record<string, IngredientEntry> = Object.fromEntries(
    [
      ...entries.entries(),
      [
        licenceKey,
        { checksum: { md5: licenceFact.md5 }, mimeType: mimeTypes.markdown, size: licenceFact.size },
      ],
    ].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  );
  const metadata = burritoMetadata(
    {
      publisher: choice.publisher,
      resource: choice.resource,
      commit: choice.commit ?? '',
      dateCreated: choice.published ?? '',
      generator,
      language: shape.language,
      name: { en: choice.title ?? choice.resource },
      abbreviation: { en: shape.abbreviation },
      flavorType: shape.flavorType,
      flavor: shape.flavor,
      ...(shape.flavorDetails === undefined ? {} : { flavorDetails: shape.flavorDetails }),
      ...(shape.currentScope === undefined ? {} : { currentScope: shape.currentScope }),
      licence: { statement: licence.statement },
    },
    listed,
  );
  const metadataBytes = utf8(`${JSON.stringify(metadata, null, 2)}\n`);
  await ports.files.writeBytes(`${directory}/${metadataPath}`, metadataBytes);
  return {
    ok: true,
    directory,
    facts: {
      metadata: metadataBytes,
      fact: (key) => facts.get(key),
      text: (key) => (key === licenceKey ? licence.text : undefined),
    },
    written: [metadataPath, ...Object.keys(listed)],
  };
}

export async function buildImagePack(
  ports: ModulePorts,
  choice: CatalogChoice,
  directory: string,
  onBytes: (bytes: number) => void,
  onItems: OnItems,
): Promise<Built> {
  const source = await storiesSource(ports, choice, directory);
  if (typeof source === 'string') {
    return { ok: false, code: source };
  }
  if (source.urls.length === 0) {
    return { ok: false, code: 'pack.invalid-burrito' };
  }
  const planned = source.urls.map((url) => ({
    url,
    path: `${storyImagesDirectory}${url.split('/').at(-1) ?? url}`,
    mimeType: mimeTypes.jpeg,
  }));
  const entries = await writeIngredients(ports, directory, planned, onBytes, onItems);
  if (typeof entries === 'string') {
    return { ok: false, code: entries };
  }
  return finish(
    ports,
    directory,
    choice,
    {
      ...unpinnedFlavors.images,
      language: { tag: 'zxx', name: { en: 'No linguistic content' } },
      abbreviation: 'obs-images',
    },
    source.licence,
    entries,
  );
}

export async function buildAudioPack(
  ports: ModulePorts,
  choice: CatalogChoice,
  directory: string,
  onBytes: (bytes: number) => void,
  onItems: OnItems,
): Promise<Built> {
  const byStory = isStoryAudio({ subject: choice.subject ?? '', resource: choice.resource });
  const planned = plannedAudio(choice.assets ?? [], byStory);
  if (planned.length === 0) {
    return { ok: false, code: 'pack.invalid-burrito' };
  }
  const licence = await releaseLicence(ports, choice);
  if (typeof licence === 'string') {
    return { ok: false, code: licence };
  }
  const entries = await writeIngredients(ports, directory, planned, onBytes, onItems);
  if (typeof entries === 'string') {
    return { ok: false, code: entries };
  }
  return finish(
    ports,
    directory,
    choice,
    {
      ...unpinnedFlavors.audio,
      language: { tag: choice.language, name: { en: choice.language } },
      abbreviation: `${choice.resource}-audio`,
      flavorDetails: {
        performance: ['singleVoice', 'reading'],
        formats: { format1: { compression: extensionOf(planned[0]?.path ?? '') } },
      },
      currentScope: mergedScope(planned),
    },
    licence,
    entries,
  );
}
