import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanProductionPackages } from './socket-scan.ts';
import { socketFindings, socketSignals } from './sockets.ts';

describe('socketSignals (AGENTS.md section 10)', () => {
  it('names each way a package can open a connection', () => {
    expect(socketSignals('const s = new WebSocket(url)')).toEqual(['WebSocket']);
    expect(socketSignals('const x = new XMLHttpRequest()')).toEqual(['XMLHttpRequest']);
    expect(socketSignals('await fetch(url)')).toEqual(['fetch']);
    expect(socketSignals('globalThis.fetch(url)')).toEqual(['fetch']);
    expect(socketSignals("const net = require('net')")).toEqual(['node socket']);
    expect(socketSignals("import http from 'node:http'")).toEqual(['node socket']);
    expect(socketSignals('import okhttp3.OkHttpClient')).toEqual(['jvm socket']);
    expect(socketSignals('val s = java.net.Socket(host, port)')).toEqual(['jvm socket']);
    expect(socketSignals('let task = URLSession.shared.dataTask(with: url)')).toEqual(['apple socket']);
    expect(socketSignals('int fd = socket(AF_INET, SOCK_STREAM, 0);')).toEqual(['bsd socket']);
    expect(socketSignals('const prefetch = 1; refetchAll(); fetcher()')).toEqual([]);
  });
});

describe('socketFindings', () => {
  const admitted = {
    'react-native': { signals: ['fetch', 'WebSocket'] as const, why: 'core networking' },
    'gone-package': { signals: ['fetch'] as const, why: 'was here once' },
    'quiet-package': { signals: ['fetch'] as const, why: 'used to fetch' },
  };

  it('refuses a new package with a hit, a new signal in an admitted one, and a stale entry', () => {
    expect(
      socketFindings(
        {
          'react-native': ['WebSocket', 'fetch', 'node socket'],
          'left-pad-telemetry': ['fetch'],
        },
        admitted,
        new Set(['react-native', 'left-pad-telemetry', 'quiet-package']),
      ),
    ).toEqual([
      'left-pad-telemetry can open a connection itself (fetch) and is not admitted in scripts/checks/sockets-admitted.ts; the network is reached only through the Http port',
      'react-native now also shows node socket, beyond what scripts/checks/sockets-admitted.ts admits; read the new code, then widen the entry or refuse the version',
      'gone-package is admitted in scripts/checks/sockets-admitted.ts but is no longer a production package; remove the entry',
      'quiet-package is admitted in scripts/checks/sockets-admitted.ts but shows no socket signal now; remove the entry',
    ]);
  });

  it('passes when every hit is admitted', () => {
    expect(
      socketFindings(
        { 'react-native': ['fetch'] },
        { 'react-native': admitted['react-native'] },
        new Set(['react-native']),
      ),
    ).toEqual([]);
  });
});

describe('scanProductionPackages', () => {
  it('scans the production closure in node_modules and skips development packages and tests', () => {
    const root = mkdtempSync(join(tmpdir(), 'sockets-'));
    const write = (path: string, text: string) => {
      mkdirSync(join(root, path, '..'), { recursive: true });
      writeFileSync(join(root, path), text);
    };
    write('node_modules/phones-home/index.js', 'module.exports = () => fetch("https://example.com")');
    write('node_modules/phones-home/android/src/main/java/Ping.kt', 'import okhttp3.OkHttpClient');
    write('node_modules/quiet/index.js', 'module.exports = 1');
    write('node_modules/quiet/__tests__/net.test.js', 'new WebSocket("ws://x")');
    write('node_modules/@scope/nested/node_modules/inner/index.mjs', "import net from 'node:net'");
    write('node_modules/dev-tool/index.js', 'fetch(x)');
    const scan = scanProductionPackages(root, {
      '': {},
      'node_modules/phones-home': {},
      'node_modules/quiet': {},
      'node_modules/@scope/nested/node_modules/inner': {},
      'node_modules/dev-tool': { dev: true },
      'node_modules/not-installed': {},
    });
    expect(scan.found).toEqual({ inner: ['node socket'], 'phones-home': ['fetch', 'jvm socket'] });
    expect([...scan.present].sort()).toEqual(['inner', 'phones-home', 'quiet']);
  });
});
