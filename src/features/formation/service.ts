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
} from '@lib/formation/types';
import type { FailureCode } from '@lib/domain/failures';
import type { Kernel } from '@lib/kernel';
import { clipControls, clockTime, type ClipControls } from '@lib/player/controls';
import type { PlayerStatus } from '@lib/player/player';
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
  TrainingSession,
} from '@lib/formation/types';
export type { FormationWords } from './strings';
export type { ClipControls } from '@lib/player/controls';
export type { PlayerStatus } from '@lib/player/player';
export type { StoryAudio } from '@lib/formation/types';

export type DownloadOutcome = { readonly ok: true } | { readonly ok: false; readonly code: FailureCode };

export type FormationService = {
  words(): FormationWords;
  language(): string | undefined;
  tracks(): Promise<readonly TrackSummary[]>;
  session(track: Track, number: number): Promise<Session | undefined>;
  englishAlongside(): boolean;
  setEnglishAlongside(on: boolean): Promise<boolean>;
  groups(): readonly Group[];
  group(id: string): Group | undefined;
  active(): Group | undefined;
  create(name: string): Promise<Group | undefined>;
  rename(group: string, name: string): Promise<Group | undefined>;
  remove(group: string): Promise<boolean>;
  activate(group: string): Promise<Group | undefined>;
  advance(group: string, to: Position): Promise<Group | undefined>;
  start(group: string): Promise<Group | undefined>;
  complete(group: string): Promise<Group | undefined>;
  progress(group: string): Promise<Progress | undefined>;
  next(group: string): Promise<NextSession | undefined>;
  note(group: string, track: Track, session: number): string | undefined;
  saveNote(group: string, track: Track, session: number, text: string): Promise<boolean>;
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
    start: (group) => withLanguage((current) => formation.start(group, current)),
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
