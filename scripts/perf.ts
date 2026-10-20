import { performance } from 'node:perf_hooks';
import { languagePackId } from '@lib/domain/pack';
import { burritoArchiveUrl } from '@sim/fixtures/catalog';
import type { FixtureRelease } from '@sim/fixtures/releases';
import { serveCatalog } from '@sim/fixtures/serve';
import { servicesOf } from '@sim/services';
import { createWorld } from '@sim/world';
import { englishTargets, scaleArchive } from './perf/scale.ts';

type PortStat = { calls: number; ms: number };

const portStats = new Map<string, PortStat>();

function timePorts(name: string, target: object): void {
  const record = target as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const original = record[key];
    if (typeof original !== 'function') {
      continue;
    }
    const label = `${name}.${key}`;
    record[key] = (...args: unknown[]): unknown => {
      const started = performance.now();
      const settle = (): void => {
        const stat = portStats.get(label) ?? { calls: 0, ms: 0 };
        stat.calls += 1;
        stat.ms += performance.now() - started;
        portStats.set(label, stat);
      };
      const result: unknown = Reflect.apply(original, target, args);
      if (result instanceof Promise) {
        return result.finally(settle);
      }
      settle();
      return result;
    };
  }
}

function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function syntheticLanguages(releases: readonly FixtureRelease[], count: number): FixtureRelease[] {
  const template = releases.filter((release) => release.language.tag === 'qab');
  const extra: FixtureRelease[] = [];
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let index = 0; index < count; index += 1) {
    const tag = `q${letters[2 + Math.floor(index / 26)] ?? 't'}${letters[index % 26] ?? 'a'}`;
    for (const release of template) {
      extra.push({
        ...release,
        resource: release.resource.replace(/^qab/, tag),
        language: { ...release.language, tag, title: `Language ${tag}`, englishName: `Synthetic ${tag}` },
      });
    }
  }
  return extra;
}

async function measure<T>(
  runs: number,
  work: () => T | Promise<T>,
): Promise<{ median: number; max: number }> {
  const times: number[] = [];
  for (let run = 0; run < runs; run += 1) {
    const started = performance.now();
    await work();
    times.push(performance.now() - started);
  }
  times.sort((left, right) => left - right);
  return { median: times[Math.floor(times.length / 2)] ?? 0, max: times[times.length - 1] ?? 0 };
}

function portTable(top: number): string[] {
  return [...portStats.entries()]
    .sort((left, right) => right[1].ms - left[1].ms)
    .slice(0, top)
    .map(
      ([label, stat]) =>
        `  ${label.padEnd(28)} ${String(stat.calls).padStart(7)} calls ${stat.ms.toFixed(0).padStart(8)} ms`,
    );
}

const world = createWorld();
const scaled: string[] = [];
let scaledBytes = 0;
for (const release of world.fixtures.releases()) {
  const suffix = release.resource.replace(/^qaa_/, '');
  const target = englishTargets[suffix];
  if (release.language.tag !== 'qaa' || release.publisher !== 'unfoldingWord' || target === undefined) {
    continue;
  }
  const archive = world.fixtures.archive(release.publisher, release.resource, release.tag);
  if (archive === undefined) {
    continue;
  }
  const bigger = scaleArchive(archive, target);
  scaledBytes += bigger.length;
  scaled.push(`${release.resource} ${megabytes(bigger.length)}`);
  world.network.serve(burritoArchiveUrl(release), {
    body: bigger,
    headers: { 'content-type': 'application/zip' },
  });
}
const catalogLanguages = Number(process.env.PERF_LANGUAGES ?? '195');
serveCatalog(world.network, [
  ...world.fixtures.releases(),
  ...syntheticLanguages(world.fixtures.releases(), catalogLanguages),
]);
console.log(`perf: scaled ${scaled.join(', ')}; ${megabytes(scaledBytes)} of archives`);

const device = world.device('phone');
for (const [name, port] of Object.entries(device.adapters)) {
  timePorts(name, port as object);
}
const startedBoot = performance.now();
await device.start();
console.log(`perf: start ${(performance.now() - startedBoot).toFixed(0)} ms`);

const refreshed = await measure(1, () => device.kernel.catalog.refresh());
console.log(
  `perf: catalog.refresh ${refreshed.median.toFixed(0)} ms, ${device.kernel.catalog.all().length} releases, ${device.kernel.catalog.languages().length} languages`,
);

await servicesOf(device).languages.select('qaa');
portStats.clear();
const pack = languagePackId('qaa');
const startedInstall = performance.now();
const outcome = await device.kernel.packs.installFromCatalog(pack);
const installMs = performance.now() - startedInstall;
if (!outcome.ok) {
  console.log(`perf: install failed ${outcome.code}`);
  process.exit(1);
}
const portMs = [...portStats.values()].reduce((sum, stat) => sum + stat.ms, 0);
console.log(
  `perf: install ${outcome.pack.burritos.length} resources in ${(installMs / 1000).toFixed(1)} s, ${megabytes(outcome.pack.bytes)} on the phone; time inside ports ${(portMs / 1000).toFixed(1)} s, JavaScript outside ports ${((installMs - portMs) / 1000).toFixed(1)} s`,
);
for (const line of portTable(12)) {
  console.log(line);
}

const services = servicesOf(device);
const landing = await services.study.open();
console.log(`perf: study opens in state ${landing.state}`);
const runs = Number(process.env.PERF_RUNS ?? '5');
const only = process.env.PERF_ONLY;
const calls: [string, () => unknown][] = [
  ['home.header', () => services.home.header()],
  ['home.saved', () => services.home.saved()],
  ['home.download', () => services.home.download()],
  ['home.whatsNew', () => services.home.whatsNew()],
  ['home.continueFormation', () => services.home.continueFormation()],
  ['study.open', () => services.study.open()],
  ['study.passage GEN 1', () => services.study.passage('GEN 1')],
  ['study.passage PSA 119', () => services.study.passage('PSA 119')],
  ['study.passage MAT 5', () => services.study.passage('MAT 5')],
  ['study.books', () => services.study.books()],
  ['study.library', () => services.study.library()],
  ['study.languageName', () => services.study.languageName()],
  ['study.search love', () => services.study.search('love')],
  ['languages.list', () => services.languages.list()],
  ['languages.list "q"', () => services.languages.list('q')],
  ['languages.overline', () => services.languages.overline()],
  ['languages.missing', () => services.languages.missing()],
  ['languages.updates', () => services.languages.updates()],
  ['languages.storage', () => services.languages.storage()],
  ['formation.tracks', () => services.formation.tracks()],
  ['settings.entries', () => services.settings.entries()],
  ['settings.storage', () => services.settings.storage()],
  ['about.summary', () => services.about.summary()],
];
console.log(`perf: screen calls, median and max of ${runs} runs`);
for (const [label, call] of calls.filter(([label]) => only === undefined || label.startsWith(only))) {
  portStats.clear();
  const first = await measure(1, call);
  const warm = await measure(runs, call);
  console.log(
    `  ${label.padEnd(26)} first ${first.median.toFixed(1).padStart(8)} ms  median ${warm.median.toFixed(1).padStart(8)} ms  max ${warm.max.toFixed(1).padStart(8)} ms`,
  );
}
