import { fromUtf8 } from '../burrito/files';
import type { DomainEvent } from '../domain/events';
import { failureCodeOf, type FailureCode } from '../domain/failures';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import { compareText } from '../order';
import type { HttpResponse } from '../ports';
import { inUnitedStates } from './region';
import { invitationState, type Invitation, type Schedule } from './schedule';
import {
  giveUrl,
  impactStoriesFeedUrl,
  impactStoriesTimeoutMs,
  mergedStories,
  parseFeed,
  type FeedStory,
  type ImpactStory,
} from './stories';

export const partnersDirectory = 'partners';

const imagesDirectory = `${partnersDirectory}/images`;

const stagingDirectory = `${partnersDirectory}/staging`;

export const invitationKey = 'partners.invitation';

export const storiesKey = 'partners.stories';

export type { Invitation } from './schedule';

export type StoriesRefreshOutcome = { ok: true; stories: number } | { ok: false; code: FailureCode };

export type PartnersApi = {
  inUnitedStates(): boolean;
  daysOfUse(): number;
  invitation(at: number): Invitation;
  shown(at: number): Promise<void>;
  tap(): Promise<void>;
  dismiss(): Promise<void>;
  stories(): readonly ImpactStory[];
  story(slug: string): ImpactStory | undefined;
  open(slug: string): Promise<ImpactStory | undefined>;
  refresh(): Promise<StoriesRefreshOutcome>;
  give: string;
};

type Cache = { stories: readonly FeedStory[]; images: Readonly<Record<string, string>> };

const emptyCache: Cache = Object.freeze({ stories: [], images: {} });

function parseJson(text: string | undefined): unknown {
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function scheduleOf(value: unknown): Schedule {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const schedule: Schedule = {};
  if (typeof record.shownAt === 'number') {
    schedule.shownAt = record.shownAt;
  }
  if (typeof record.dismissedAt === 'number') {
    schedule.dismissedAt = record.dismissedAt;
  }
  return schedule;
}

function cacheOf(value: unknown): Cache {
  if (typeof value !== 'object' || value === null) {
    return emptyCache;
  }
  const record = value as Record<string, unknown>;
  const stories = parseFeed({ stories: record.stories });
  const images = record.images;
  if (stories === undefined || typeof images !== 'object' || images === null) {
    return emptyCache;
  }
  const paths = Object.fromEntries(
    Object.entries(images).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[1].startsWith(`${imagesDirectory}/`),
    ),
  );
  return { stories, images: paths };
}

function daysOf(value: JsonValue): readonly string[] {
  return Array.isArray(value) && value.every((day) => typeof day === 'string') ? (value as string[]) : [];
}

function withDay(days: readonly string[], event: DomainEvent): readonly string[] {
  if (event.type !== 'AppOpened' || days.includes(event.payload.day)) {
    return days;
  }
  return [...days, event.payload.day].sort(compareText);
}

function unreachableCode(response: Exclude<HttpResponse, { kind: 'response' }>): FailureCode {
  switch (response.kind) {
    case 'offline':
      return 'http.offline';
    case 'timeout':
      return 'http.timeout';
    case 'refused':
      return 'http.host-refused';
    case 'cancelled':
      return 'http.cancelled';
  }
}

export const partnersModule = defineModule<PartnersApi>({
  events: [
    'InvitationShown',
    'InvitationTapped',
    'InvitationDismissed',
    'ImpactStoryOpened',
    'ImpactStoriesRefreshStarted',
    'ImpactStoriesRefreshed',
  ],
  owns: { tables: [], directories: [partnersDirectory], keys: [invitationKey, storiesKey] },
  checkpoint: {
    initial: [],
    step: (state, event) => [...withDay(daysOf(state), event)],
  },
  create(context) {
    const { kv, files, http, locale } = context.ports;
    let schedule: Schedule = {};
    let cache: Cache = emptyCache;
    let work: Promise<unknown> = Promise.resolve();

    const serial = <T>(task: () => Promise<T>): Promise<T> => {
      const result = work.then(task, task);
      work = result.catch(() => undefined);
      return result;
    };

    const stories = (): readonly ImpactStory[] =>
      mergedStories(cache.stories, new Map(Object.entries(cache.images)));

    const daysOfUse = (): number => context.events().reduce(withDay, daysOf(context.baseline())).length;

    const invitation = (at: number): Invitation =>
      invitationState({
        at,
        unitedStates: inUnitedStates(locale.current()),
        daysOfUse: daysOfUse(),
        stories: stories(),
        schedule,
        give: giveUrl,
      });

    const failed = async (code: FailureCode, status?: number): Promise<StoriesRefreshOutcome> => {
      await context.emit({
        type: 'Failure',
        payload: {
          code,
          context: status === undefined ? { step: 'impact-stories' } : { step: 'impact-stories', status },
        },
      });
      return { ok: false, code };
    };

    const saveJson = async (key: string, value: JsonValue): Promise<void> => {
      try {
        await kv.set(key, JSON.stringify(value));
      } catch (error) {
        await context.emit({
          type: 'Failure',
          payload: {
            code: failureCodeOf(error) === 'unexpected' ? 'kv.io' : failureCodeOf(error),
            context: {},
          },
        });
      }
    };

    const fetchImage = async (story: FeedStory): Promise<string | undefined> => {
      if (story.imageUrl === undefined) {
        return undefined;
      }
      const staged = `${stagingDirectory}/${story.slug}`;
      const target = `${imagesDirectory}/${story.slug}`;
      try {
        await files.mkdir(stagingDirectory);
        await files.mkdir(imagesDirectory);
        const downloaded = await http.download({
          url: story.imageUrl,
          to: staged,
          timeoutMs: impactStoriesTimeoutMs,
        });
        if (downloaded.kind !== 'response') {
          await failed(unreachableCode(downloaded));
          return undefined;
        }
        if (downloaded.status < 200 || downloaded.status >= 300) {
          await files.remove(staged);
          await failed('http.status', downloaded.status);
          return undefined;
        }
        if (await files.exists(target)) {
          await files.remove(target);
        }
        await files.rename(staged, target);
        return target;
      } catch (error) {
        await failed(failureCodeOf(error) === 'unexpected' ? 'files.io' : failureCodeOf(error));
        return undefined;
      }
    };

    const refresh = (): Promise<StoriesRefreshOutcome> =>
      serial(async () => {
        await context.emit({ type: 'ImpactStoriesRefreshStarted', payload: {} });
        const response = await http.request({ url: impactStoriesFeedUrl, timeoutMs: impactStoriesTimeoutMs });
        if (response.kind !== 'response') {
          return failed(unreachableCode(response));
        }
        if (response.status < 200 || response.status >= 300) {
          return failed('http.status', response.status);
        }
        const feed = parseFeed(parseJson(fromUtf8(response.body)));
        if (feed === undefined) {
          return failed('partners.invalid-feed');
        }
        const images: Record<string, string> = {};
        for (const story of feed) {
          const path = await fetchImage(story);
          if (path !== undefined) {
            images[story.slug] = path;
          }
        }
        for (const [slug, path] of Object.entries(cache.images)) {
          if (images[slug] === undefined && (await files.exists(path))) {
            await files.remove(path);
          }
        }
        cache = { stories: feed, images };
        await saveJson(storiesKey, cache as unknown as JsonValue);
        await context.emit({ type: 'ImpactStoriesRefreshed', payload: { stories: feed.length } });
        return { ok: true, stories: feed.length };
      });

    const story = (slug: string): ImpactStory | undefined => stories().find((item) => item.slug === slug);

    const api: PartnersApi = {
      inUnitedStates: () => inUnitedStates(locale.current()),
      daysOfUse,
      invitation,
      async shown(at) {
        const current = invitation(at);
        if (current.state === 'due' && !current.shown) {
          await context.emit({ type: 'InvitationShown', payload: {} });
        }
      },
      async tap() {
        await context.emit({ type: 'InvitationTapped', payload: {} });
      },
      async dismiss() {
        await context.emit({ type: 'InvitationDismissed', payload: {} });
      },
      stories,
      story,
      async open(slug) {
        const found = story(slug);
        if (found !== undefined) {
          await context.emit({ type: 'ImpactStoryOpened', payload: { story: found.slug } });
        }
        return found;
      },
      refresh,
      give: giveUrl,
    };

    return {
      api,
      async start() {
        schedule = scheduleOf(parseJson(await kv.get(invitationKey)));
        cache = cacheOf(parseJson(await kv.get(storiesKey)));
      },
      async observe(entry) {
        if (entry.type === 'InvitationShown') {
          schedule = { ...schedule, shownAt: entry.at };
        } else if (entry.type === 'InvitationDismissed') {
          schedule = { ...schedule, dismissedAt: entry.at };
        } else {
          return;
        }
        await saveJson(invitationKey, schedule);
      },
      snapshot(): JsonValue {
        return {
          stories: stories().map((item) => item.slug),
          invitation: { ...schedule },
        };
      },
      redo: {
        ImpactStoriesRefreshStarted: async () => {
          await refresh();
        },
      },
    };
  },
});
