import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { build } from 'esbuild';
import { transformSync } from '@babel/core';
import { createWorld } from '@sim/world';
import { englishTargets, scaleArchive } from './perf/scale.ts';

const hermes = process.env.HERMES;
const work = join(tmpdir(), 'uw-app-perf-engines');
mkdirSync(work, { recursive: true });

const world = createWorld();
const archiveOf = (resource: string): Uint8Array => {
  const release = world.fixtures.releases().find((item) => item.resource === resource);
  const archive =
    release === undefined
      ? undefined
      : world.fixtures.archive(release.publisher, release.resource, release.tag);
  const target = englishTargets[resource.replace(/^qaa_/, '')];
  if (archive === undefined || target === undefined) {
    throw new Error(`no fixture archive for ${resource}`);
  }
  return scaleArchive(archive, target);
};
const decoder = new TextDecoder();
const entryText = (zip: Uint8Array, suffix: string): string => {
  const files = unzipSync(zip);
  const name = Object.keys(files).find((key) => key.endsWith(suffix));
  return name === undefined ? '' : decoder.decode(files[name]);
};
const literal = archiveOf('qaa_ult');
const notes = archiveOf('qaa_tn');
const device = world.device('phone');
await device.start();
await device.kernel.catalog.refresh();
const input = {
  usfm: entryText(literal, 'PSA.usfm'),
  tsv: entryText(notes, 'PSA.tsv'),
  zip: Buffer.from(literal).toString('base64'),
  releases: device.kernel.catalog.all(),
};

const bundled = await build({
  entryPoints: [join(import.meta.dirname, 'perf/engine-bench.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2017',
  write: false,
  logLevel: 'warning',
  tsconfig: join(import.meta.dirname, '..', 'tsconfig.json'),
});
const plugins = [
  '@babel/plugin-transform-classes',
  '@babel/plugin-transform-block-scoping',
  '@babel/plugin-transform-arrow-functions',
];
const lowered = transformSync(bundled.outputFiles[0]?.text ?? '', {
  babelrc: false,
  configFile: false,
  compact: true,
  plugins,
})?.code;
const script = join(work, 'bench.js');
writeFileSync(script, `var perfInput = ${JSON.stringify(input)};\n${lowered ?? ''}`);

const rows = (output: string): Map<string, number> =>
  new Map(
    output
      .trim()
      .split('\n')
      .map((line) => line.split('\t'))
      .map(([label, value]) => [label ?? '', Number(value)]),
  );
const node = rows(execFileSync(process.execPath, [script], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const engine =
  hermes !== undefined && existsSync(hermes)
    ? rows(execFileSync(hermes, ['-w', script], { encoding: 'utf8', maxBuffer: 1 << 26 }))
    : undefined;
console.log(
  `perf-engines: one scaled English book and archive; times in ms${engine === undefined ? '; set HERMES to a hermes binary for the second column' : ''}`,
);
for (const [label, value] of node) {
  const other = engine?.get(label);
  const ratio = other === undefined || value === 0 ? '' : `  x${(other / value).toFixed(1)}`;
  console.log(
    `  ${label.padEnd(24)} node ${String(value).padStart(10)}${other === undefined ? '' : `  hermes ${String(other).padStart(10)}${ratio}`}`,
  );
}
