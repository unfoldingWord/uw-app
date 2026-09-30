import { describe, expect, it } from 'vitest';
import { maximumBatchLanguages } from '../domain/events';
import { emptyTelemetry, leavingCounts } from './folds';
import { batchPayload, emptySent, isEmptyBatch, sentStateOf, stepSent, unsentBatch } from './sending';

const none = leavingCounts(emptyTelemetry);

describe('telemetry batches', () => {
  it('sends what has not been sent, never a negative count', () => {
    const total = { ...none, appOpens: 5, languagePackDownloads: { qaa: 2, qab: 1 } };
    const sent = { ...none, appOpens: 3, languagePackDownloads: { qaa: 2 }, sharesSent: 4 };
    expect(unsentBatch(total, sent)).toEqual({ ...none, appOpens: 2, languagePackDownloads: { qab: 1 } });
    expect(isEmptyBatch(unsentBatch(total, total))).toBe(true);
  });

  it('holds at most the journal bound of languages and leaves the rest for the next batch', () => {
    const many = Object.fromEntries(
      Array.from({ length: maximumBatchLanguages + 5 }, (_, index) => [
        `q${String(index).padStart(2, '0')}`,
        1,
      ]),
    );
    const batch = unsentBatch({ ...none, formationSessionsStarted: many }, none);
    expect(Object.keys(batch.formationSessionsStarted)).toHaveLength(maximumBatchLanguages);
    const after = stepSent(emptySent, {
      type: 'TelemetrySent',
      at: 1,
      payload: batchPayload('2026-01-05', batch),
    });
    expect(after.day).toBe('2026-01-05');
    expect(
      Object.keys(
        unsentBatch({ ...none, formationSessionsStarted: many }, after.sent).formationSessionsStarted,
      ),
    ).toHaveLength(5);
  });

  it('reads a v1.0.0 checkpoint, which has no sent counts, as nothing sent', () => {
    expect(sentStateOf({ counts: emptyTelemetry, days: ['2026-01-05'] })).toEqual(emptySent);
    expect(sentStateOf(null)).toEqual(emptySent);
  });
});
