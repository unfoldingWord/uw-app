export type SignOffRow = { readonly locale: string; readonly reviewer: string; readonly date: string };

export type SignOffs = Readonly<Record<string, string | null>>;

const heading = /^## Sign-off\s*$/;
const anyHeading = /^#{1,6} /;
const separator = /^\|[\s|:-]+\|$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const reviewDoc = 'docs/strings-review.md';

export function signOffRows(markdown: string): SignOffRow[] | undefined {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) {
    return undefined;
  }
  const rows: SignOffRow[] = [];
  let header = true;
  for (const line of lines.slice(start + 1)) {
    if (anyHeading.test(line)) {
      break;
    }
    const text = line.trim();
    if (!text.startsWith('|') || separator.test(text)) {
      continue;
    }
    if (header) {
      header = false;
      continue;
    }
    const [locale = '', reviewer = '', date = ''] = text
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim().replaceAll('`', ''));
    rows.push({ locale, reviewer, date });
  }
  return rows;
}

function signedDate(row: SignOffRow): string | null | undefined {
  if (row.reviewer === '' && row.date === '') {
    return null;
  }
  return row.reviewer !== '' && isoDate.test(row.date) ? row.date : undefined;
}

export function signOffFindings(rows: readonly SignOffRow[], code: SignOffs): string[] {
  const drafted = Object.keys(code);
  const findings: string[] = [];
  const first = new Map<string, SignOffRow>();
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.locale, (counts.get(row.locale) ?? 0) + 1);
    if (!first.has(row.locale)) {
      first.set(row.locale, row);
    }
  }
  for (const [locale, count] of counts) {
    if (!drafted.includes(locale)) {
      findings.push(`${locale}: not a drafted locale`);
    } else if (count > 1) {
      findings.push(`${locale}: listed ${count} times in ${reviewDoc}`);
    }
  }
  const documented = new Map<string, string | null>();
  for (const [locale, row] of first) {
    if (!drafted.includes(locale)) {
      continue;
    }
    const date = signedDate(row);
    if (date === undefined) {
      findings.push(`${locale}: a sign-off needs both a reviewer and a date (YYYY-MM-DD)`);
    } else {
      documented.set(locale, date);
    }
  }
  for (const locale of drafted) {
    const inCode = code[locale] ?? null;
    if (!first.has(locale)) {
      findings.push(`${locale}: missing from the sign-off table in ${reviewDoc}`);
      continue;
    }
    if (!documented.has(locale)) {
      continue;
    }
    const inDoc = documented.get(locale) ?? null;
    if (inDoc !== null && inDoc !== inCode) {
      findings.push(
        `${locale}: signed off in ${reviewDoc} on ${inDoc} but localeSignOffs has ${inCode ?? 'null'}`,
      );
    } else if (inDoc === null && inCode !== null) {
      findings.push(`${locale}: localeSignOffs has ${inCode} but ${reviewDoc} has no sign-off`);
    }
  }
  return findings;
}
