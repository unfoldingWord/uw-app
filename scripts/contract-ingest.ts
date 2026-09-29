import { languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { fromCatalog } from '@lib/packs/source';
import { createWorld } from '@sim/world';
import { fetchBytes, type LiveCatalog, type Outcome } from './contract-live';

const language = 'en';
const smokeResources = [
  'en_ult',
  'en_tn',
  'en_twl',
  'en_tq',
  'en_tw',
  'en_obs',
  'en_obs-tn',
  'en_obs-sq',
  'en_obs-twl',
] as const;
const smokePassage = 'TIT 1:1';
const smokeStory = 1;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function ingestSmoke(catalog: Extract<LiveCatalog, { ok: true }>): Promise<Outcome[]> {
  try {
    const world = createWorld();
    for (const page of catalog.pages) {
      world.network.serve(page.url, { body: page.body, headers: page.headers });
    }
    const phone = world.device('smoke');
    await phone.start();
    const refreshed = await phone.kernel.catalog.refresh();
    if (!refreshed.ok) {
      return [{ line: `FAIL  ingest: catalog refresh over the real pages: ${refreshed.code}`, failed: true }];
    }
    const chosen = phone.kernel.catalog
      .releases(language)
      .filter(
        (release) =>
          release.publisher === 'unfoldingWord' &&
          smokeResources.some((resource) => resource === release.resource),
      );
    for (const release of chosen) {
      world.network.serve(release.archiveUrl, {
        body: await fetchBytes(release.archiveUrl),
        headers: { 'content-type': 'application/octet-stream' },
      });
    }
    const installed = await phone.kernel.packs.install(fromCatalog(chosen), {
      pack: languagePackId(language),
    });
    if (!installed.ok) {
      return [
        { line: `FAIL  ingest: install of ${chosen.length} real releases: ${installed.code}`, failed: true },
      ];
    }
    const lines: Outcome[] = [
      {
        line: `ok    ingest: refreshed ${refreshed.releases} releases in ${refreshed.languages} languages, installed ${installed.pack.burritos
          .map((burrito) => `${burrito.provenance.resource}@${burrito.provenance.tag}:${burrito.row}`)
          .join(' ')}`,
        failed: false,
      },
    ];
    const reference = parseReference(smokePassage);
    const passage = reference.ok
      ? await phone.kernel.corpus.passage(reference.reference, { language })
      : undefined;
    const verses = passage?.text.verses.length ?? 0;
    const titled = passage?.wordLinks.filter((link) => link.title !== undefined).length ?? 0;
    lines.push({
      line: `${verses > 0 && titled > 0 ? 'ok   ' : 'FAIL '} ingest: ${smokePassage} has ${verses} verses, ${passage?.notes.length ?? 0} notes, ${passage?.wordLinks.length ?? 0} word links (${titled} with a Words title), ${passage?.questions.length ?? 0} questions; "${passage?.text.verses[0]?.text.slice(0, 80) ?? ''}"`,
      failed: verses === 0 || titled === 0,
    });
    const story = await phone.kernel.corpus.story(smokeStory, language);
    const frames = story?.frames.length ?? 0;
    lines.push({
      line: `${frames > 0 ? 'ok   ' : 'FAIL '} ingest: story ${smokeStory} "${story?.title ?? ''}" has ${frames} frames, ${story?.notes.length ?? 0} notes, ${story?.questions.length ?? 0} questions, ${story?.wordLinks.length ?? 0} word links; licence "${story?.provenance.licence ?? ''}"`,
      failed: frames === 0,
    });
    const god = await phone.kernel.corpus.article('tw/bible/kt/god', language);
    lines.push({
      line: `${god === undefined ? 'FAIL ' : 'ok   '} ingest: article tw/bible/kt/god "${god?.title ?? ''}" with ${god?.blocks.length ?? 0} blocks`,
      failed: god === undefined,
    });
    return lines;
  } catch (error) {
    return [{ line: `FAIL  ingest: ${messageOf(error)}`, failed: true }];
  }
}
