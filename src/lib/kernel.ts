import { composeKernel, type ComposedKernel, type KernelOptions } from './compose';
import type { Ports } from './ports';
import { catalogModule } from './catalog/catalog';
import { packsModule } from './packs/packs';
import { stringsModule } from './strings/strings';
import { telemetryModule } from './telemetry/telemetry';

export const kernelModules = {
  telemetry: telemetryModule,
  catalog: catalogModule,
  packs: packsModule,
  strings: stringsModule,
} as const;

export type Kernel = ComposedKernel<typeof kernelModules>;

export function createKernel(ports: Ports, options: KernelOptions): Kernel {
  return composeKernel(ports, kernelModules, options);
}
