const throughPort = (port: string) => `src/lib reaches this through the ${port} port (AGENTS.md rule 2).`;
const notInLib = 'src/lib is pure TypeScript with no host globals (AGENTS.md rule 2).';

export const libRestrictedGlobals: { name: string; message: string }[] = [
  { name: 'Date', message: throughPort('Clock') },
  { name: 'performance', message: throughPort('Clock') },
  { name: 'setTimeout', message: throughPort('Clock') },
  { name: 'setInterval', message: throughPort('Clock') },
  { name: 'clearTimeout', message: throughPort('Clock') },
  { name: 'clearInterval', message: throughPort('Clock') },
  { name: 'setImmediate', message: throughPort('Clock') },
  { name: 'requestAnimationFrame', message: throughPort('Clock') },
  { name: 'crypto', message: throughPort('Ids') },
  { name: 'fetch', message: throughPort('Http') },
  { name: 'XMLHttpRequest', message: throughPort('Http') },
  { name: 'WebSocket', message: throughPort('Http') },
  { name: 'EventSource', message: throughPort('Http') },
  { name: 'localStorage', message: throughPort('Kv') },
  { name: 'sessionStorage', message: throughPort('Kv') },
  { name: 'indexedDB', message: throughPort('Db') },
  { name: 'navigator', message: throughPort('Locale') },
  { name: 'window', message: notInLib },
  { name: 'document', message: notInLib },
  { name: 'self', message: notInLib },
  { name: 'global', message: notInLib },
  { name: 'globalThis', message: notInLib },
  { name: 'process', message: notInLib },
  { name: 'Buffer', message: notInLib },
  { name: 'require', message: notInLib },
  { name: 'module', message: notInLib },
  { name: '__dirname', message: notInLib },
  { name: '__filename', message: notInLib },
  {
    name: 'console',
    message: 'src/lib reports through events in the journal, never the console (AGENTS.md section 10).',
  },
];

export const libRestrictedProperties: { object: string; property: string; message: string }[] = [
  { object: 'Math', property: 'random', message: throughPort('Ids') },
];
