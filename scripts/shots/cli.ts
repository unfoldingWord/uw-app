import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { imageVariants, sqlWasmPath } from '@sim/web/image';
import { writeContactSheets } from './contact';
import { writeDeviceImages } from './seed';
import { serveStatic } from './serve';
import { launchBrowser, shootAll } from './shoot';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const shotsDirectory = join(repositoryRoot, 'shots');
const harnessDirectory = join(shotsDirectory, '.harness');
const webDirectory = join(harnessDirectory, 'web');

const { values } = parseArgs({
  options: {
    only: { type: 'string' },
    modes: { type: 'string' },
    'no-build': { type: 'boolean', default: false },
  },
});

const listOf = (value: string | undefined): string[] | undefined =>
  value === undefined ? undefined : value.split(',').map((item) => item.trim());

function exportWeb(): void {
  rmSync(webDirectory, { recursive: true, force: true });
  const result = spawnSync(
    join(repositoryRoot, 'node_modules', '.bin', 'expo'),
    ['export', '--platform', 'web', '--output-dir', webDirectory],
    { cwd: repositoryRoot, encoding: 'utf8', env: { ...process.env, CI: '1' } },
  );
  if (result.status !== 0) {
    console.log(`${result.stdout}${result.stderr}`.trim());
    throw new Error('shots: the web export failed');
  }
  console.log('shots: web export built');
}

async function main(): Promise<void> {
  const written = await writeDeviceImages(harnessDirectory, imageVariants);
  console.log(`shots: ${written.length} device images from the sim fixture world`);
  mkdirSync(join(harnessDirectory, 'qa'), { recursive: true });
  copyFileSync(
    join(repositoryRoot, 'node_modules', 'sql.js', 'dist', 'sql-wasm-browser.wasm'),
    join(harnessDirectory, sqlWasmPath),
  );
  if (!values['no-build']) {
    exportWeb();
  }
  const served = await serveStatic({
    root: webDirectory,
    mounts: [{ prefix: '/qa/', directory: join(harnessDirectory, 'qa') }],
  });
  try {
    const only = listOf(values.only);
    const modes = listOf(values.modes);
    const results = await shootAll({
      origin: served.origin,
      output: shotsDirectory,
      ...(only === undefined ? {} : { only }),
      ...(modes === undefined ? {} : { modes }),
    });
    const browser = await launchBrowser();
    try {
      await writeContactSheets(browser, shotsDirectory, results);
    } finally {
      await browser.close();
    }
    for (const result of results) {
      const notes = [
        ...result.errors.map((error) => `error: ${error}`),
        ...result.unnamed.map((item) => `unnamed ${item.role} ${item.width}x${item.height}`),
        ...result.small.map(
          (item) => `small ${item.role} "${item.name.slice(0, 40)}" ${item.width}x${item.height}`,
        ),
        ...result.escaped.map((item) => `text escapes its box by ${item.by} px "${item.text}"`),
        ...(result.overflow ? ['overflows the 360 px width'] : []),
      ];
      console.log(`${notes.length === 0 ? 'ok  ' : 'note'} ${result.shot} ${result.mode}`);
      for (const note of notes) {
        console.log(`       ${note}`);
      }
    }
    const small = results.reduce((sum, result) => sum + result.small.length, 0);
    const escaped = results.reduce((sum, result) => sum + result.escaped.length, 0);
    console.log(
      `shots: ${results.length} screenshots and the contact sheet in shots/; ${small} targets under 44 px counting hit slop, ${escaped} text boxes escaping their parent`,
    );
  } finally {
    await served.close();
  }
}

await main();
