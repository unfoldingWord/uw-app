import { fieldValidators } from '../domain/fields';
import { hostOf, isAllowedUrl } from '../network';

export const unfoldingWordSite = 'https://unfoldingword.org';

export const giveUrl = `${unfoldingWordSite}/Give`;

export const impactStoriesFeedUrl = `${unfoldingWordSite}/app/impact-stories.json`;

export const impactStoriesTimeoutMs = 15_000;

export type ImpactStoryImage = { readonly path: string } | { readonly url: string };

export type ImpactStory = {
  readonly slug: string;
  readonly title: string;
  readonly body: readonly string[];
  readonly link: string;
  readonly image?: ImpactStoryImage;
  readonly securityNote?: string;
  readonly shipped: boolean;
};

export type FeedStory = {
  readonly slug: string;
  readonly title: string;
  readonly body: readonly string[];
  readonly link: string;
  readonly imageUrl?: string;
  readonly securityNote?: string;
};

export const shippedStories: readonly ImpactStory[] = Object.freeze([
  {
    slug: 'jeremiah-and-the-occult-king',
    title: 'Jeremiah and the Occult King',
    body: [
      'Jeremiah is part of a church-planting work in Chad.',
      'This story tells what happened as Open Bible Stories, translated into Chadian Arabic, went out with that work.',
      'The full account is on unfoldingword.org.',
    ],
    link: `${unfoldingWordSite}/africa/when-jeremiah-first-heard-that-his-chadian-church-planting/`,
    shipped: true,
  },
]);

const maximumTitle = 160;
const maximumParagraph = 2000;
const maximumParagraphs = 12;
const maximumStories = 20;
const maximumNote = 400;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' || trimmed.length > maximum ? undefined : trimmed;
}

function siteUrl(value: unknown): string | undefined {
  return typeof value === 'string' && isAllowedUrl(value) && hostOf(value) === 'unfoldingword.org'
    ? value
    : undefined;
}

function paragraphs(value: unknown): readonly string[] | undefined {
  const items = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(items) || items.length === 0 || items.length > maximumParagraphs) {
    return undefined;
  }
  const texts = items.map((item) => boundedText(item, maximumParagraph));
  return texts.every((item): item is string => item !== undefined) ? texts : undefined;
}

function feedStoryOf(value: unknown): FeedStory | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const slug = value.slug;
  const title = boundedText(value.title, maximumTitle);
  const body = paragraphs(value.body);
  const link = siteUrl(value.link);
  if (!fieldValidators.slug(slug) || title === undefined || body === undefined || link === undefined) {
    return undefined;
  }
  const imageUrl = siteUrl(value.image);
  const securityNote = boundedText(value.securityNote, maximumNote);
  return {
    slug: slug as string,
    title,
    body,
    link,
    ...(imageUrl === undefined ? {} : { imageUrl }),
    ...(securityNote === undefined ? {} : { securityNote }),
  };
}

export function parseFeed(value: unknown): readonly FeedStory[] | undefined {
  if (!isRecord(value) || !Array.isArray(value.stories)) {
    return undefined;
  }
  const stories: FeedStory[] = [];
  for (const item of value.stories.slice(0, maximumStories)) {
    const story = feedStoryOf(item);
    if (story !== undefined && !stories.some((known) => known.slug === story.slug)) {
      stories.push(story);
    }
  }
  return stories;
}

export function mergedStories(
  feed: readonly FeedStory[],
  images: ReadonlyMap<string, string>,
): readonly ImpactStory[] {
  const fromFeed: ImpactStory[] = feed.map((story) => {
    const path = images.get(story.slug);
    const image: ImpactStoryImage | undefined =
      path !== undefined ? { path } : story.imageUrl === undefined ? undefined : { url: story.imageUrl };
    return {
      slug: story.slug,
      title: story.title,
      body: story.body,
      link: story.link,
      shipped: false,
      ...(image === undefined ? {} : { image }),
      ...(story.securityNote === undefined ? {} : { securityNote: story.securityNote }),
    };
  });
  const shipped = shippedStories.filter((story) => !feed.some((item) => item.slug === story.slug));
  return [...fromFeed, ...shipped];
}
