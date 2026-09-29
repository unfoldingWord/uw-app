import { defineModule, ownsNothing } from '../module';
import {
  baselineOf,
  emptyBaseline,
  foldFrom,
  leavingCounts,
  stepBaseline,
  type LeavingCounts,
  type Telemetry,
} from './folds';

export type TelemetryApi = {
  counts(): Telemetry;
  leaving(): LeavingCounts;
  daysOfUse(): readonly string[];
};

export const telemetryModule = defineModule<TelemetryApi>({
  events: [],
  owns: ownsNothing,
  checkpoint: {
    initial: emptyBaseline,
    step: (state, event) => stepBaseline(baselineOf(state), event),
  },
  create(context) {
    const current = () => foldFrom(baselineOf(context.baseline()), context.events());
    const api: TelemetryApi = {
      counts: () => current().counts,
      leaving: () => leavingCounts(current().counts),
      daysOfUse: () => current().days,
    };
    return {
      api,
      snapshot: () => {
        const { counts, days } = current();
        return { counts, daysOfUse: days };
      },
    };
  },
});
