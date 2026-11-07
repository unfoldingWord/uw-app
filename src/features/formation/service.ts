import type { Bookmark } from '@lib/bookmarks/types';
import type { Frame, Story, StoryEntry, StoryQuestion } from '@lib/corpus/types';
import type {
  FoundationsSession,
  Group,
  NextSession,
  Position,
  Progress,
  Session,
  Track,
  StoryAudio,
  TrackSummary,
  TrainingOutline,
} from '@lib/formation/types';
import type { FailureCode } from '@lib/domain/failures';
import { imagePackId } from '@lib/domain/pack';
import type { Kernel } from '@lib/kernel';
import { clipControls, clockTime, type ClipControls, type PlayerStatus } from '@lib/player/types';
import type { Written } from '@lib/written';
import { formationWords, type FormationWords } from './strings';

export type { Bookmark } from '@lib/bookmarks/types';
export type { Block, Frame, Inline, MovementSection, Story, StoryQuestion } from '@lib/corpus/types';
export type {
  EnglishMovements,
  FormationContent,
  FoundationsSession,
  Group,
  Position,
  Progress,
  Session,
  SessionMovement,
  SessionMovementId,
  Track,
  TrackSummary,
  TrainingLesson,
  TrainingOutline,
  TrainingSession,
  TrainingUnit,
} from '@lib/formation/types';
export type { FormationWords } from './strings';
export type { ClipControls, PlayerStatus } from '@lib/player/types';
export type { StoryAudio } from '@lib/formation/types';

export type { Written } from '@lib/written';

export type DownloadOutcome = { readonly ok: true } | { readonly ok: false; readonly code: FailureCode };

export type StoryTitle = { readonly number: number; readonly title: string; readonly picture?: string };

export type StoryContents =
  | { readonly state: 'no-language' }
  | { readonly state: 'not-downloaded'; readonly language: string }
  | { readonly state: 'ready'; readonly language: string; readonly stories: readonly StoryTitle[] };

export type StoryList = {
  readonly stories: readonly StoryTitle[];
  readonly previous?: number;
  readonly next?: number;
};

export type StoryTalk = {
  readonly frame: readonly StoryQuestion[];
  readonly story: readonly StoryQuestion[];
};

export type Pictures = 'on-phone' | 'offered' | 'not-offered';

export type StoryAbsence = 'not-downloaded' | 'not-found';

function storyListOf(sorted: readonly StoryTitle[], current: number): StoryList {
  const previous = sorted.filter((story) => story.number < current).at(-1)?.number;
  const next = sorted.find((story) => story.number > current)?.number;
  return {
    stories: sorted,
    ...(previous === undefined ? {} : { previous }),
    ...(next === undefined ? {} : { next }),
  };
}

function storyTalk(story: Story, frame: number): StoryTalk {
  return {
    frame: story.questions.filter((question) => question.frame === frame),
    story: story.questions.filter((question) => question.frame === undefined),
  };
}

export type FormationService = {
  words(): FormationWords;
  language(): string | undefined;
  tracks(): Promise<readonly TrackSummary[]>;
  trainingOutline(): Promise<TrainingOutline>;
  session(track: Track, number: number): Promise<Session | undefined>;
  read(story: number): Promise<FoundationsSession | undefined>;
  absence(story: number): Promise<StoryAbsence>;
  contents(): Promise<StoryContents>;
  storyList(current: number): Promise<StoryList>;
  talk(story: Story, frame: number): StoryTalk;
  saved(story: number): Bookmark | undefined;
  save(story: number): Promise<Written<Bookmark> | undefined>;
  unsave(id: string): Promise<Written<true> | undefined>;
  pictures(): Pictures;
  downloadPictures(): Promise<DownloadOutcome>;
  englishAlongside(): boolean;
  setEnglishAlongside(on: boolean): Promise<boolean>;
  groups(): readonly Group[];
  group(id: string): Group | undefined;
  active(): Group | undefined;
  create(name: string): Promise<Written<Group> | undefined>;
  rename(group: string, name: string): Promise<Written<Group> | undefined>;
  remove(group: string): Promise<Written<true> | undefined>;
  activate(group: string): Promise<Written<Group> | undefined>;
  advance(group: string, to: Position): Promise<Written<Group> | undefined>;
  start(group: string, at?: Position): Promise<Written<Group> | undefined>;
  complete(group: string): Promise<Written<Group> | undefined>;
  progress(group: string): Promise<Progress | undefined>;
  next(group: string): Promise<NextSession | undefined>;
  note(group: string, track: Track, session: number): string | undefined;
  saveNote(group: string, track: Track, session: number, text: string): Promise<Written<true> | undefined>;
  languageName(language: string): string;
  download(pack: string): Promise<DownloadOutcome>;
  picture(frame: Frame): string | undefined;
  listen(audio: StoryAudio): ClipControls | undefined;
  audioTime(status: PlayerStatus): string;
};

export function createFormationService(kernel: Kernel): FormationService {
  const { formation, preferences, corpus, bookmarks } = kernel;
  const language = (): string | undefined => preferences.contentLanguage();
  const englishAlongside = (): boolean => preferences.get('formation.englishMovements') === 'on';

  const pictureOf = (entry: StoryEntry): string | undefined =>
    entry.picture === undefined ? undefined : kernel.media.uriOf(entry.picture.path);

  const titlesIn = async (code: string): Promise<readonly StoryTitle[]> =>
    (await corpus.contents(code)).stories
      .map((entry) => {
        const picture = pictureOf(entry);
        const named = { number: entry.number, title: entry.title };
        return picture === undefined ? named : { ...named, picture };
      })
      .sort((left, right) => left.number - right.number);

  const withLanguage = async <T>(work: (current: string) => Promise<T>): Promise<T | undefined> => {
    const current = language();
    return current === undefined ? undefined : work(current);
  };

  return {
    words: () => formationWords(kernel),
    language,
    tracks: async () => (await withLanguage((current) => formation.tracks(current))) ?? [],
    trainingOutline: async () =>
      (await withLanguage((current) => formation.trainingOutline(current))) ?? { lessons: 0, units: [] },
    session: (track, number) =>
      withLanguage((current) =>
        formation.session(track, number, current, { englishAlongside: englishAlongside() }),
      ),
    async read(story) {
      const current = language();
      if (current === undefined) {
        return undefined;
      }
      const session = await formation.session('foundations', story, current, {
        englishAlongside: englishAlongside(),
      });
      if (session?.track !== 'foundations') {
        return undefined;
      }
      await corpus.storyOpened(story, current);
      return session;
    },
    async absence(story) {
      const stories = (await withLanguage((code) => corpus.contents(code)))?.stories ?? [];
      return stories.length > 0 && !stories.some((item) => item.number === story)
        ? 'not-found'
        : 'not-downloaded';
    },
    async contents() {
      const current = language();
      if (current === undefined) {
        return { state: 'no-language' };
      }
      const stories = await titlesIn(current);
      return stories.length === 0
        ? { state: 'not-downloaded', language: current }
        : { state: 'ready', language: current, stories };
    },
    storyList: async (current) => storyListOf((await withLanguage(titlesIn)) ?? [], current),
    talk: storyTalk,
    saved(story) {
      const current = language();
      return current === undefined
        ? undefined
        : bookmarks.find({ target: 'story', story, language: current });
    },
    save: (story) => withLanguage((current) => bookmarks.add({ target: 'story', story, language: current })),
    unsave: (id) => bookmarks.remove(id),
    pictures() {
      if (kernel.packs.installed().some((pack) => pack.pack === imagePackId)) {
        return 'on-phone';
      }
      return kernel.catalog.all().some((release) => release.pack === imagePackId) ? 'offered' : 'not-offered';
    },
    async downloadPictures() {
      const outcome = await kernel.packs.installFromCatalog(imagePackId);
      return outcome.ok ? { ok: true } : { ok: false, code: outcome.code };
    },
    englishAlongside,
    setEnglishAlongside: (on) => preferences.set('formation.englishMovements', on ? 'on' : 'off'),
    groups: () => formation.groups(),
    group: (id) => formation.group(id),
    active: () => formation.active(),
    create: (name) => formation.create(name),
    rename: (group, name) => formation.rename(group, name),
    remove: (group) => formation.remove(group),
    activate: (group) => formation.activate(group),
    advance: (group, to) => formation.advance(group, to),
    start: (group, at) => withLanguage((current) => formation.start(group, current, at)),
    complete: (group) => formation.complete(group),
    progress: (group) => withLanguage((current) => formation.progress(group, current)),
    next: (group) => withLanguage((current) => formation.next(group, current)),
    note: (group, track, session) => formation.note(group, track, session),
    saveNote: (group, track, session, text) => formation.saveNote(group, track, session, text),
    languageName: (code) => kernel.catalog.nameOf(code).autonym,
    async download(pack) {
      const outcome = await kernel.packs.installFromCatalog(pack, { withRows: ['formation'] });
      return outcome.ok ? { ok: true } : { ok: false, code: outcome.code };
    },
    picture: (frame) => (frame.image === undefined ? undefined : kernel.media.uriOf(frame.image.path)),
    listen: (audio) =>
      audio.state === 'available'
        ? clipControls(kernel.player, { kind: 'file', path: audio.clip.path })
        : undefined,
    audioTime: (status) =>
      formationWords(kernel).t('session.audio.time', {
        position: clockTime('positionMs' in status ? status.positionMs : 0),
        duration: clockTime('durationMs' in status ? status.durationMs : 0),
      }),
  };
}
