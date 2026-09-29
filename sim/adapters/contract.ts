import { failureCodeOf } from '@lib/domain/failures';
import { allowlistedHttp } from '@lib/guard';
import type { Ports } from '@lib/ports';

export type HttpFixture = {
  url: string;
  body: Uint8Array;
  redirectsOffAllowlist?: string;
};

export type ContractSubject = {
  ports: Ports;
  scratch: string;
  offerExternal(data: Uint8Array): Promise<string>;
  http?: HttpFixture;
};

export type ContractCase = {
  port: keyof Ports;
  name: string;
  run(subject: ContractSubject): Promise<void>;
};

export class ContractFailure extends Error {}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new ContractFailure(message);
  }
}

function same(actual: unknown, expected: unknown, message: string): void {
  const shown = (value: unknown): string =>
    JSON.stringify(value, (_, item: unknown) => (item instanceof Uint8Array ? [...item] : item));
  check(shown(actual) === shown(expected), `${message}: expected ${shown(expected)}, got ${shown(actual)}`);
}

async function codeOf(work: Promise<unknown>): Promise<string> {
  try {
    await work;
  } catch (error) {
    return failureCodeOf(error);
  }
  return 'resolved';
}

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

const filesCases: ContractCase[] = [
  {
    port: 'files',
    name: 'makes directories recursively and idempotently, and writes only into one that exists',
    async run({ ports: { files }, scratch }) {
      await files.mkdir(`${scratch}/a/b/c`);
      await files.mkdir(`${scratch}/a/b/c`);
      check(await files.exists(`${scratch}/a/b`), 'intermediate directory exists');
      same(
        await codeOf(files.writeText(`${scratch}/nowhere/file`, 'x')),
        'files.not-found',
        'write without parent',
      );
      await files.writeText(`${scratch}/a/file.txt`, 'text');
      same(await codeOf(files.mkdir(`${scratch}/a/file.txt`)), 'files.io', 'mkdir over a file');
      same(await codeOf(files.writeText(`${scratch}/a/b`, 'x')), 'files.io', 'write over a directory');
      same(await codeOf(files.readText(`${scratch}/a/missing`)), 'files.not-found', 'read missing');
      same(await codeOf(files.readText(`${scratch}/../outside`)), 'files.io', 'dot segments');
    },
  },
  {
    port: 'files',
    name: 'reads ranges clamped to the end, appends, and replaces on write',
    async run({ ports: { files }, scratch }) {
      await files.mkdir(scratch);
      const path = `${scratch}/range.bin`;
      await files.appendBytes(path, bytes('abc'));
      await files.appendBytes(path, bytes('def'));
      same(await files.readRange(path, 2, 3), bytes('cde'), 'middle range');
      same(await files.readRange(path, 4, 10), bytes('ef'), 'range past the end');
      same(await files.readRange(path, 9, 1), new Uint8Array(), 'range after the end');
      same(await codeOf(files.readRange(path, -1, 1)), 'files.io', 'negative offset');
      await files.writeBytes(path, bytes('z'));
      same(await files.readBytes(path), bytes('z'), 'write replaces');
      same(await files.size(path), 1, 'file size');
    },
  },
  {
    port: 'files',
    name: 'lists sorted entries one level deep with file sizes, and sizes a directory as the sum of its files',
    async run({ ports: { files }, scratch }) {
      await files.mkdir(`${scratch}/pack/inner`);
      await files.writeBytes(`${scratch}/pack/b.bin`, new Uint8Array(3));
      await files.writeBytes(`${scratch}/pack/inner/a.bin`, new Uint8Array(4));
      same(
        await files.list(`${scratch}/pack`),
        [
          { name: 'b.bin', kind: 'file', bytes: 3 },
          { name: 'inner', kind: 'directory', bytes: 0 },
        ],
        'listing',
      );
      same(await files.size(`${scratch}/pack`), 7, 'directory size');
      same(await codeOf(files.list(`${scratch}/missing`)), 'files.not-found', 'list missing');
      check((await files.freeSpace()) > 0, 'free space is reported');
    },
  },
  {
    port: 'files',
    name: 'renames to a free name only, and never replaces what is there',
    async run({ ports: { files }, scratch }) {
      await files.mkdir(`${scratch}/current`);
      await files.writeText(`${scratch}/current/old.txt`, 'old');
      await files.mkdir(`${scratch}/staging`);
      await files.writeText(`${scratch}/staging/new.txt`, 'new');
      same(
        await codeOf(files.rename(`${scratch}/staging`, `${scratch}/current`)),
        'files.io',
        'onto existing',
      );
      same(await files.readText(`${scratch}/current/old.txt`), 'old', 'old copy kept');
      same(
        await codeOf(files.rename(`${scratch}/current`, `${scratch}/current/in`)),
        'files.io',
        'into itself',
      );
      same(
        await codeOf(files.rename(`${scratch}/gone`, `${scratch}/x`)),
        'files.not-found',
        'missing source',
      );
      await files.rename(`${scratch}/current`, `${scratch}/old`);
      await files.rename(`${scratch}/staging`, `${scratch}/current`);
      same(await files.readText(`${scratch}/current/new.txt`), 'new', 'moved directory');
      same(await files.exists(`${scratch}/staging`), false, 'source gone');
      await files.rename(`${scratch}/old/old.txt`, `${scratch}/moved.txt`);
      same(await files.readText(`${scratch}/moved.txt`), 'old', 'moved file');
    },
  },
  {
    port: 'files',
    name: 'removes a tree, treats a missing path as removed, and refuses the root',
    async run({ ports: { files }, scratch }) {
      await files.mkdir(`${scratch}/tree/deep`);
      await files.writeText(`${scratch}/tree/deep/x`, 'x');
      await files.remove(`${scratch}/tree`);
      same(await files.exists(`${scratch}/tree`), false, 'tree removed');
      await files.remove(`${scratch}/never`);
      same(await codeOf(files.remove('')), 'files.io', 'root refused');
    },
  },
  {
    port: 'files',
    name: 'adopts a file the system handed over, and refuses one it did not',
    async run(subject) {
      const { files } = subject.ports;
      await files.mkdir(subject.scratch);
      const external = await subject.offerExternal(bytes('burrito'));
      same(await files.adopt(external, `${subject.scratch}/import.zip`), 7, 'adopted bytes');
      same(await files.readText(`${subject.scratch}/import.zip`), 'burrito', 'adopted content');
      same(
        await codeOf(files.adopt(`${external}.missing`, `${subject.scratch}/other.zip`)),
        'files.not-found',
        'unknown external',
      );
    },
  },
];

const dbCases: ContractCase[] = [
  {
    port: 'db',
    name: 'runs SQL with blobs, rolls back a failed transaction and never interleaves one',
    async run({ ports: { db } }) {
      await db.exec('DROP TABLE IF EXISTS contract_t');
      await db.exec('CREATE TABLE contract_t (n INTEGER, data BLOB)');
      same(
        await db.run('INSERT INTO contract_t VALUES (?, ?)', [1, bytes('ab')]),
        { changes: 1, lastInsertRowId: 1 },
        'run',
      );
      same(await db.get('SELECT data FROM contract_t WHERE n = 1'), { data: bytes('ab') }, 'blob round trip');
      same(await db.get('SELECT n FROM contract_t WHERE n = 9'), undefined, 'no row');
      same(
        await codeOf(
          db.transaction(async (session) => {
            await session.run('INSERT INTO contract_t (n) VALUES (2)');
            throw new ContractFailure('abort');
          }),
        ),
        'unexpected',
        'transaction rejects',
      );
      await Promise.all([
        db.transaction(async (session) => {
          await session.run('INSERT INTO contract_t (n) VALUES (3)');
          await session.run('INSERT INTO contract_t (n) VALUES (4)');
        }),
        db.run('INSERT INTO contract_t (n) VALUES (5)'),
      ]);
      same(
        (await db.all('SELECT n FROM contract_t ORDER BY rowid')).map((row) => row.n),
        [1, 3, 4, 5],
        'rolled back and serialized',
      );
      await db.exec('DROP TABLE contract_t');
    },
  },
  {
    port: 'db',
    name: 'has full-text search (FTS5) for Corpus',
    async run({ ports: { db } }) {
      await db.exec('DROP TABLE IF EXISTS contract_fts');
      await db.exec('CREATE VIRTUAL TABLE contract_fts USING fts5(body)');
      await db.run('INSERT INTO contract_fts (body) VALUES (?)', ['in the beginning was the word']);
      same(
        await db.all("SELECT body FROM contract_fts WHERE contract_fts MATCH 'beginning'"),
        [{ body: 'in the beginning was the word' }],
        'match',
      );
      await db.exec('DROP TABLE contract_fts');
    },
  },
];

const kvCases: ContractCase[] = [
  {
    port: 'kv',
    name: 'gets, sets, deletes and lists keys in order',
    async run({ ports: { kv }, scratch }) {
      const one = `${scratch}.b`;
      const two = `${scratch}.a`;
      same(await kv.get(one), undefined, 'missing key');
      await kv.set(one, 'dark');
      await kv.set(two, 'fr');
      same(await kv.get(one), 'dark', 'read back');
      const keys = (await kv.keys()).filter((key) => key.startsWith(scratch));
      same(keys, [two, one], 'sorted keys');
      await kv.delete(one);
      await kv.delete(two);
      same(await kv.get(one), undefined, 'deleted');
    },
  },
];

const httpCases: ContractCase[] = [
  {
    port: 'http',
    name: 'refuses a host off the allowlist, and a cancelled request before it starts',
    async run({ ports: { http } }) {
      same(
        await allowlistedHttp(http).request({ url: 'https://tracker.example/', timeoutMs: 1000 }),
        { kind: 'refused', host: 'tracker.example' },
        'refused host',
      );
      const cancelled = { cancelled: true, onCancel: (listener: () => void) => listener() };
      same(
        await http.request({ url: 'https://git.door43.org/', timeoutMs: 1000, cancel: cancelled }),
        { kind: 'cancelled' },
        'cancelled',
      );
    },
  },
  {
    port: 'http',
    name: 'downloads to files, resumes with a range, and reports where it landed',
    async run({ ports: { http, files }, scratch, http: fixture }) {
      if (fixture === undefined) {
        return;
      }
      await files.mkdir(scratch);
      const response = await http.request({ url: fixture.url, timeoutMs: 10_000 });
      check(response.kind === 'response' && response.status === 200, 'fixture answers 200');
      check(response.kind === 'response' && response.url === fixture.url, 'final url is reported');
      const to = `${scratch}/download.bin`;
      same(
        await http.download({ url: fixture.url, timeoutMs: 10_000, to }),
        { ...pick(response), bytes: fixture.body.byteLength },
        'download',
      );
      same(await files.readBytes(to), fixture.body, 'downloaded bytes');
      const half = Math.floor(fixture.body.byteLength / 2);
      await files.writeBytes(to, fixture.body.slice(0, half));
      const resumed = await http.download({ url: fixture.url, timeoutMs: 10_000, to, resumeFrom: half });
      check(resumed.kind === 'response' && resumed.status === 206, 'resume answers 206');
      same(await files.readBytes(to), fixture.body, 'resumed bytes');
      if (fixture.redirectsOffAllowlist !== undefined) {
        const landed = await allowlistedHttp(http).request({
          url: fixture.redirectsOffAllowlist,
          timeoutMs: 10_000,
        });
        same(landed.kind, 'refused', 'redirect off the allowlist');
      }
    },
  },
];

function pick(response: Awaited<ReturnType<Ports['http']['request']>>): Record<string, unknown> {
  return response.kind === 'response'
    ? { kind: response.kind, url: response.url, status: response.status, headers: response.headers }
    : { kind: response.kind };
}

const deviceCases: ContractCase[] = [
  {
    port: 'clock',
    name: 'tells the time and the local day',
    async run({ ports: { clock } }) {
      const now = clock.now();
      check(Number.isSafeInteger(now) && now > 0, 'now is a timestamp');
      check(/^\d{4}-\d{2}-\d{2}$/.test(clock.dayOf(now)), 'day is YYYY-MM-DD');
    },
  },
  {
    port: 'ids',
    name: 'mints distinct ids',
    async run({ ports: { ids } }) {
      const [one, two] = [ids.next(), ids.next()];
      check(one !== '' && one !== two, 'ids are distinct');
    },
  },
  {
    port: 'locale',
    name: 'reports a locale tag, time zone and direction',
    async run({ ports: { locale } }) {
      const current = locale.current();
      check(
        current.tag !== '' && current.timeZone !== '' && typeof current.rtl === 'boolean',
        'locale shape',
      );
    },
  },
  {
    port: 'audio',
    name: 'refuses to play what is not loaded',
    async run({ ports: { audio } }) {
      same(audio.status().state, 'idle', 'idle at first');
      same(await codeOf(audio.play()), 'audio.unavailable', 'play without load');
      same(
        await codeOf(audio.load({ kind: 'file', path: 'contract/missing.mp3' })),
        'audio.unavailable',
        'missing file',
      );
    },
  },
  {
    port: 'transport',
    name: 'names its platform and refuses work while unavailable',
    async run({ ports: { transport } }) {
      check(['ios', 'android'].includes(transport.platform()), 'platform');
      check(transport.maxChunkBytes() > 0, 'chunk size');
      if (transport.platform() === 'ios') {
        same(await transport.appPackage(), undefined, 'iOS never shares its package');
      }
      if (!(await transport.available())) {
        same(await codeOf(transport.discover(10)), 'transfer.unavailable', 'discover while unavailable');
      }
    },
  },
];

export const portContract: readonly ContractCase[] = [
  ...filesCases,
  ...dbCases,
  ...kvCases,
  ...httpCases,
  ...deviceCases,
];

export type ContractResult = { port: string; name: string; outcome: 'pass' | 'fail'; message?: string };

export async function runPortContract(
  subject: (index: number) => Promise<ContractSubject>,
): Promise<readonly ContractResult[]> {
  const results: ContractResult[] = [];
  for (const [index, contract] of portContract.entries()) {
    const { port, name } = contract;
    try {
      const given = await subject(index);
      await contract.run(given);
      await given.ports.files.remove(given.scratch);
      results.push({ port, name, outcome: 'pass' });
    } catch (error) {
      results.push({
        port,
        name,
        outcome: 'fail',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
