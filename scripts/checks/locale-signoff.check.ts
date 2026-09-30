import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localeSignOffs, offeredLocales } from '@lib/strings/locales';
import type { Check } from './check.ts';
import { signOffFindings, signOffRows } from './locale-signoff.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

const check: Check = {
  name: 'locale-signoff',
  rule: 'A locale ships only once a native speaker signs it off: the sign-off table in docs/strings-review.md and localeSignOffs in src/lib/strings/locales.ts agree locale by locale (issue #51)',
  run() {
    const rows = signOffRows(readFileSync(join(repositoryRoot, 'docs', 'strings-review.md'), 'utf8'));
    if (rows === undefined) {
      return { status: 'fail', findings: ['docs/strings-review.md has no "## Sign-off" table'] };
    }
    const findings = signOffFindings(rows, localeSignOffs);
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    const signed = Object.values(localeSignOffs).filter((date) => date !== null).length;
    return {
      status: 'pass',
      summary: `${rows.length} drafted locales in the sign-off table, ${signed} signed off; the release offers ${offeredLocales().join(', ')}`,
    };
  },
};

export default check;
