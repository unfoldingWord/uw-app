import { describe, expect, it } from 'vitest';
import { localeGateFindings } from './locale-gate';

const release = { extra: { localeGate: 'reviewed' } };
const drafts = { extra: { localeGate: 'drafts' } };
const eas = { build: { base: { env: { EXPO_NO_TELEMETRY: '1' } }, production: { extends: 'base' } } };

describe('localeGateFindings (issue #65)', () => {
  it('passes when a release config keeps reviewed, the CI flag gives drafts, and no EAS profile sets it', () => {
    expect(localeGateFindings({ release, drafts, eas })).toEqual([]);
  });

  it('fails when a release config offers drafts, the flag stops working, or an EAS profile sets the flag', () => {
    expect(
      localeGateFindings({
        release: { extra: { localeGate: 'drafts' } },
        drafts: { extra: {} },
        eas: { build: { preview: { env: { UW_LOCALE_GATE: 'drafts' } }, production: {} } },
      }),
    ).toEqual([
      'app.config.ts gives a build without UW_LOCALE_GATE the locale gate drafts; a release build must keep reviewed',
      'app.config.ts ignores UW_LOCALE_GATE=drafts (it gives none), so the device CI cannot offer the drafted locales',
      'eas.json profile preview sets UW_LOCALE_GATE; only the device CI may, and no EAS build',
    ]);
  });
});
