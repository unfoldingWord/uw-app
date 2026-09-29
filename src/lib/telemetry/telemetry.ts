import { defineModule, ownsNothing } from '../module';
import { foldDaysOfUse, foldTelemetry, type Telemetry } from './folds';

export type TelemetryApi = {
  counts(): Telemetry;
  daysOfUse(): readonly string[];
};

export const telemetryModule = defineModule<TelemetryApi>({
  events: [],
  owns: ownsNothing,
  create(context) {
    const api: TelemetryApi = {
      counts: () => foldTelemetry(context.events()),
      daysOfUse: () => foldDaysOfUse(context.events()),
    };
    return {
      api,
      snapshot: () => ({ counts: api.counts(), daysOfUse: api.daysOfUse() }),
    };
  },
});
