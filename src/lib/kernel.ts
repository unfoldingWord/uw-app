import { composeKernel, type ComposedKernel, type KernelOptions } from './compose';
import type { Ports } from './ports';
import { telemetryModule } from './telemetry/telemetry';

export const kernelModules = {
  telemetry: telemetryModule,
} as const;

export type Kernel = ComposedKernel<typeof kernelModules>;

export function createKernel(ports: Ports, options: KernelOptions): Kernel {
  return composeKernel(ports, kernelModules, options);
}
