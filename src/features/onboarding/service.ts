import type { CatalogLanguage, RefreshOutcome } from '@lib/catalog/types';
import { languagePackId, type PackId } from '@lib/domain/pack';
import type { Kernel } from '@lib/kernel';
import type { InstallOutcome } from '@lib/packs/types';
import { onboardingWords, type OnboardingWords } from './strings';

export type OnboardingCopy = {
  readonly logo: string;
  readonly overline: string;
  readonly tagline: string;
  readonly body: string;
  readonly choose: string;
  readonly english: string;
  readonly footer: string;
  readonly nameLabel: string;
  readonly nameHint: string;
};

export type ChooseOptions = { readonly name?: string };

export type Chosen = {
  readonly language: string;
  readonly pack: PackId;
  readonly done: Promise<InstallOutcome>;
};

export type OnboardingService = {
  words(): OnboardingWords;
  needed(): boolean;
  copy(): OnboardingCopy;
  refresh(): Promise<RefreshOutcome>;
  languages(query?: string): readonly CatalogLanguage[];
  choose(language: string, options?: ChooseOptions): Promise<Chosen>;
  continueInEnglish(options?: ChooseOptions): Promise<Chosen>;
};

const englishLanguage = 'en';

async function startLanguagePack(
  kernel: Kernel,
  language: string,
): Promise<{ done: Promise<InstallOutcome> }> {
  const pack = languagePackId(language);
  const status = await kernel.packs.status(language);
  const installed = kernel.packs.installed().find((item) => item.pack === pack);
  if (status.complete && installed !== undefined) {
    return { done: Promise.resolve({ ok: true, install: undefined, pack: installed }) };
  }
  return { done: kernel.packs.installFromCatalog(pack) };
}

export function createOnboardingService(kernel: Kernel): OnboardingService {
  const words = (): OnboardingWords => onboardingWords(kernel);

  const choose = async (language: string, options: ChooseOptions = {}): Promise<Chosen> => {
    if (options.name !== undefined) {
      await kernel.preferences.set('home.name', options.name);
    }
    await kernel.preferences.set('study.language', language);
    const { done } = await startLanguagePack(kernel, language);
    return { language, pack: languagePackId(language), done };
  };

  return {
    words,
    needed: () => kernel.preferences.contentLanguage() === undefined,
    copy: () => {
      const current = words();
      return {
        logo: current.t('onboarding.logo'),
        overline: current.t('onboarding.overline'),
        tagline: current.t('onboarding.tagline'),
        body: current.t('onboarding.body'),
        choose: current.t('onboarding.choose'),
        english: current.t('onboarding.english'),
        footer: current.t('onboarding.footer'),
        nameLabel: current.t('onboarding.name.label'),
        nameHint: current.t('onboarding.name.hint'),
      };
    },
    refresh: () => kernel.catalog.refresh(),
    languages: (query) =>
      query === undefined || query.trim() === '' ? kernel.catalog.languages() : kernel.catalog.search(query),
    choose,
    continueInEnglish: (options) => choose(englishLanguage, options),
  };
}
