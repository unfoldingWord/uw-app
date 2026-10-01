export type SocketSignal =
  | 'WebSocket'
  | 'XMLHttpRequest'
  | 'fetch'
  | 'EventSource'
  | 'node socket'
  | 'jvm socket'
  | 'apple socket'
  | 'bsd socket';

const signalPatterns: readonly (readonly [SocketSignal, RegExp])[] = [
  ['WebSocket', /\bnew\s+WebSocket\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['fetch', /(?<![\w$])fetch\s*\(/],
  ['EventSource', /\bnew\s+EventSource\s*\(/],
  [
    'node socket',
    /(?:require\s*\(\s*|from\s+|import\s*\(\s*)['"](?:node:)?(?:net|tls|http|https|http2|dgram)['"]/,
  ],
  [
    'jvm socket',
    /\bjava\.net\.(?:Socket|ServerSocket|DatagramSocket|HttpURLConnection|URLConnection)\b|\bokhttp3\b|\.openConnection\s*\(/,
  ],
  [
    'apple socket',
    /\bNSURLSession\b|\bURLSession\b|\bNSURLConnection\b|\bNWConnection\b|\bNWListener\b|\bCFStreamCreatePairWith|\bGCDAsyncSocket\b/,
  ],
  ['bsd socket', /\bsocket\s*\(\s*(?:AF|PF)_INET/],
];

export function socketSignals(source: string): SocketSignal[] {
  return signalPatterns.filter(([, pattern]) => pattern.test(source)).map(([signal]) => signal);
}

export type AdmittedSocketPackage = { signals: readonly SocketSignal[]; why: string };

export function socketFindings(
  found: Readonly<Record<string, readonly SocketSignal[]>>,
  admitted: Readonly<Record<string, AdmittedSocketPackage>>,
  present: ReadonlySet<string>,
): string[] {
  const findings: string[] = [];
  for (const name of Object.keys(found).sort()) {
    const signals = found[name] ?? [];
    const entry = admitted[name];
    if (entry === undefined) {
      findings.push(
        `${name} can open a connection itself (${signals.join(', ')}) and is not admitted in scripts/checks/sockets-admitted.ts; the network is reached only through the Http port`,
      );
      continue;
    }
    const unexpected = signals.filter((signal) => !entry.signals.includes(signal));
    if (unexpected.length > 0) {
      findings.push(
        `${name} now also shows ${unexpected.join(', ')}, beyond what scripts/checks/sockets-admitted.ts admits; read the new code, then widen the entry or refuse the version`,
      );
    }
  }
  for (const name of Object.keys(admitted).sort()) {
    if (!present.has(name)) {
      findings.push(
        `${name} is admitted in scripts/checks/sockets-admitted.ts but is no longer a production package; remove the entry`,
      );
    } else if ((found[name] ?? []).length === 0) {
      findings.push(
        `${name} is admitted in scripts/checks/sockets-admitted.ts but shows no socket signal now; remove the entry`,
      );
    }
  }
  return findings;
}
