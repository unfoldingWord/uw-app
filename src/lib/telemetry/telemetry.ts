import { defineModule, ownsNothing } from '../module';
import { baselineOf, emptyBaseline, foldFrom, stepBaseline, type Telemetry } from './folds';

export type TelemetryApi = {
  counts(): Telemetry;
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
