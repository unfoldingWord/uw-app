import { describe, expect, it } from 'vitest';
import { scanSource } from './strings-literals.ts';
import { auditTable, copyFindings, placeholdersOf } from './strings-table.ts';

const english = {
  'a.title': 'Download {language}',
  'a.count': { one: '{count} resource in {language}', other: '{count} resources in {language}' },
};

describe('string table audit', () => {
  it('reads placeholders once each, sorted', () => {
    expect(placeholdersOf('{b} and {a} and {b}')).toEqual(['a', 'b']);
  });

  it('accepts a complete translation and an explicit null', () => {
    const table = {
      'a.title': 'Descargar {language}',
      'a.count': null,
    };
    expect(auditTable('es-419', table, english, ['one', 'many', 'other'])).toEqual([]);
  });

  it('reports a missing key, an extra key, a changed placeholder and a kind mismatch', () => {
    expect(
      auditTable('fr', { 'a.count': 'plain', 'a.extra': 'x' }, english, ['one', 'many', 'other']),
    ).toEqual([
      'fr: a.title is missing; write a translation or null',
      'fr: a.extra is not in the English table',
      'fr: a.count is a plain string here but plural in English',
    ]);
    expect(
      auditTable('fr', { 'a.title': 'Télécharger', 'a.count': null }, english, ['one', 'other']),
    ).toEqual(['fr: a.title leaves out {language}']);
  });

  it('asks for every plural form the locale selects, and lets a form other than other drop the count', () => {
    const table = {
      'a.title': 'تنزيل {language}',
      'a.count': { one: 'مورد واحد في {language}', other: '{count} موارد في {langue}' },
    };
    expect(auditTable('ar', table, english, ['zero', 'one', 'two', 'few', 'many', 'other'])).toEqual([
      'ar: a.count needs the plural forms zero, two, few, many',
      'ar: a.count (other) uses {langue}, which English does not',
    ]);
    expect(
      auditTable(
        'zh-Hans',
        { 'a.title': '下载{language}', 'a.count': { one: 'x', other: '{count} 个' } },
        english,
        ['other'],
      ),
    ).toEqual([
      'zh-Hans: a.count has plural forms this locale never selects: one',
      'zh-Hans: a.count (other) leaves out {language}',
    ]);
  });

  it('holds the copy to the voice rules', () => {
    expect(copyFindings('en', 'k', 'Welcome to unfoldingword.org, from unfoldingWord')).toEqual([]);
    expect(copyFindings('en', 'k', 'Great news! Notes & words — from Unfoldingword')).toEqual([
      'en: k has an exclamation mark',
      'en: k has an em dash',
      'en: k writes Unfoldingword; the name is unfoldingWord',
      'en: k uses &; spell out and',
    ]);
    expect(copyFindings('es-419', 'k', '¡Listo con la ULT ✨')).toEqual([
      'es-419: k has an exclamation mark',
      'es-419: k has an emoji',
      'es-419: k names a resource by its internal code',
    ]);
  });
});

describe('literal copy scan', () => {
  const screen = [
    "import { GlassButton } from '@shared/glass';",
    'export function Screen({ label }: { label: string }) {',
    '  const note = `Sent with its licence`;',
    '  return (',
    '    <GlassButton accessibilityLabel={label} testID="primary-action" title={ready ? "Read now" : label}>',
    '      Choose your language',
    '      {"Or continue"}',
    '    </GlassButton>',
    '  );',
    '}',
  ].join('\n');

  it('finds JSX text, copy props and prose literals in a screen', () => {
    expect(scanSource('Screen.tsx', screen, { prose: true })).toEqual([
      { file: 'Screen.tsx', line: 3, text: 'Sent with its licence' },
      { file: 'Screen.tsx', line: 5, text: 'Read now' },
      { file: 'Screen.tsx', line: 6, text: 'Choose your language' },
      { file: 'Screen.tsx', line: 7, text: 'Or continue' },
    ]);
  });

  it('leaves prose outside JSX alone where only JSX is scanned, and ignores module names and ids', () => {
    expect(scanSource('Shared.tsx', screen, { prose: false }).map((finding) => finding.text)).toEqual([
      'Read now',
      'Choose your language',
      'Or continue',
    ]);
    expect(
      scanSource('Plain.tsx', 'const family = \'Nunito Sans\';\n<Icon name="chevron-right" />', {
        prose: false,
      }),
    ).toEqual([]);
  });

  it('reads a string table key as a key, not as copy, where the table is known', () => {
    const keyed = [
      "const tabs = { notes: 'study.helps.notes' } as const;",
      "const label = words.t(open ? 'study.helps.hideResponse' : 'study.helps.showResponse');",
      "const other = 'not.a key';",
    ].join('\n');
    const keys = new Set(['study.helps.notes', 'study.helps.hideResponse', 'study.helps.showResponse']);
    expect(scanSource('Keyed.tsx', keyed, { prose: true, keys }).map((finding) => finding.text)).toEqual([
      'not.a key',
    ]);
  });
});
