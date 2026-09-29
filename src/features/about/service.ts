import { resourceTypeOf, resourceTypes, type ResourceType } from '@lib/catalog/resourceTypes';
import type { CatalogRelease } from '@lib/catalog/types';
import type { Kernel } from '@lib/kernel';
import type { ImpactStory } from '@lib/partners/stories';
import { aboutWords, type AboutWords } from './strings';

const translationCoreUrl = 'https://www.translationcore.com';

const btServantUrl = 'https://unfoldingword.org';

const foundationsBtUrl = 'https://foundationsbt.com';

export type AboutStat = { readonly value: number; readonly label: string };

export type TypeRow = {
  readonly type: ResourceType;
  readonly title: string;
  readonly releases: number;
  readonly languages: number;
};

export type PartnerBlock = {
  readonly title: string;
  readonly body: string;
  readonly link: string;
  readonly url: string;
};

export type AboutLinkId = 'translationCore' | 'btServant' | 'foundationsBt';

export type AboutLink = {
  readonly id: AboutLinkId;
  readonly title: string;
  readonly about: string;
  readonly url: string;
};

export type AboutSummary = {
  readonly overline: string;
  readonly title: string;
  readonly stats: readonly AboutStat[];
  readonly publishers: readonly string[];
  readonly publishedBy: string;
  readonly byType: readonly TypeRow[];
  readonly stories: readonly ImpactStory[];
  readonly partner: PartnerBlock;
  readonly links: readonly AboutLink[];
};

export type LicenceRow = {
  readonly resource: string;
  readonly publisher: string;
  readonly version: string;
  readonly licence: string;
  readonly title: string;
  readonly label: string;
};

export type LicenceView = {
  readonly title: string;
  readonly notices: readonly string[];
  readonly partners: string;
  readonly give: { readonly label: string; readonly url: string };
  readonly onPhoneTitle: string;
  readonly onPhone: readonly LicenceRow[];
};

export type ImpactStoryView = {
  readonly slug: string;
  readonly title: string;
  readonly body: readonly string[];
  readonly link: string;
  readonly overline: string;
  readonly readMore: string;
  readonly securityNote: string;
  readonly image: string | undefined;
};

export type AboutService = {
  words(): AboutWords;
  summary(): AboutSummary;
  links(): readonly AboutLink[];
  licence(): LicenceView;
  story(slug: string): ImpactStoryView | undefined;
  openStory(slug: string): Promise<ImpactStoryView | undefined>;
};

const unfoldingWord = 'unfoldingWord';

function imageOf(kernel: Kernel, story: ImpactStory): string | undefined {
  return story.image !== undefined && 'path' in story.image
    ? kernel.media.uriOf(story.image.path)
    : undefined;
}

function storyView(
  kernel: Kernel,
  words: AboutWords,
  story: ImpactStory | undefined,
): ImpactStoryView | undefined {
  if (story === undefined) {
    return undefined;
  }
  return {
    slug: story.slug,
    title: story.title,
    body: story.body,
    link: story.link,
    overline: words.t('invitation.overline'),
    readMore: words.t('invitation.readMore'),
    securityNote: story.securityNote ?? words.t('impact.securityNote'),
    image: imageOf(kernel, story),
  };
}

function typeTitle(words: AboutWords, type: ResourceType): string {
  switch (type) {
    case 'hebrew':
      return words.t('resource.hebrew');
    case 'greek':
      return words.t('resource.greek');
    default:
      return words.t(`resource.${type}`);
  }
}

function publishersOf(releases: readonly CatalogRelease[]): readonly string[] {
  const names = [...new Set(releases.map((release) => release.publisher))];
  return [
    ...names.filter((name) => name === unfoldingWord),
    ...names.filter((name) => name !== unfoldingWord),
  ];
}

function linksOf(words: AboutWords): readonly AboutLink[] {
  return [
    {
      id: 'translationCore',
      title: words.t('about.link.translationCore'),
      about: words.t('about.link.translationCore.about'),
      url: translationCoreUrl,
    },
    {
      id: 'btServant',
      title: words.t('about.link.btServant'),
      about: words.t('about.link.btServant.about'),
      url: btServantUrl,
    },
    {
      id: 'foundationsBt',
      title: words.t('about.link.foundationsBt'),
      about: words.t('about.link.foundationsBt.about'),
      url: foundationsBtUrl,
    },
  ];
}

export function createAboutService(kernel: Kernel): AboutService {
  const words = (): AboutWords => aboutWords(kernel);

  return {
    words,
    story: (slug) => storyView(kernel, words(), kernel.partners.story(slug)),
    openStory: async (slug) => storyView(kernel, words(), await kernel.partners.open(slug)),
    links: () => linksOf(words()),
    summary() {
      const current = words();
      const releases = kernel.catalog.all();
      const languages = kernel.catalog.languages().length;
      const grouped = new Map<ResourceType, CatalogRelease[]>();
      for (const release of releases) {
        const type = resourceTypeOf(release);
        if (type !== undefined) {
          grouped.set(type, [...(grouped.get(type) ?? []), release]);
        }
      }
      const byType = resourceTypes.flatMap((type) => {
        const rows = grouped.get(type) ?? [];
        return rows.length === 0
          ? []
          : [
              {
                type,
                title: typeTitle(current, type),
                releases: rows.length,
                languages: new Set(rows.map((release) => release.language)).size,
              },
            ];
      });
      return {
        overline: current.t('about.overline'),
        title: current.t('about.title'),
        stats: [
          { value: languages, label: current.plural('about.stats.languages', languages) },
          { value: releases.length, label: current.plural('about.stats.releases', releases.length) },
          { value: byType.length, label: current.plural('about.stats.types', byType.length) },
        ],
        publishers: publishersOf(releases),
        publishedBy: current.plural('about.publishedBy.body', languages),
        byType,
        stories: kernel.partners.stories(),
        partner: {
          title: current.t('about.partner'),
          body: current.t('about.partner.body'),
          link: current.t('about.partner.link'),
          url: kernel.partners.give,
        },
        links: linksOf(current),
      };
    },
    licence() {
      const current = words();
      const onPhone = kernel.packs
        .installed()
        .flatMap((pack) => pack.burritos)
        .map(({ provenance }) => ({
          resource: provenance.resource,
          publisher: provenance.publisher,
          version: provenance.tag,
          licence: provenance.licence,
          title: provenance.title,
          label: current.t('licence.row', {
            resource: provenance.title,
            publisher: provenance.publisher,
            version: provenance.tag,
          }),
        }))
        .sort((left, right) =>
          left.resource < right.resource ? -1 : left.resource > right.resource ? 1 : 0,
        );
      return {
        title: current.t('licence.title'),
        notices: [current.t('licence.content'), current.t('licence.app'), current.t('licence.fonts')],
        partners: current.t('licence.partners'),
        give: { label: current.t('licence.give'), url: kernel.partners.give },
        onPhoneTitle: current.t('licence.onPhone'),
        onPhone,
      };
    },
  };
}
