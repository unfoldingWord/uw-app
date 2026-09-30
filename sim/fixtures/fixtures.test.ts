import { fixtureRows } from './rows';
import { readArchive } from '@lib/burrito/archive';
import { validate } from '@lib/burrito/validate';
import { describe, expect, it } from 'vitest';
import {
  archiveDirectory,
  assetsDirectory,
  catalogFile,
  generateFixtures,
  languagesFile,
  routesFile,
} from './generate.ts';
import { fixtureResponses, generatedFilesOnDisk } from './load.ts';
import { fixtureReleases } from './releases.ts';

const maximumFixtureBytes = 400_000;

describe('fixtures', () => {
  it('rebuild to exactly the checked-in bytes, with nothing stale left on disk', async () => {
    const generated = await generateFixtures();
    const onDisk = generatedFilesOnDisk(
      [archiveDirectory, assetsDirectory],
      [catalogFile, languagesFile, routesFile],
    );
    expect([...onDisk.keys()].sort()).toEqual([...generated.keys()].sort());
    for (const [file, bytes] of generated) {
      expect(onDisk.get(file), file).toEqual(bytes);
    }
  });

  it('stay under a few hundred kilobytes', async () => {
    const generated = await generateFixtures();
    const total = [...generated.values()].reduce((sum, bytes) => sum + bytes.length, 0);
    expect(total).toBeLessThan(maximumFixtureBytes);
  });

  it('serve every release through a route, and every route resolves to a valid burrito', () => {
    const archives = fixtureResponses().filter((response) => response.contentType === 'application/zip');
    expect(archives).toHaveLength(fixtureReleases.length);
    const rows = archives.map((response) => {
      const read = readArchive(response.bytes);
      if (!read.ok) {
        throw new Error(`${response.file}: ${read.message}`);
      }
      expect(read.discarded.length, response.file).toBeGreaterThan(0);
      const report = validate(read.files, { rows: fixtureRows });
      if (!report.ok) {
        throw new Error(`${response.file}: ${report.message}`);
      }
      return report.row.id;
    });
    expect(new Set(rows)).toEqual(
      new Set(['text', 'notes', 'wordLinks', 'questions', 'articles', 'stories', 'storyHelps', 'formation']),
    );
  });

  it('give qab stories and study questions but no formation content', () => {
    const qab = fixtureReleases
      .filter((release) => release.language.tag === 'qab')
      .map((release) => release.subject);
    expect(qab.sort()).toEqual(['Open Bible Stories', 'TSV OBS Study Questions']);
  });

  it('override one image inside the qaa stories burrito, under the CDN picture name', () => {
    const files = (resource: string, publisher = 'unfoldingWord') => {
      const response = fixtureResponses().find(
        (route) => route.file === `sb/${publisher}/${resource}/v1.zip`,
      );
      const read = response ? readArchive(response.bytes) : undefined;
      return read?.ok ? read.files : new Map<string, Uint8Array>();
    };
    const override = files('qaa_obs').get('ingredients/images/obs-en-01-01.jpg');
    const shared = fixtureResponses().find(
      (route) => route.url === 'https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg',
    )?.bytes;
    expect(override).toBeDefined();
    expect(shared).toBeDefined();
    expect(override).not.toEqual(shared);
  });

  it('list a second publisher for one qaa resource', () => {
    const publishers = fixtureReleases
      .filter((release) => release.language.tag === 'qaa' && release.subject === 'Open Bible Stories')
      .map((release) => release.publisher);
    expect(publishers).toEqual(['unfoldingWord', 'Door43-Catalog']);
  });
});
