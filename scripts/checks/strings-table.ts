export type TableValue = string | { readonly [category: string]: string | undefined } | null;

export type Table = { readonly [key: string]: TableValue };

const placeholder = /\{(\w+)\}/g;

export function placeholdersOf(text: string): string[] {
  return [...new Set([...text.matchAll(placeholder)].map((match) => match[1] ?? ''))].sort();
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function formsOf(value: TableValue): Record<string, string> | undefined {
  if (value === null || typeof value === 'string') {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function auditPlaceholders(
  where: string,
  text: string,
  expected: readonly string[],
  exact: boolean,
): string[] {
  const found = placeholdersOf(text);
  const unknown = found.filter((name) => !expected.includes(name));
  if (unknown.length > 0) {
    return [`${where} uses {${unknown.join('}, {')}}, which English does not`];
  }
  if (exact && !sameList(found, expected)) {
    const missing = expected.filter((name) => !found.includes(name));
    return [`${where} leaves out {${missing.join('}, {')}}`];
  }
  return [];
}

function auditPlural(
  where: string,
  forms: Record<string, string>,
  englishOther: string,
  categories: readonly string[],
): string[] {
  const findings: string[] = [];
  const names = Object.keys(forms);
  const missing = categories.filter((category) => !names.includes(category));
  const extra = names.filter((name) => !categories.includes(name));
  if (missing.length > 0) {
    findings.push(`${where} needs the plural forms ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    findings.push(`${where} has plural forms this locale never selects: ${extra.join(', ')}`);
  }
  const expected = placeholdersOf(englishOther);
  for (const [category, text] of Object.entries(forms)) {
    findings.push(...auditPlaceholders(`${where} (${category})`, text, expected, category === 'other'));
  }
  return findings;
}

export function auditTable(
  locale: string,
  table: Table,
  english: Table,
  categories: readonly string[],
): string[] {
  const findings: string[] = [];
  for (const key of Object.keys(english)) {
    if (!(key in table)) {
      findings.push(`${locale}: ${key} is missing; write a translation or null`);
    }
  }
  for (const key of Object.keys(table)) {
    if (!(key in english)) {
      findings.push(`${locale}: ${key} is not in the English table`);
    }
  }
  for (const [key, source] of Object.entries(english)) {
    const value = table[key];
    const where = `${locale}: ${key}`;
    if (value === undefined || value === null) {
      continue;
    }
    const sourceForms = formsOf(source);
    const valueForms = formsOf(value);
    if (typeof source === 'string') {
      findings.push(
        ...(typeof value === 'string'
          ? auditPlaceholders(where, value, placeholdersOf(source), true)
          : [`${where} is plural here but a plain string in English`]),
      );
    } else if (sourceForms !== undefined) {
      findings.push(
        ...(valueForms === undefined
          ? [`${where} is a plain string here but plural in English`]
          : auditPlural(where, valueForms, sourceForms.other ?? '', categories)),
      );
    }
  }
  return findings;
}

export function textsOf(table: Table): { key: string; text: string }[] {
  return Object.entries(table).flatMap(([key, value]) => {
    if (value === null) {
      return [];
    }
    if (typeof value === 'string') {
      return [{ key, text: value }];
    }
    return Object.entries(formsOf(value) ?? {}).map(([category, text]) => ({
      key: `${key} (${category})`,
      text,
    }));
  });
}

const emoji = /\p{Extended_Pictographic}/u;
const brand = /unfoldingword(?!\.org)/giu;
const internalNames = /\b(ULT|UST|GLT|GST|RC|Resource Container)\b/u;

const fixedByRequirement: ReadonlySet<string> = new Set(['onboarding.tagline', 'onboarding.footer']);

function sentencesIn(locale: string, text: string): number {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const spoken = text
    .replace(/\{[^}]*\}/gu, 'Name')
    .replace(/\bunfoldingWord\b/gu, 'UnfoldingWord')
    .replace(/\u104a/gu, ',');
  return [...segmenter.segment(spoken)].filter((part) => part.segment.trim() !== '').length;
}

export function copyFindings(locale: string, key: string, text: string): string[] {
  const where = `${locale}: ${key}`;
  const findings: string[] = [];
  if (/[!¡！]/u.test(text)) {
    findings.push(`${where} has an exclamation mark`);
  }
  if (emoji.test(text)) {
    findings.push(`${where} has an emoji`);
  }
  if (text.includes('—')) {
    findings.push(`${where} has an em dash`);
  }
  for (const match of text.matchAll(brand)) {
    if (match[0] !== 'unfoldingWord') {
      findings.push(`${where} writes ${match[0]}; the name is unfoldingWord`);
    }
  }
  if (internalNames.test(text)) {
    findings.push(`${where} names a resource by its internal code`);
  }
  if (text !== text.trim() || text.includes('  ')) {
    findings.push(`${where} has stray spaces`);
  }
  const sentences = sentencesIn(locale, text);
  if (sentences > 1 && !fixedByRequirement.has(key.replace(/ \(.*\)$/u, ''))) {
    findings.push(`${where} has ${String(sentences)} sentences; support copy is one sentence`);
  }
  if (locale === 'en' && text.includes('&')) {
    findings.push(`${where} uses &; spell out and`);
  }
  return findings;
}
