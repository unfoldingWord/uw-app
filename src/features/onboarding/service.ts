import type { CatalogLanguage, RefreshOutcome } from '@lib/catalog/types';
import { imagePackId, languagePackId, type PackId } from '@lib/domain/pack';
import type { Kernel } from '@lib/kernel';
import { picturesFollow, type InstallOutcome } from '@lib/packs/types';
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
  readonly pictures: Promise<InstallOutcome | undefined>;
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

type Started = { done: Promise<InstallOutcome>; pictures: Promise<InstallOutcome | undefined> };

const noPictures: Promise<InstallOutcome | undefined> = Promise.resolve(undefined);

async function startLanguagePack(kernel: Kernel, language: string): Promise<Started> {
  const pack = languagePackId(language);
  if (kernel.catalog.releases(language).length === 0) {
    const refreshed = await kernel.catalog.refresh();
    if (!refreshed.ok && kernel.catalog.releases(language).length === 0) {
      return {
        done: Promise.resolve({ ok: false, install: undefined, pack, code: refreshed.code }),
        pictures: noPictures,
      };
    }
  }
  const status = await kernel.packs.status(language);
  const installed = kernel.packs.installed().find((item) => item.pack === pack);
  if (status.complete && installed !== undefined) {
    return { done: Promise.resolve({ ok: true, install: undefined, pack: installed }), pictures: noPictures };
  }
  const withPictures = picturesFollow(kernel.catalog.all(), kernel.packs.installed(), language);
  const done = kernel.packs.installFromCatalog(pack);
  return { done, pictures: withPictures ? kernel.packs.installFromCatalog(imagePackId) : noPictures };
}

function packOf(outcome: InstallOutcome): PackId | undefined {
  return outcome.ok ? outcome.pack.pack : outcome.pack;
}

function startCarriedPack(kernel: Kernel, language: string): Started {
  const pack = languagePackId(language);
  const started = kernel.packs.placeBundled().then((outcomes): Started | Promise<Started> => {
    const installed = kernel.packs.installed().find((item) => item.pack === pack);
    if (installed === undefined) {
      return startLanguagePack(kernel, language);
    }
    const placed = outcomes.find((outcome) => packOf(outcome) === pack);
    return {
      done: Promise.resolve(placed ?? { ok: true, install: undefined, pack: installed }),
      pictures: Promise.resolve(outcomes.find((outcome) => packOf(outcome) === imagePackId)),
    };
  });
  return { done: started.then((item) => item.done), pictures: started.then((item) => item.pictures) };
}

export function createOnboardingService(kernel: Kernel): OnboardingService {
  const words = (): OnboardingWords => onboardingWords(kernel);

  const choose = async (language: string, options: ChooseOptions = {}): Promise<Chosen> => {
    if (options.name !== undefined) {
      await kernel.preferences.set('home.name', options.name);
    }
    await kernel.preferences.set('study.language', language);
    const carried = kernel.packs.bundled().includes(languagePackId(language));
    const { done, pictures } = carried
      ? startCarriedPack(kernel, language)
      : await startLanguagePack(kernel, language);
    return { language, pack: languagePackId(language), done, pictures };
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
