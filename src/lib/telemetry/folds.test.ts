import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../domain/events';
import {
  emptyTelemetry,
  foldDaysOfUse,
  foldTelemetry,
  leavingCounts,
  telemetryFolds,
  telemetryStep,
} from './folds';

const events: DomainEvent[] = [
  { type: 'AppOpened', at: 1, payload: { day: '2026-01-05' } },
  {
    type: 'PackInstalled',
    at: 2,
    payload: {
      install: 'i-1',
      pack: 'language:qaa',
      kind: 'language',
      source: 'catalog',
      language: 'qaa',
      resources: 9,
      bytes: 10,
      burritos: [],
    },
  },
  {
    type: 'PackInstalled',
    at: 3,
    payload: {
      install: 'i-2',
      pack: 'language:qab',
      kind: 'language',
      source: 'peer',
      language: 'qab',
      resources: 1,
      bytes: 10,
      burritos: [],
    },
  },
  {
    type: 'PackInstalled',
    at: 4,
    payload: {
      install: 'i-3',
      pack: 'image:obs',
      kind: 'image',
      source: 'catalog',
      resources: 1,
      bytes: 10,
      burritos: [],
    },
  },
  { type: 'AppOpened', at: 5, payload: { day: '2026-01-05' } },
  { type: 'AppOpened', at: 6, payload: { day: '2026-01-07' } },
  {
    type: 'TransferCompleted',
    at: 7,
    payload: {
      transfer: 't-1',
      role: 'receiver',
      from: 'ios',
      to: 'android',
      resources: 3,
      bytes: 10,
      app: 'none',
    },
  },
  {
    type: 'TransferCompleted',
    at: 7,
    payload: {
      transfer: 't-3',
      role: 'sender',
      from: 'android',
      to: 'ios',
      resources: 1,
      bytes: 10,
      app: 'included',
    },
  },
  { type: 'TransferFailed', at: 8, payload: { transfer: 't-2', role: 'sender', code: 'transfer.peer-lost' } },
  { type: 'ShareSent', at: 9, payload: { kind: 'passage', language: 'qaa' } },
  {
    type: 'SessionStarted',
    at: 10,
    payload: { group: 'g-1', track: 'foundations', session: 1, language: 'qaa' },
  },
  {
    type: 'SessionStarted',
    at: 11,
    payload: { group: 'g-1', track: 'foundations', session: 2, language: 'qaa' },
  },
  {
    type: 'SessionStarted',
    at: 12,
    payload: { group: 'g-2', track: 'foundations', session: 1, language: 'en' },
  },
  { type: 'InvitationShown', at: 13, payload: {} },
  { type: 'InvitationTapped', at: 14, payload: {} },
  { type: 'ImpactStoryOpened', at: 15, payload: { story: 'jeremiah-and-the-occult-king' } },
  { type: 'Failure', at: 16, payload: { code: 'http.offline', context: {} } },
];

describe('telemetry folds (PRD section 9)', () => {
  it('counts the section 9 list and nothing else', () => {
    expect(Object.keys(emptyTelemetry).sort()).toEqual([
      'appOpens',
      'formationSessionsStarted',
      'impactStoryOpens',
      'invitationTaps',
      'languagePackDownloads',
      'sharesSent',
      'transfersCompleted',
    ]);
    expect(foldTelemetry(events)).toEqual({
      appOpens: 3,
      languagePackDownloads: { qaa: 1 },
      transfersCompleted: 1,
      sharesSent: 1,
      formationSessionsStarted: { qaa: 2, en: 1 },
      invitationTaps: 1,
      impactStoryOpens: 1,
    });
  });

  it('lets only the section 9 fold list leave, with no platform pair split', () => {
    expect([...telemetryFolds]).toEqual([
      'appOpens',
      'languagePackDownloads',
      'transfersCompleted',
      'sharesSent',
      'formationSessionsStarted',
      'invitationTaps',
      'impactStoryOpens',
    ]);
    const leaving = leavingCounts(foldTelemetry(events));
    expect(Object.keys(leaving)).toEqual([...telemetryFolds]);
    expect(Object.keys(foldTelemetry(events)).sort()).toEqual([...telemetryFolds].sort());
    expect(leaving.transfersCompleted).toBe(1);
  });

  it('is a pure fold: the empty journal counts nothing and a step never mutates', () => {
    expect(foldTelemetry([])).toEqual(emptyTelemetry);
    const before = JSON.stringify(emptyTelemetry);
    telemetryStep(emptyTelemetry, events[0] ?? { type: 'InvitationShown', at: 0, payload: {} });
    expect(JSON.stringify(emptyTelemetry)).toBe(before);
  });

  it('counts distinct days of use from app opens', () => {
    expect(foldDaysOfUse(events)).toEqual(['2026-01-05', '2026-01-07']);
  });
});
