import { readArchive } from '@lib/burrito/archive';
import { fromUtf8 } from '@lib/burrito/files';
import { validate } from '@lib/burrito/validate';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import type { Kernel } from '@lib/kernel';
import { packRows } from '@lib/packs/burrito';
import { storyImageUrls } from '@lib/packs/built';
import type { CatalogRelease } from '@lib/catalog/types';
import type { SimDevice } from '@sim/device';
import { createWorld, type World } from '@sim/world';
import { fetchBytes, type LiveCatalog, type Outcome } from './contract-live';

const languagesListUrl = 'https://git.door43.org/api/v1/catalog/list/languages?stage=prod&topic=tc-ready';
const minimumEntries = 300;
const minimumLanguages = 190;
const minimumAttachment = 0.95;
const attachmentBooks: readonly string[] = ['RUT', 'TIT', '3JN'];
const defaultLanguages = ['en', 'id'] as const;
const smokePassage = 'TIT 1:1';
const smokeStory = 1;
const fetchConcurrency = 8;
const megabyte = 1_000_000;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function megabytes(bytes: number): string {
  return `${(bytes / megabyte).toFixed(1)} MB`;
}

function outcome(ok: boolean, text: string): Outcome {
  return { line: `${ok ? 'ok   ' : 'FAIL '} ${text}`, failed: !ok };
}

type Served = { downloaded: number; failed: string[] };

async function serveAll(world: World, urls: readonly string[], served: Served): Promise<void> {
  const queue = [...urls];
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      try {
        const bytes = await fetchBytes(url);
        served.downloaded += bytes.byteLength;
        world.network.serve(url, { body: bytes, headers: { 'content-type': 'application/octet-stream' } });
      } catch (error) {
        served.failed.push(`${url}: ${messageOf(error)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: fetchConcurrency }, worker));
}

function diagnosis(label: string, bytes: Uint8Array): Outcome {
  const archive = readArchive(bytes);
  if (!archive.ok) {
    return outcome(false, `default: ${label}: ${archive.rule} at ${archive.path}: ${archive.message}`);
  }
  const report = validate(archive.files, { rows: packRows });
  return report.ok
    ? { line: `note  default: ${label}: validates as ${report.row.id} (${report.row.status})`, failed: false }
    : outcome(false, `default: ${label}: ${report.kind} ${report.rule} at ${report.path}: ${report.message}`);
}

type NotesAttachmentRead = {
  attachment(
    language: string,
    books?: readonly string[],
  ): Promise<readonly { provenance: { resource: string }; quoted: number; attached: number }[]>;
};

function readsAttachment(value: object): value is NotesAttachmentRead {
  return 'attachment' in value && typeof value.attachment === 'function';
}

export async function attachmentOutcome(kernel: Kernel, language: string): Promise<Outcome> {
  const corpus: object = kernel.corpus;
  if (!readsAttachment(corpus)) {
    return outcome(false, 'default: en_tn attachment: the corpus has no attachment read yet (issue #11)');
  }
  const found = (await corpus.attachment(language, attachmentBooks)).find(
    (item) => item.provenance.resource === `${language}_tn`,
  );
  if (found === undefined || found.quoted === 0) {
    return outcome(
      false,
      `default: ${language}_tn attachment: no quoted notes in ${attachmentBooks.join(' ')}`,
    );
  }
  const rate = found.attached / found.quoted;
  return outcome(
    rate >= minimumAttachment,
    `default: ${language}_tn attaches ${found.attached} of ${found.quoted} quoted notes in ${attachmentBooks.join(' ')} (${(rate * 100).toFixed(1)} percent, at least ${minimumAttachment * 100} asked)`,
  );
}

async function servedCatalog(world: World, catalog: Extract<LiveCatalog, { ok: true }>): Promise<Outcome> {
  for (const page of catalog.pages) {
    world.network.serve(page.url, { body: page.body, headers: page.headers });
  }
  const list = await fetchBytes(languagesListUrl);
  world.network.serve(languagesListUrl, { body: list, headers: { 'content-type': 'application/json' } });
  const parsed = JSON.parse(fromUtf8(list)) as { data?: unknown };
  const items: readonly unknown[] = Array.isArray(parsed.data) ? parsed.data : [];
  const named = items.filter(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'lc' in item &&
      typeof item.lc === 'string' &&
      'ang' in item &&
      typeof item.ang === 'string',
  ).length;
  return outcome(
    named >= minimumLanguages,
    `default: languages list has ${items.length} entries, ${named} with lc and ang`,
  );
}

async function readBack(device: SimDevice, language: string, withImages: boolean): Promise<Outcome[]> {
  const lines: Outcome[] = [];
  const reference = parseReference(smokePassage);
  const passage = reference.ok
    ? await device.kernel.corpus.passage(reference.reference, { language })
    : undefined;
  const verses = passage?.text.verses.length ?? 0;
  const helps =
    (passage?.notes.length ?? 0) + (passage?.wordLinks.length ?? 0) + (passage?.questions.length ?? 0);
  lines.push(
    outcome(
      verses > 0 && helps > 0,
      `default: ${language} ${smokePassage} has ${verses} verses, ${passage?.notes.length ?? 0} notes, ${passage?.wordLinks.length ?? 0} word links, ${passage?.questions.length ?? 0} questions, reading ${passage?.text.provenance.resource ?? 'none'}`,
    ),
  );
  const story = await device.kernel.corpus.story(smokeStory, language);
  const pictured = story?.frames.filter((frame) => frame.image !== undefined).length ?? 0;
  const frames = story?.frames.length ?? 0;
  lines.push(
    outcome(
      frames > 0 && (!withImages || pictured === frames),
      `default: ${language} story ${smokeStory} "${story?.title ?? ''}" has ${frames} frames, ${pictured} with a picture`,
    ),
  );
  const god = await device.kernel.corpus.article('tw/bible/kt/god', language);
  lines.push(
    outcome(
      god !== undefined,
      `default: ${language} article tw/bible/kt/god "${god?.title ?? ''}" with ${god?.blocks.length ?? 0} blocks`,
    ),
  );
  return lines;
}

async function installDefault(world: World, device: SimDevice, language: string): Promise<Outcome[]> {
  const pack = languagePackId(language);
  const defaults: readonly CatalogRelease[] = await device.kernel.packs.defaults(pack);
  const served: Served = { downloaded: 0, failed: [] };
  await serveAll(
    world,
    defaults.map((release) => release.archiveUrl),
    served,
  );
  const started = Date.now();
  const installed = await device.kernel.packs.installFromCatalog(pack);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (!installed.ok) {
    const lines = [
      outcome(
        false,
        `default: ${language}: install of ${defaults.length} default releases: ${installed.code}`,
      ),
    ];
    for (const release of defaults) {
      const route = world.network.lookup(release.archiveUrl);
      if (route !== undefined && route.body instanceof Uint8Array) {
        lines.push(diagnosis(`${release.publisher}/${release.resource} ${release.tag}`, route.body));
      }
    }
    return lines;
  }
  const status = await device.kernel.packs.status(language);
  const texts = installed.pack.burritos
    .filter((burrito) => burrito.row === 'text')
    .map((burrito) => burrito.provenance.resource);
  return [
    outcome(
      status.complete && served.failed.length === 0,
      `default: ${language}: installed ${installed.pack.burritos.length} of ${defaults.length} default releases in ${seconds} s, ${megabytes(installed.pack.bytes)} measured on the phone, ${megabytes(served.downloaded)} downloaded; texts ${texts.join(' ')}; failed ${status.failed.map((item) => `${item.publisher}/${item.resource}@${item.tag}:${item.code}`).join(' ') || 'none'}${served.failed.length > 0 ? `; not fetched ${served.failed.join(', ')}` : ''}`,
    ),
    {
      line: `note  default: ${language}: ${installed.pack.burritos.map((burrito) => `${burrito.provenance.resource}@${burrito.provenance.tag} ${megabytes(burrito.bytes)}`).join(', ')}`,
      failed: false,
    },
  ];
}

async function installImages(world: World, device: SimDevice): Promise<Outcome> {
  const source = (await device.kernel.packs.defaults(imagePackId))[0];
  if (source === undefined) {
    return outcome(false, 'default: the catalog lists no source for the Image Pack (unfoldingWord/en_obs)');
  }
  const route = world.network.lookup(source.archiveUrl);
  const archive =
    route !== undefined && route.body instanceof Uint8Array ? readArchive(route.body) : undefined;
  if (archive === undefined || !archive.ok) {
    return outcome(false, 'default: the en_obs archive was not fetched, so the Image Pack cannot be built');
  }
  const urls = storyImageUrls([...archive.files.values()].map((bytes) => fromUtf8(bytes)));
  const served: Served = { downloaded: 0, failed: [] };
  await serveAll(world, urls, served);
  const installed = await device.kernel.packs.installFromCatalog(imagePackId);
  return outcome(
    installed.ok && served.failed.length === 0,
    `default: Image Pack from ${urls.length} pictures: ${installed.ok ? `${megabytes(installed.pack.bytes)} measured on the phone, ${megabytes(served.downloaded)} downloaded` : installed.code}${served.failed.length > 0 ? `; not fetched ${served.failed.slice(0, 5).join(', ')}` : ''}`,
  );
}

export async function ingestSmoke(catalog: Extract<LiveCatalog, { ok: true }>): Promise<Outcome[]> {
  try {
    const world = createWorld();
    const lines: Outcome[] = [
      outcome(
        catalog.entries.length >= minimumEntries,
        `default: paged ${catalog.entries.length} tc-ready production entries over ${catalog.pages.length} pages (at least ${minimumEntries} asked)`,
      ),
      await servedCatalog(world, catalog),
    ];
    const phone = world.device('live');
    await phone.start();
    const refreshed = await phone.kernel.catalog.refresh();
    if (!refreshed.ok) {
      return [...lines, outcome(false, `default: catalog refresh over the real pages: ${refreshed.code}`)];
    }
    const english = phone.kernel.catalog
      .languages()
      .filter((item) => item.englishName === item.autonym).length;
    lines.push(
      outcome(
        refreshed.languages >= minimumLanguages,
        `default: refreshed ${refreshed.releases} releases in ${refreshed.languages} languages (at least ${minimumLanguages} asked); ${english} named in English by their autonym`,
      ),
    );
    for (const language of defaultLanguages) {
      lines.push(...(await installDefault(world, phone, language)));
    }
    lines.push(await installImages(world, phone));
    for (const language of defaultLanguages) {
      lines.push(...(await readBack(phone, language, language === 'en')));
    }
    lines.push(await attachmentOutcome(phone.kernel, 'en'));
    return lines;
  } catch (error) {
    return [outcome(false, `default: ${messageOf(error)}`)];
  }
}
