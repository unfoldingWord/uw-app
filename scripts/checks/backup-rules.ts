export const backupDomains: readonly string[] = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
];

const sections = ['cloud-backup', 'device-transfer'] as const;

const commentPattern = /<!--[\s\S]*?-->/g;

const attributePattern = /([\w:.-]+)\s*=\s*"([^"]*)"/g;

const wholeDomain = new Set(['.', '']);

function sectionBody(xml: string, section: string): string | undefined {
  const match = new RegExp(`<${section}\\b[^>]*>([\\s\\S]*?)</${section}>`).exec(xml);
  return match === null ? undefined : (match[1] ?? '');
}

function rulesOf(body: string, element: 'include' | 'exclude'): { domain: string; path: string }[] {
  return [...body.matchAll(new RegExp(`<${element}\\b([^>]*)>`, 'g'))].map((match) => {
    const attributes = new Map(
      [...(match[1] ?? '').matchAll(attributePattern)].map((pair) => [pair[1], pair[2]]),
    );
    return { domain: attributes.get('domain') ?? '', path: attributes.get('path') ?? '' };
  });
}

export function dataExtractionFindings(source: string): string[] {
  const xml = source.replace(commentPattern, '');
  const findings: string[] = [];
  for (const section of sections) {
    const body = sectionBody(xml, section);
    if (body === undefined) {
      findings.push(
        section === 'device-transfer'
          ? 'data_extraction_rules.xml has no device-transfer section, so a phone migration on Android 12 and later carries notes and group names (PRD 12)'
          : 'data_extraction_rules.xml has no cloud-backup section, so Android 12 and later backs the app up to the cloud (PRD 12)',
      );
      continue;
    }
    for (const rule of rulesOf(body, 'include')) {
      findings.push(
        `data_extraction_rules.xml includes ${rule.domain}/${rule.path} in ${section}; nothing is backed up or transferred (PRD 12)`,
      );
    }
    const excluded = new Set(
      rulesOf(body, 'exclude')
        .filter((rule) => wholeDomain.has(rule.path))
        .map((rule) => rule.domain),
    );
    for (const domain of backupDomains) {
      if (!excluded.has(domain)) {
        findings.push(`data_extraction_rules.xml does not exclude the ${domain} domain from ${section}`);
      }
    }
  }
  return findings;
}
