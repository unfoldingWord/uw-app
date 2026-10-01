export const localeGateFlag = 'UW_LOCALE_GATE';

type ReadonlyRecord = Readonly<Record<string, unknown>>;

function recordOf(value: unknown): ReadonlyRecord {
  return typeof value === 'object' && value !== null ? (value as ReadonlyRecord) : {};
}

function gateOf(config: unknown): string {
  const gate = recordOf(recordOf(config).extra).localeGate;
  return typeof gate === 'string' ? gate : 'none';
}

export type LocaleGateInput = { release: unknown; drafts: unknown; eas: unknown };

export function localeGateFindings(input: LocaleGateInput): string[] {
  const findings: string[] = [];
  const release = gateOf(input.release);
  if (release !== 'reviewed') {
    findings.push(
      `app.config.ts gives a build without ${localeGateFlag} the locale gate ${release}; a release build must keep reviewed`,
    );
  }
  const drafts = gateOf(input.drafts);
  if (drafts !== 'drafts') {
    findings.push(
      `app.config.ts ignores ${localeGateFlag}=drafts (it gives ${drafts}), so the device CI cannot offer the drafted locales`,
    );
  }
  for (const [profile, value] of Object.entries(recordOf(recordOf(input.eas).build))) {
    if (localeGateFlag in recordOf(recordOf(value).env)) {
      findings.push(
        `eas.json profile ${profile} sets ${localeGateFlag}; only the device CI may, and no EAS build`,
      );
    }
  }
  return findings;
}
