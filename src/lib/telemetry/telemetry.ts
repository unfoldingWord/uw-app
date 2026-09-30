import { utf8 } from '../burrito/files';
import type { JsonValue } from '../json';
import { defineModule, ownsNothing } from '../module';
import {
  baselineOf,
  emptyBaseline,
  foldFrom,
  leavingCounts,
  stepBaseline,
  type LeavingCounts,
  type Telemetry,
  type TelemetryBaseline,
} from './folds';
import {
  batchPayload,
  emptySent,
  isEmptyBatch,
  sendTimeoutMs,
  sentStateOf,
  stepSent,
  unsentBatch,
  unsentBecause,
  type SendOutcome,
  type SentState,
} from './sending';

export type TelemetryApi = {
  counts(): Telemetry;
  leaving(): LeavingCounts;
  daysOfUse(): readonly string[];
  sending(): boolean;
  send(): Promise<SendOutcome>;
};

function checkpointJson(baseline: TelemetryBaseline, sent: SentState): JsonValue {
  return { counts: baseline.counts, days: [...baseline.days], sent: sent.sent, sentDay: sent.day };
}

export function telemetryModuleFor(endpoint: string | undefined) {
  return defineModule<TelemetryApi>({
    events: ['TelemetrySent'],
    owns: ownsNothing,
    checkpoint: {
      initial: checkpointJson(emptyBaseline, emptySent),
      step: (state, event) =>
        checkpointJson(stepBaseline(baselineOf(state), event), stepSent(sentStateOf(state), event)),
    },
    create(context) {
      const current = () => foldFrom(baselineOf(context.baseline()), context.events());
      const sentNow = () => context.events().reduce(stepSent, sentStateOf(context.baseline()));
      let inFlight = false;

      async function send(): Promise<SendOutcome> {
        if (endpoint === undefined) {
          return { sent: false, reason: 'off' };
        }
        if (inFlight) {
          return { sent: false, reason: 'busy' };
        }
        const { counts, days } = current();
        const sent = sentNow();
        if (sent.day !== null && sent.day === days.at(-1)) {
          return { sent: false, reason: 'sent-today' };
        }
        const batch = unsentBatch(leavingCounts(counts), sent.sent);
        if (isEmptyBatch(batch)) {
          return { sent: false, reason: 'nothing' };
        }
        inFlight = true;
        try {
          if (!(await context.ports.http.online())) {
            return { sent: false, reason: 'offline' };
          }
          const response = await context.ports.http.request({
            url: endpoint,
            method: 'POST',
            timeoutMs: sendTimeoutMs,
            headers: { 'content-type': 'application/json' },
            body: utf8(JSON.stringify(batch)),
          });
          const unsent = unsentBecause(response);
          if (unsent === undefined) {
            await context.emit((at) => ({
              type: 'TelemetrySent',
              payload: batchPayload(context.ports.clock.dayOf(at), batch),
            }));
            return { sent: true, batch };
          }
          await context.emit({
            type: 'Failure',
            payload: {
              code: unsent.code,
              context: {
                step: 'telemetry',
                ...(unsent.status === undefined ? {} : { status: unsent.status }),
              },
            },
          });
          return { sent: false, reason: 'failed', code: unsent.code };
        } finally {
          inFlight = false;
        }
      }

      const api: TelemetryApi = {
        counts: () => current().counts,
        leaving: () => leavingCounts(current().counts),
        daysOfUse: () => current().days,
        sending: () => endpoint !== undefined,
        send,
      };
      return {
        api,
        snapshot: () => {
          const { counts, days } = current();
          const sent = sentNow();
          return { counts, daysOfUse: days, sent: sent.sent, sentDay: sent.day };
        },
      };
    },
  });
}

export const telemetryModule = telemetryModuleFor(undefined);
