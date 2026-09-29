import { describe, expect, it } from 'vitest';
import type { Ports } from '@lib/ports';
import { createMemoryAudio } from './audio';
import { createMemoryClock } from './clock';
import { portContract, runPortContract, type ContractSubject } from './contract';
import { createMemoryDb } from './db';
import { createMemoryFiles } from './files';
import { createMemoryHttp, createMemoryNetwork } from './http';
import { createMemoryIds } from './ids';
import { createMemoryKv } from './kv';
import { createMemoryLocale } from './locale';
import { createMemoryPicker } from './picker';
import { createMemoryShareSheet } from './share-sheet';
import { createTransportBus } from './transport';

const fixtureUrl = 'https://git.door43.org/unfoldingWord/qaa_ult/sb/v1.zip';
const escapingUrl = 'https://git.door43.org/unfoldingWord/qaa_ult/sb/escape.zip';
const fixtureBody = new TextEncoder().encode('a burrito archive of some length');

function memorySubject(index: number): ContractSubject {
  const clock = createMemoryClock();
  const files = createMemoryFiles();
  const network = createMemoryNetwork();
  network.serve(fixtureUrl, { body: fixtureBody });
  network.serve(escapingUrl, { body: '', redirect: 'https://tracker.example/landing' });
  const ports: Ports = {
    clock,
    ids: createMemoryIds(),
    files,
    db: createMemoryDb(),
    kv: createMemoryKv(),
    http: createMemoryHttp({ network, files }),
    transport: createTransportBus().transport({ platform: 'ios' }),
    audio: createMemoryAudio({ clock }),
    shareSheet: createMemoryShareSheet(),
    picker: createMemoryPicker(),
    locale: createMemoryLocale(),
  };
  let external = 0;
  return {
    ports,
    scratch: `contract/${index}`,
    offerExternal: async (data) => {
      external += 1;
      const uri = `content://picker/${external}`;
      files.offerExternal(uri, data);
      return uri;
    },
    http: { url: fixtureUrl, body: fixtureBody, redirectsOffAllowlist: escapingUrl },
  };
}

describe('port contract, against the memory adapters', () => {
  it('holds for every case, the suite a device runs against the platform adapters', async () => {
    const results = await runPortContract(async (index) => memorySubject(index));
    expect(results.filter((result) => result.outcome === 'fail')).toEqual([]);
    expect(results).toHaveLength(portContract.length);
    expect(new Set(results.map((result) => result.port))).toEqual(
      new Set(['files', 'db', 'kv', 'http', 'clock', 'ids', 'locale', 'audio', 'transport']),
    );
  });

  it('reports a case that breaks the contract instead of passing it', async () => {
    const results = await runPortContract(async (index) => {
      const subject = memorySubject(index);
      const rename = subject.ports.files.rename;
      subject.ports.files.rename = async (from, to) => {
        await subject.ports.files.remove(to);
        await rename(from, to);
      };
      return subject;
    });
    expect(results.filter((result) => result.outcome === 'fail').map((result) => result.name)).toEqual([
      'renames to a free name only, and never replaces what is there',
    ]);
  });
});
