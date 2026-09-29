import type { Kernel } from '@lib/kernel';
import type { Invitation, StoriesRefreshOutcome } from '@lib/partners/partners';
import type { ImpactStory } from '@lib/partners/stories';
import { partnersWords, type PartnersWords } from './strings';

export type StoryWords = {
  readonly overline: string;
  readonly readMore: string;
  readonly securityNote: string;
};

export type PartnersService = {
  words(): PartnersWords;
  invitation(at: number): Invitation;
  shown(at: number): Promise<void>;
  tap(): Promise<void>;
  dismiss(): Promise<void>;
  daysOfUse(): number;
  stories(): readonly ImpactStory[];
  story(slug: string): ImpactStory | undefined;
  open(slug: string): Promise<ImpactStory | undefined>;
  refresh(): Promise<StoriesRefreshOutcome>;
  storyWords(story: ImpactStory | undefined): StoryWords;
  give: string;
};

export function createPartnersService(kernel: Kernel): PartnersService {
  const { partners } = kernel;
  const words = (): PartnersWords => partnersWords(kernel);
  return {
    words,
    storyWords(story) {
      const current = words();
      return {
        overline: current.t('invitation.overline'),
        readMore: current.t('invitation.readMore'),
        securityNote: story?.securityNote ?? current.t('impact.securityNote'),
      };
    },
    invitation: (at) => partners.invitation(at),
    shown: (at) => partners.shown(at),
    tap: () => partners.tap(),
    dismiss: () => partners.dismiss(),
    daysOfUse: () => partners.daysOfUse(),
    stories: () => partners.stories(),
    story: (slug) => partners.story(slug),
    open: (slug) => partners.open(slug),
    refresh: () => partners.refresh(),
    give: partners.give,
  };
}
