import { failureCodeOf, failureSteps, type FailureCode, type FailureStep } from './domain/failures';

export type StartFault = { readonly code: FailureCode; readonly step: FailureStep };

export type StartFaults = {
  capture<T>(open: () => T): T;
  pending(): readonly StartFault[];
  clear(): void;
};

export const startFaultLimit = 8;

const steps: ReadonlySet<string> = new Set(failureSteps);

function isFailureStep(value: unknown): value is FailureStep {
  return typeof value === 'string' && steps.has(value);
}

function stepOf(error: unknown): FailureStep {
  if (typeof error === 'object' && error !== null && 'step' in error && isFailureStep(error.step)) {
    return error.step;
  }
  return 'start';
}

export function startFaultOf(error: unknown): StartFault {
  return { code: failureCodeOf(error), step: stepOf(error) };
}

export function createStartFaults(limit = startFaultLimit): StartFaults {
  let pending: StartFault[] = [];
  return {
    capture(open) {
      try {
        return open();
      } catch (error) {
        pending = [...pending, startFaultOf(error)].slice(-limit);
        throw error;
      }
    },
    pending: () => pending,
    clear() {
      pending = [];
    },
  };
}
