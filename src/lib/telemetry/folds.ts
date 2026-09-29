import type { DomainEvent } from '../domain/events';
import type { JsonValue } from '../json';
import { compareText } from '../order';

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

export type TelemetryBaseline = { counts: Telemetry; days: readonly string[] };

export const emptyBaseline: TelemetryBaseline = Object.freeze({
  counts: emptyTelemetry,
  days: Object.freeze([]),
});

const countFields = [
  'appOpens',
  'transfersCompleted',
  'sharesSent',
  'invitationTaps',
  'impactStoryOpens',
] as const;

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function perLanguageOf(value: unknown): PerLanguage | undefined {
  if (!isRecord(value) || !Object.values(value).every(isCount)) {
    return undefined;
  }
  return value as PerLanguage;
}

function countsOf(value: unknown): Telemetry | undefined {
  if (!isRecord(value) || !countFields.every((field) => isCount(value[field]))) {
    return undefined;
  }
  const languagePackDownloads = perLanguageOf(value.languagePackDownloads);
  const formationSessionsStarted = perLanguageOf(value.formationSessionsStarted);
  if (languagePackDownloads === undefined || formationSessionsStarted === undefined) {
    return undefined;
  }
  const counts: Record<string, unknown> = { languagePackDownloads, formationSessionsStarted };
  for (const field of countFields) {
    counts[field] = value[field];
  }
  return counts as Telemetry;
}

export function baselineOf(value: JsonValue | undefined): TelemetryBaseline {
  if (!isRecord(value)) {
    return emptyBaseline;
  }
  const counts = countsOf(value.counts);
  const days = value.days;
  if (counts === undefined || !Array.isArray(days) || !days.every((day) => typeof day === 'string')) {
    return emptyBaseline;
  }
  return { counts, days: days as readonly string[] };
}

function withDay(days: readonly string[], event: DomainEvent): readonly string[] {
  if (event.type !== 'AppOpened' || days.includes(event.payload.day)) {
    return days;
  }
  return [...days, event.payload.day].sort(compareText);
}

export function stepBaseline(state: TelemetryBaseline, event: DomainEvent): TelemetryBaseline {
  return { counts: telemetryStep(state.counts, event), days: withDay(state.days, event) };
}

export function foldFrom(baseline: TelemetryBaseline, events: readonly DomainEvent[]): TelemetryBaseline {
  return events.reduce(stepBaseline, baseline);
}

export function foldTelemetry(events: readonly DomainEvent[]): Telemetry {
  return foldFrom(emptyBaseline, events).counts;
}

export function foldDaysOfUse(events: readonly DomainEvent[]): readonly string[] {
  return foldFrom(emptyBaseline, events).days;
}
