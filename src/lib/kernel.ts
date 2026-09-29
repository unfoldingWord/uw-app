import { composeKernel, type ComposedKernel, type KernelOptions } from './compose';
import { corpusModule } from './corpus/corpus';
import { formationModule } from './formation/formation';
import { mediaModule } from './media/media';
import type { Ports } from './ports';
import { catalogModule } from './catalog/catalog';
import { packsModule } from './packs/packs';
import { shareModule } from './share/share';
import { stringsModule } from './strings/strings';
import { telemetryModule } from './telemetry/telemetry';
import { preferencesModule } from './preferences/preferences';
import { bookmarksModule } from './bookmarks/bookmarks';
import { partnersModule } from './partners/partners';
import { transferModule } from './transfer/transfer';

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
  transfer: transferModule,
  share: shareModule,
  media: mediaModule,
} as const;

export type Kernel = ComposedKernel<typeof kernelModules>;

export function createKernel(ports: Ports, options: KernelOptions): Kernel {
  return composeKernel(ports, kernelModules, options);
}
