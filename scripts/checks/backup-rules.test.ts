import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { backupDomains, dataExtractionFindings } from './backup-rules.ts';

const rulesFile = join(
  import.meta.dirname,
  '..',
  '..',
  'plugins',
  'data-extraction-rules',
  'data_extraction_rules.xml',
);

function rules(sections: Record<string, readonly string[]>): string {
  const body = Object.entries(sections)
    .map(
      ([section, domains]) =>
        `<${section}>${domains.map((domain) => `<exclude domain="${domain}" path="." />`).join('')}</${section}>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="utf-8"?><data-extraction-rules>${body}</data-extraction-rules>`;
}

describe('dataExtractionFindings', () => {
  it('passes the rules the config plugin copies into the Android project', () => {
    expect(dataExtractionFindings(readFileSync(rulesFile, 'utf8'))).toEqual([]);
  });

  it('refuses rules that leave device-to-device transfer or a domain open, or include anything', () => {
    const xml = rules({
      'cloud-backup': backupDomains.filter((domain) => domain !== 'database'),
    }).replace('</cloud-backup>', '<include domain="file" path="notes" /></cloud-backup>');
    expect(dataExtractionFindings(xml)).toEqual([
      'data_extraction_rules.xml includes file/notes in cloud-backup; nothing is backed up or transferred (PRD 12)',
      'data_extraction_rules.xml does not exclude the database domain from cloud-backup',
      'data_extraction_rules.xml has no device-transfer section, so a phone migration on Android 12 and later carries notes and group names (PRD 12)',
    ]);
  });

  it('refuses an exclude narrowed to one path', () => {
    const xml = rules({ 'cloud-backup': backupDomains, 'device-transfer': backupDomains });
    const narrowed = rules({ 'cloud-backup': backupDomains, 'device-transfer': backupDomains }).replace(
      '<device-transfer><exclude domain="root" path="." />',
      '<device-transfer><exclude domain="root" path="packs" />',
    );
    expect(dataExtractionFindings(xml)).toEqual([]);
    expect(dataExtractionFindings(narrowed)).toEqual([
      'data_extraction_rules.xml does not exclude the root domain from device-transfer',
    ]);
  });
});
