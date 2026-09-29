import { composeKernel, type ComposedKernel, type KernelOptions } from './compose';
import { corpusModule } from './corpus/corpus';
import { formationModule } from './formation/formation';
import type { Ports } from './ports';
import { catalogModule } from './catalog/catalog';
import { packsModule } from './packs/packs';
import { stringsModule } from './strings/strings';
import { telemetryModule } from './telemetry/telemetry';
import { preferencesModule } from './preferences/preferences';
import { bookmarksModule } from './bookmarks/bookmarks';
import { partnersModule } from './partners/partners';

export { hostOf, isAllowedUrl } from './network';

export const kernelModules = {
  telemetry: telemetryModule,
  catalog: catalogModule,
  packs: packsModule,
  corpus: corpusModule,
  formation: formationModule,
  strings: stringsModule,
  preferences: preferencesModule,
  bookmarks: bookmarksModule,
  partners: partnersModule,
} as const;

export type Kernel = ComposedKernel<typeof kernelModules>;

export function createKernel(ports: Ports, options: KernelOptions): Kernel {
  return composeKernel(ports, kernelModules, options);
}
