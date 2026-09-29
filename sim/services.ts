import { createAboutService } from '@features/about/service';
import { createDiagnosticsService } from '@features/diagnostics/service';
import { createFormationService } from '@features/formation/service';
import { createHomeService } from '@features/home/service';
import { createLanguagesService } from '@features/languages/service';
import { createOnboardingService } from '@features/onboarding/service';
import { createPartnersService } from '@features/partners/service';
import { createSettingsService } from '@features/settings/service';
import { createShareService } from '@features/share/service';
import { createStudyService } from '@features/study/service';
import { createTransferService } from '@features/transfer/service';
import type { SimDevice } from './device';

export function servicesOf(device: SimDevice) {
  const kernel = device.kernel;
  return {
    about: createAboutService(kernel),
    diagnostics: createDiagnosticsService(kernel),
    formation: createFormationService(kernel),
    home: createHomeService(kernel),
    languages: createLanguagesService(kernel),
    onboarding: createOnboardingService(kernel),
    partners: createPartnersService(kernel),
    settings: createSettingsService(kernel),
    share: createShareService(kernel),
    study: createStudyService(kernel),
    transfer: createTransferService(kernel),
  };
}

export function localTime(device: SimDevice, utcOffsetMinutes = 0): { at: number; utcOffsetMinutes: number } {
  return { at: device.adapters.clock.now(), utcOffsetMinutes };
}
