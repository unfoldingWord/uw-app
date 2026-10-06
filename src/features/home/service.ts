import type { Bookmark } from '@lib/bookmarks/types';
import type { RefreshOutcome } from '@lib/catalog/types';
import type { FailureCode } from '@lib/domain/failures';
import { languagePackId, type PackId } from '@lib/domain/pack';
import type { Position } from '@lib/formation/types';
import type { Kernel } from '@lib/kernel';
import type { InstallOutcome, InstallProgress, PackUpdate } from '@lib/packs/types';
import type { ImpactStory, Invitation, StoriesRefreshOutcome } from '@lib/partners/types';
import type { Written } from '@lib/written';
import { homeWords, type HomeWords } from './strings';

export type LocalTime = { readonly at: number; readonly utcOffsetMinutes: number };

export type DayPart = 'morning' | 'afternoon' | 'evening';

export type Greeting = { readonly part: DayPart; readonly text: string; readonly date: string };

export type ThemeChoice = 'system' | 'light' | 'dark';

export type Scheme = 'light' | 'dark';

export type LanguageChip = { readonly language: string; readonly autonym: string; readonly label: string };

export type HeaderView = { readonly language: LanguageChip | undefined; readonly theme: ThemeChoice };

export type ReadingCard = { readonly reference: string; readonly label: string; readonly language: string };

export type FormationCard = {
  readonly group: string;
  readonly groupName: string;
  readonly position: Position;
  readonly title: string;
  readonly next: string | undefined;
  readonly href: string;
};

export type DownloadView =
  | { readonly state: 'no-language' }
  | {
      readonly state: 'none';
      readonly language: string;
      readonly pack: PackId;
      readonly missing: number;
      readonly online: boolean;
      readonly failure: FailureCode | undefined;
      readonly label: string;
      readonly detail: string | undefined;
    }
  | {
      readonly state: 'installing';
      readonly language: string;
      readonly pack: PackId;
      readonly progress: InstallProgress;
      readonly percent: number;
      readonly label: string;
      readonly detail: string;
    }
  | {
      readonly state: 'missing';
      readonly language: string;
      readonly pack: PackId;
      readonly resources: number;
      readonly missing: number;
      readonly online: boolean;
      readonly failure: FailureCode | undefined;
      readonly label: string;
      readonly detail: string | undefined;
    }
  | {
      readonly state: 'complete';
      readonly language: string;
      readonly pack: PackId;
      readonly resources: number;
      readonly label: string;
    };

export type SavedKind = 'passage' | 'word' | 'academy' | 'story';

export type SavedItem = {
  readonly bookmark: Bookmark;
  readonly kind: SavedKind;
  readonly title: string;
  readonly detail: string;
  readonly href: string;
};

export type InvitationWords = {
  readonly overline: string;
  readonly body: string;
  readonly action: string;
  readonly dismiss: string;
  readonly readMore: string;
  readonly securityNote?: string;
  readonly opensBrowser: string;
  readonly linksOpenBrowser: string;
};

export type InvitationCard =
  | (Extract<Invitation, { state: 'due' }> & {
      readonly words: InvitationWords;
      readonly image: string | undefined;
    })
  | Extract<Invitation, { state: 'not-due' }>;

export type WhatsNewItem = {
  readonly pack: PackId;
  readonly update: PackUpdate;
  readonly title: string;
  readonly detail: string | undefined;
};

export type HomeService = {
  words(): HomeWords;
  header(): HeaderView;
  toggleTheme(system: Scheme): Promise<Written<Scheme>>;
  greeting(local: LocalTime): Greeting;
  continueReading(): ReadingCard | undefined;
  continueFormation(): Promise<FormationCard | undefined>;
  download(): Promise<DownloadView>;
  completeDownload(): Promise<InstallOutcome | undefined>;
  saved(): readonly SavedItem[];
  removeSaved(id: string): Promise<Written<true> | undefined>;
  invitation(at: number): InvitationCard;
  openStory(slug: string): Promise<string | undefined>;
  invitationShown(at: number): Promise<void>;
  tapInvitation(): Promise<void>;
  dismissInvitation(): Promise<void>;
  checkForUpdates(): Promise<RefreshOutcome>;
  refreshStories(): Promise<StoriesRefreshOutcome | undefined>;
  whatsNew(): Promise<readonly WhatsNewItem[]>;
  update(pack: PackId): Promise<InstallOutcome>;
  onChange(listener: () => void): () => void;
};

const minuteMs = 60 * 1000;

function dayPartOf(hour: number): DayPart {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  return hour >= 12 && hour < 17 ? 'afternoon' : 'evening';
}

function autonymOf(kernel: Kernel, language: string): string {
  return kernel.catalog.languages().find((item) => item.language === language)?.autonym ?? language;
}

function greetingText(words: HomeWords, part: DayPart, name: string | undefined): string {
  switch (part) {
    case 'morning':
      return name === undefined
        ? words.t('home.greeting.morning')
        : words.t('home.greeting.morning.named', { name });
    case 'afternoon':
      return name === undefined
        ? words.t('home.greeting.afternoon')
        : words.t('home.greeting.afternoon.named', { name });
    case 'evening':
      return name === undefined
        ? words.t('home.greeting.evening')
        : words.t('home.greeting.evening.named', { name });
  }
}

function bookmarkHref(bookmark: Bookmark): string {
  switch (bookmark.target) {
    case 'passage':
      return `/study?reference=${encodeURIComponent(bookmark.reference)}`;
    case 'story':
      return `/study/story/${String(bookmark.story)}`;
    case 'article':
      return `/study/article/${bookmark.article.split('/').map(encodeURIComponent).join('/')}`;
  }
}

function savedTitle(kernel: Kernel, words: HomeWords, bookmark: Bookmark): string {
  const { corpus } = kernel;
  switch (bookmark.target) {
    case 'passage':
      return corpus.referenceName(bookmark.reference, bookmark.language);
    case 'story': {
      const number = words.t('home.formation.story', { number: bookmark.story });
      const title = corpus.title({ kind: 'story', story: bookmark.story }, bookmark.language);
      return title === undefined ? number : words.t('common.joined', { first: number, second: title });
    }
    case 'article':
      return (
        corpus.title({ kind: 'article', id: bookmark.article }, bookmark.language) ??
        bookmark.article.split('/').at(-1) ??
        bookmark.article
      );
  }
}

function savedOf(kernel: Kernel, words: HomeWords, bookmark: Bookmark): SavedItem {
  const language = autonymOf(kernel, bookmark.language);
  const href = bookmarkHref(bookmark);
  const title = savedTitle(kernel, words, bookmark);
  switch (bookmark.target) {
    case 'passage':
      return { bookmark, kind: 'passage', title, detail: words.t('home.saved.passage', { language }), href };
    case 'story':
      return { bookmark, kind: 'story', title, detail: words.t('home.saved.story', { language }), href };
    case 'article':
      return bookmark.article.startsWith('ta/')
        ? { bookmark, kind: 'academy', title, detail: words.t('home.saved.academy', { language }), href }
        : { bookmark, kind: 'word', title, detail: words.t('home.saved.word', { language }), href };
  }
}

function invitationWords(words: HomeWords, story: ImpactStory): InvitationWords {
  return {
    overline: words.t('invitation.overline'),
    body: words.t('invitation.body'),
    action: words.t('invitation.action'),
    dismiss: words.t('invitation.dismiss'),
    readMore: words.t('invitation.readMore'),
    ...(story.securityNote === undefined ? {} : { securityNote: story.securityNote }),
    opensBrowser: words.t('common.opensBrowser'),
    linksOpenBrowser: words.t('common.linksOpenBrowser'),
  };
}

export function createHomeService(kernel: Kernel): HomeService {
  const { preferences } = kernel;
  const words = (): HomeWords => homeWords(kernel);

  const countLine = (current: HomeWords, onPhone: number, total: number): string =>
    current.plural('home.download.count', total, { count: String(onPhone), total });

  const download = async (): Promise<DownloadView> => {
    const language = preferences.contentLanguage();
    if (language === undefined) {
      return { state: 'no-language' };
    }
    const current = words();
    const autonym = autonymOf(kernel, language);
    const pack = languagePackId(language);
    const status = await kernel.packs.status(language);
    const total = status.installed.length + status.missing.length;
    const progress = kernel.packs.installing().find((item) => item.pack === pack);
    if (progress !== undefined) {
      const percent = progress.total === 0 ? 0 : Math.round((progress.resources / progress.total) * 100);
      return {
        state: 'installing',
        language,
        pack,
        progress,
        percent,
        label: current.t('home.download.progress', { language: autonym }),
        detail: countLine(current, status.installed.length, total),
      };
    }
    const online = await kernel.catalog.online();
    const failure = status.failure ?? status.failed[0]?.code;
    if (status.installed.length === 0) {
      return {
        state: 'none',
        language,
        pack,
        missing: status.missing.length,
        online,
        failure,
        label: current.t('home.download.none', { language: autonym }),
        detail: total === 0 ? undefined : countLine(current, 0, total),
      };
    }
    if (status.missing.length > 0) {
      return {
        state: 'missing',
        language,
        pack,
        resources: status.installed.length,
        missing: status.missing.length,
        online,
        failure,
        label: current.t('home.download.missing', { language: autonym }),
        detail: countLine(current, status.installed.length, total),
      };
    }
    return {
      state: 'complete',
      language,
      pack,
      resources: status.installed.length,
      label: current.plural('home.download.ready', status.installed.length, { language: autonym }),
    };
  };

  return {
    words,
    header: () => {
      const language = preferences.contentLanguage();
      const autonym = language === undefined ? undefined : autonymOf(kernel, language);
      return {
        language:
          language === undefined || autonym === undefined
            ? undefined
            : { language, autonym, label: words().t('common.language.chip', { language: autonym }) },
        theme: preferences.get('home.theme') ?? 'system',
      };
    },
    async toggleTheme(system) {
      const theme = preferences.get('home.theme') ?? 'system';
      const shown = theme === 'system' ? system : theme;
      const next: Scheme = shown === 'dark' ? 'light' : 'dark';
      return (await preferences.set('home.theme', next))
        ? { ok: true, value: next }
        : { ok: false, code: 'kv.io' };
    },
    greeting(local) {
      const shifted = new Date(local.at + local.utcOffsetMinutes * minuteMs);
      const part = dayPartOf(shifted.getUTCHours());
      const current = words();
      const date = new Intl.DateTimeFormat(current.locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(shifted);
      return { part, text: greetingText(current, part, preferences.get('home.name')), date };
    },
    continueReading: () => {
      const language = preferences.contentLanguage();
      const reference = language === undefined ? undefined : preferences.lastPassage(language);
      return language === undefined || reference === undefined
        ? undefined
        : { reference, label: kernel.corpus.referenceName(reference, language), language };
    },
    async continueFormation() {
      const language = preferences.contentLanguage();
      const group = kernel.formation.active();
      if (language === undefined || group === undefined) {
        return undefined;
      }
      const next = await kernel.formation.next(group.id, language);
      return next === undefined
        ? undefined
        : {
            group: next.group,
            groupName: group.name,
            position: next.position,
            title: next.title,
            next:
              next.position.movement === undefined
                ? undefined
                : words().t('home.formation.next', {
                    movement: words().t(`movement.${next.position.movement}`),
                  }),
            href: `/formation/session/${next.position.track}/${String(next.position.session)}`,
          };
    },
    download,
    async completeDownload() {
      const language = preferences.contentLanguage();
      return language === undefined ? undefined : kernel.packs.installFromCatalog(languagePackId(language));
    },
    saved: () => {
      const current = words();
      return kernel.bookmarks.list().map((bookmark) => savedOf(kernel, current, bookmark));
    },
    removeSaved: (id) => kernel.bookmarks.remove(id),
    invitation(at) {
      const invitation = kernel.partners.invitation(at);
      return invitation.state === 'due'
        ? {
            ...invitation,
            words: invitationWords(words(), invitation.story),
            image:
              invitation.story.image !== undefined && 'path' in invitation.story.image
                ? kernel.media.uriOf(invitation.story.image.path)
                : undefined,
          }
        : invitation;
    },
    openStory: async (slug) => (await kernel.partners.open(slug))?.link,
    invitationShown: (at) => kernel.partners.shown(at),
    tapInvitation: () => kernel.partners.tap(),
    dismissInvitation: () => kernel.partners.dismiss(),
    checkForUpdates: () => kernel.catalog.refresh(),
    refreshStories: () => kernel.partners.refreshIfDue(),
    async whatsNew() {
      const current = words();
      const updates = await kernel.packs.updates();
      return updates.map((update) => {
        const [only] = update.resources;
        if (update.resources.length !== 1 || only === undefined) {
          return {
            pack: update.pack,
            update,
            title: current.plural('home.new.many', update.resources.length),
            detail: undefined,
          };
        }
        const release = kernel.catalog
          .all()
          .find(
            (item) =>
              item.publisher === only.available.publisher &&
              item.resource === only.available.resource &&
              item.tag === only.available.tag,
          );
        return {
          pack: update.pack,
          update,
          title: current.t('home.new.one', { resource: release?.title ?? only.resource }),
          detail: current.t('home.new.detail', {
            newVersion: only.available.tag,
            oldVersion: only.installed,
            size: release?.bytes === undefined ? '' : current.size(release.bytes),
          }),
        };
      });
    },
    update: (pack) => kernel.packs.update(pack),
    onChange(listener) {
      const stopPreferences = preferences.onChange(() => listener());
      const stopBookmarks = kernel.bookmarks.onChange(listener);
      const stopPacks = kernel.packs.onChange(listener);
      return () => {
        stopPreferences();
        stopBookmarks();
        stopPacks();
      };
    },
  };
}
