export type TreeFacts = {
  modules: readonly string[];
  ports: readonly string[];
  events: readonly string[];
};

const numberWords = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

export function countOf(word: string): number | undefined {
  if (/^\d+$/.test(word)) {
    return Number(word);
  }
  const index = numberWords.indexOf(word.toLowerCase());
  return index === -1 ? undefined : index;
}

type Claim = { what: string; anchor: RegExp; source: string; actual: (facts: TreeFacts) => number };

const claims: readonly Claim[] = [
  {
    what: 'modules',
    anchor: /union of (\w+) module interfaces \(`kernelModules`/,
    source: '`kernelModules` in src/lib/kernel.ts',
    actual: (facts) => facts.modules.length,
  },
  {
    what: 'ports',
    anchor: /There are (\w+) \(`Ports`/,
    source: '`Ports` in src/lib/ports.ts',
    actual: (facts) => facts.ports.length,
  },
  {
    what: 'events',
    anchor: /There are (\w+) \(`eventSchemas`/,
    source: '`eventSchemas` in src/lib/domain/events.ts',
    actual: (facts) => facts.events.length,
  },
];

function lowerFirst(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function difference(
  listed: readonly string[],
  actual: readonly string[],
): { missing: string[]; extra: string[] } {
  return {
    missing: actual.filter((name) => !listed.includes(name)),
    extra: listed.filter((name) => !actual.includes(name)),
  };
}

function listFindings(what: string, listed: readonly string[], actual: readonly string[]): string[] {
  const { missing, extra } = difference(listed, actual);
  return [
    ...(missing.length > 0 ? [`architecture.md does not list the ${what} ${missing.join(', ')}`] : []),
    ...(extra.length > 0
      ? [`architecture.md lists ${what} the tree does not have: ${extra.join(', ')}`]
      : []),
  ];
}

function listedEvents(markdown: string): string[] | undefined {
  const anchor = markdown.search(/There are \w+ \(`eventSchemas`/);
  if (anchor === -1) {
    return undefined;
  }
  const block = /```\n([\s\S]*?)```/.exec(markdown.slice(anchor))?.[1];
  return block?.replace(/\([^)]*\)/g, ' ').match(/\b[A-Z]\w+/g) ?? undefined;
}

function listedPorts(markdown: string): string[] | undefined {
  const section = /\n## Ports\n([\s\S]*?)\n## /.exec(markdown)?.[1];
  if (section === undefined) {
    return undefined;
  }
  return section
    .split('\n')
    .flatMap((line) => /^\|\s*([A-Z]\w*)\s*\|/.exec(line)?.[1] ?? [])
    .filter((name) => name !== 'Port')
    .map(lowerFirst);
}

function listedModules(markdown: string): string[] | undefined {
  const tower = /\nlib\/modules\s+([\s\S]*?)\n(?=\S)/.exec(markdown)?.[1];
  if (tower === undefined) {
    return undefined;
  }
  return tower
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((name) => /^[A-Z]\w+$/.test(name))
    .map(lowerFirst);
}

export function architectureDrift(markdown: string, facts: TreeFacts): string[] {
  const findings: string[] = [];
  for (const claim of claims) {
    const word = claim.anchor.exec(markdown)?.[1];
    const stated = word === undefined ? undefined : countOf(word);
    const actual = claim.actual(facts);
    if (stated === undefined) {
      findings.push(`architecture.md no longer states the number of ${claim.what} next to ${claim.source}`);
    } else if (stated !== actual) {
      findings.push(`architecture.md says ${word} ${claim.what}; ${claim.source} has ${actual}`);
    }
  }
  const lists: readonly [string, string[] | undefined, readonly string[]][] = [
    ['modules', listedModules(markdown), facts.modules],
    ['ports', listedPorts(markdown), facts.ports],
    ['events', listedEvents(markdown), facts.events],
  ];
  for (const [what, listed, actual] of lists) {
    if (listed === undefined) {
      findings.push(`architecture.md no longer lists the ${what} where the check reads them`);
    } else {
      findings.push(...listFindings(what, listed, actual));
    }
  }
  return findings;
}

export function portsOf(portsSource: string): string[] {
  const body = /export type Ports = \{([^}]*)\}/.exec(portsSource)?.[1] ?? '';
  return [...body.matchAll(/^\s*(\w+)\s*:/gm)].flatMap((match) => match[1] ?? []);
}
