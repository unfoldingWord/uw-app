import type { Frame } from '@lib/corpus/types';
import type {
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
import type { Kernel } from '@lib/kernel';
import { clipControls, clockTime, type ClipControls, type PlayerStatus } from '@lib/player/types';
import type { Written } from '@lib/written';
import { formationWords, type FormationWords } from './strings';

export type { Block, Frame, Inline, MovementSection } from '@lib/corpus/types';
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
} from '@lib/formation/types';
export type { FormationWords } from './strings';
export type { ClipControls, PlayerStatus } from '@lib/player/types';
export type { StoryAudio } from '@lib/formation/types';

export type { Written } from '@lib/written';

export type DownloadOutcome = { readonly ok: true } | { readonly ok: false; readonly code: FailureCode };

export type FormationService = {
  words(): FormationWords;
  language(): string | undefined;
  tracks(): Promise<readonly TrackSummary[]>;
  trainingOutline(): Promise<TrainingOutline>;
  session(track: Track, number: number): Promise<Session | undefined>;
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
  const { formation, preferences } = kernel;
  const language = (): string | undefined => preferences.contentLanguage();
  const englishAlongside = (): boolean => preferences.get('formation.englishMovements') === 'on';

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
    languageName: (code) =>
      kernel.catalog.languages().find((item) => item.language === code)?.autonym ?? code,
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
