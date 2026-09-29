import type { DomainEvent } from '../domain/events';

export type PerLanguage = Readonly<Record<string, number>>;

export type Telemetry = {
  appOpens: number;
  languagePackDownloads: PerLanguage;
  transfersCompleted: number;
  sharesSent: number;
  formationSessionsStarted: PerLanguage;
  invitationTaps: number;
  impactStoryOpens: number;
};

export const emptyTelemetry: Telemetry = Object.freeze({
  appOpens: 0,
  languagePackDownloads: Object.freeze({}),
  transfersCompleted: 0,
  sharesSent: 0,
  formationSessionsStarted: Object.freeze({}),
  invitationTaps: 0,
  impactStoryOpens: 0,
});

function bump(counts: PerLanguage, language: string): PerLanguage {
  return { ...counts, [language]: (counts[language] ?? 0) + 1 };
}

export function telemetryStep(counts: Telemetry, event: DomainEvent): Telemetry {
  switch (event.type) {
    case 'AppOpened':
      return { ...counts, appOpens: counts.appOpens + 1 };
    case 'PackInstalled':
      return event.payload.kind === 'language' &&
        event.payload.source === 'catalog' &&
        event.payload.language !== undefined
        ? { ...counts, languagePackDownloads: bump(counts.languagePackDownloads, event.payload.language) }
        : counts;
    case 'TransferCompleted':
      return { ...counts, transfersCompleted: counts.transfersCompleted + 1 };
    case 'ShareSent':
      return { ...counts, sharesSent: counts.sharesSent + 1 };
    case 'SessionStarted':
      return {
        ...counts,
        formationSessionsStarted: bump(counts.formationSessionsStarted, event.payload.language),
      };
    case 'InvitationTapped':
      return { ...counts, invitationTaps: counts.invitationTaps + 1 };
    case 'ImpactStoryOpened':
      return { ...counts, impactStoryOpens: counts.impactStoryOpens + 1 };
    default:
      return counts;
  }
}

export function foldTelemetry(events: readonly DomainEvent[]): Telemetry {
  return events.reduce(telemetryStep, emptyTelemetry);
}

export function foldDaysOfUse(events: readonly DomainEvent[]): readonly string[] {
  const days = new Set<string>();
  for (const event of events) {
    if (event.type === 'AppOpened') {
      days.add(event.payload.day);
    }
  }
  return [...days].sort();
}
