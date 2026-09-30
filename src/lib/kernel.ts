import { composeKernel, type ComposedKernel, type KernelOptions } from './compose';
import { corpusModule } from './corpus/corpus';
import { formationModule } from './formation/formation';
import { mediaModule } from './media/media';
import type { Ports } from './ports';
import { catalogModule } from './catalog/catalog';
import { packsModule } from './packs/packs';
import { playerModule } from './player/player';
import { shareModule } from './share/share';
import type { LocaleGate } from './strings/locales';
import { stringsModule, stringsModuleFor } from './strings/strings';
import { telemetryModule } from './telemetry/telemetry';
import { preferencesModule, preferencesModuleFor } from './preferences/preferences';
import { bookmarksModule } from './bookmarks/bookmarks';
import { partnersModule } from './partners/partners';
import { transferModule } from './transfer/transfer';

export { createStartFaults } from './faults';
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
  player: playerModule,
} as const;

export type Kernel = ComposedKernel<typeof kernelModules>;

export type AppKernelOptions = KernelOptions & { localeGate?: LocaleGate };

export function createKernel(ports: Ports, options: AppKernelOptions): Kernel {
  const { localeGate, ...kernelOptions } = options;
  const modules =
    localeGate === undefined
      ? kernelModules
      : {
          ...kernelModules,
          strings: stringsModuleFor(localeGate),
          preferences: preferencesModuleFor(localeGate),
        };
  return composeKernel(ports, modules, kernelOptions);
}
