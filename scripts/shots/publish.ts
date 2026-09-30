import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { launchBrowser } from './shoot';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const shotsDirectory = join(repositoryRoot, 'shots');
const publishedDirectory = join(repositoryRoot, 'docs', 'shots');
const sheets = ['light', 'dark', 'reduced-blur', 'rtl', 'ur', 'hi', 'large-text'] as const;
const publishedWidth = 760;
const largestSheetBytes = 1_500_000;

async function main(): Promise<void> {
  mkdirSync(publishedDirectory, { recursive: true });
  const browser = await launchBrowser();
  try {
    for (const sheet of sheets) {
      const source = readFileSync(join(shotsDirectory, `contact-${sheet}.png`)).toString('base64');
      const page = await browser.newPage({
        viewport: { width: publishedWidth, height: 800 },
        deviceScaleFactor: 1,
      });
      await page.setContent(
        `<html><body style="margin:0"><img style="display:block;width:${publishedWidth}px" src="data:image/png;base64,${source}"></body></html>`,
      );
      await page.waitForLoadState('load');
      const target = join(publishedDirectory, `contact-${sheet}.png`);
      await page.screenshot({ path: target, fullPage: true });
      await page.close();
      const bytes = statSync(target).size;
      console.log(`shots: docs/shots/contact-${sheet}.png ${bytes} bytes`);
      if (bytes > largestSheetBytes) {
        throw new Error(`shots: contact-${sheet}.png is over ${largestSheetBytes} bytes`);
      }
    }
  } finally {
    await browser.close();
  }
  const report = JSON.parse(readFileSync(join(shotsDirectory, 'report.json'), 'utf8')) as unknown;
  const published = Array.isArray(report)
    ? report.map((entry: unknown) =>
        typeof entry === 'object' && entry !== null && 'file' in entry && typeof entry.file === 'string'
          ? { ...entry, file: relative(repositoryRoot, entry.file) }
          : entry,
      )
    : report;
  writeFileSync(join(publishedDirectory, 'report.json'), `${JSON.stringify(published, null, 2)}\n`);
  console.log('shots: docs/shots/report.json');
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
