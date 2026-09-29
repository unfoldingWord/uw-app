import type {
  Group,
  NextSession,
  Position,
  Progress,
  Session,
  Track,
  TrackSummary,
} from '@lib/formation/types';
import type { Kernel } from '@lib/kernel';
import { formationWords, type FormationWords } from './strings';

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
  };
}
