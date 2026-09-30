import { maximumBatchLanguages, type DomainEvent, type EventInput } from '../domain/events';
import type { FailureCode } from '../domain/failures';
import type { HttpResponse } from '../ports';
import { compareText } from '../order';
import { emptyTelemetry, leavingCounts, type LeavingCounts, type PerLanguage } from './folds';

export type SendOutcome =
  | { sent: true; batch: LeavingCounts }
  | { sent: false; reason: 'off' | 'busy' | 'sent-today' | 'nothing' | 'offline' }
  | { sent: false; reason: 'failed'; code: FailureCode };

export type SentState = { sent: LeavingCounts; day: string | null };

export const emptySent: SentState = Object.freeze({ sent: leavingCounts(emptyTelemetry), day: null });

export const sendTimeoutMs = 15 * 1000;

type BatchPayload = Extract<EventInput, { type: 'TelemetrySent' }>['payload'];

type LanguageCount = { readonly language: string; readonly count: number };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function countOf(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function perLanguageOf(value: unknown): PerLanguage {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([language, count]) =>
      countOf(count) > 0 ? [[language, countOf(count)]] : [],
    ),
  );
}

function leavingOf(value: unknown): LeavingCounts {
  const record = isRecord(value) ? value : {};
  return {
    appOpens: countOf(record.appOpens),
    languagePackDownloads: perLanguageOf(record.languagePackDownloads),
    transfersCompleted: countOf(record.transfersCompleted),
    sharesSent: countOf(record.sharesSent),
    formationSessionsStarted: perLanguageOf(record.formationSessionsStarted),
    invitationTaps: countOf(record.invitationTaps),
    impactStoryOpens: countOf(record.impactStoryOpens),
  };
}

export function sentStateOf(value: unknown): SentState {
  if (!isRecord(value)) {
    return emptySent;
  }
  return {
    sent: leavingOf(value.sent),
    day: typeof value.sentDay === 'string' ? value.sentDay : null,
  };
}

function languagesMinus(total: PerLanguage, sent: PerLanguage): PerLanguage {
  const remaining = Object.entries(total)
    .map(([language, count]) => [language, count - (sent[language] ?? 0)] as const)
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => compareText(left, right))
    .slice(0, maximumBatchLanguages);
  return Object.fromEntries(remaining);
}

function languagesPlus(total: PerLanguage, more: PerLanguage): PerLanguage {
  const sum: Record<string, number> = { ...total };
  for (const [language, count] of Object.entries(more)) {
    sum[language] = (sum[language] ?? 0) + count;
  }
  return sum;
}

export function unsentBatch(leaving: LeavingCounts, sent: LeavingCounts): LeavingCounts {
  const minus = (total: number, done: number): number => Math.max(0, total - done);
  return {
    appOpens: minus(leaving.appOpens, sent.appOpens),
    languagePackDownloads: languagesMinus(leaving.languagePackDownloads, sent.languagePackDownloads),
    transfersCompleted: minus(leaving.transfersCompleted, sent.transfersCompleted),
    sharesSent: minus(leaving.sharesSent, sent.sharesSent),
    formationSessionsStarted: languagesMinus(leaving.formationSessionsStarted, sent.formationSessionsStarted),
    invitationTaps: minus(leaving.invitationTaps, sent.invitationTaps),
    impactStoryOpens: minus(leaving.impactStoryOpens, sent.impactStoryOpens),
  };
}

export function isEmptyBatch(batch: LeavingCounts): boolean {
  return (
    batch.appOpens +
      batch.transfersCompleted +
      batch.sharesSent +
      batch.invitationTaps +
      batch.impactStoryOpens ===
      0 &&
    Object.keys(batch.languagePackDownloads).length === 0 &&
    Object.keys(batch.formationSessionsStarted).length === 0
  );
}

function listOf(counts: PerLanguage): LanguageCount[] {
  return Object.entries(counts).map(([language, count]) => ({ language, count }));
}

function mapOf(list: readonly LanguageCount[]): PerLanguage {
  return Object.fromEntries(list.map((item) => [item.language, item.count]));
}

export function batchPayload(day: string, batch: LeavingCounts): BatchPayload {
  return {
    day,
    appOpens: batch.appOpens,
    languagePackDownloads: listOf(batch.languagePackDownloads),
    transfersCompleted: batch.transfersCompleted,
    sharesSent: batch.sharesSent,
    formationSessionsStarted: listOf(batch.formationSessionsStarted),
    invitationTaps: batch.invitationTaps,
    impactStoryOpens: batch.impactStoryOpens,
  };
}

export function stepSent(state: SentState, event: DomainEvent): SentState {
  if (event.type !== 'TelemetrySent') {
    return state;
  }
  const batch = event.payload;
  const { sent } = state;
  return {
    day: batch.day,
    sent: {
      appOpens: sent.appOpens + batch.appOpens,
      languagePackDownloads: languagesPlus(sent.languagePackDownloads, mapOf(batch.languagePackDownloads)),
      transfersCompleted: sent.transfersCompleted + batch.transfersCompleted,
      sharesSent: sent.sharesSent + batch.sharesSent,
      formationSessionsStarted: languagesPlus(
        sent.formationSessionsStarted,
        mapOf(batch.formationSessionsStarted),
      ),
      invitationTaps: sent.invitationTaps + batch.invitationTaps,
      impactStoryOpens: sent.impactStoryOpens + batch.impactStoryOpens,
    },
  };
}

export type Unsent = { code: FailureCode; status?: number };

export function unsentBecause(response: HttpResponse): Unsent | undefined {
  switch (response.kind) {
    case 'response':
      return response.status >= 200 && response.status < 300
        ? undefined
        : { code: 'http.status', status: response.status };
    case 'offline':
      return { code: 'http.offline' };
    case 'timeout':
      return { code: 'http.timeout' };
    case 'cancelled':
      return { code: 'http.cancelled' };
    case 'refused':
      return { code: 'http.host-refused' };
  }
}
