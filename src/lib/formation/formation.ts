import { corpusView } from '../corpus/view';
import { sessionMovements } from '../domain/events';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import type { DbTransaction } from '../ports';
import { firstPosition, isReachable, positionAt, progressOf, stepFrom } from './position';
import { assembleSession, sessionCount, sessionTitle, trackSummaries } from './sessions';
import {
  deleteGroup,
  formationTables,
  loadActive,
  loadGroups,
  loadNotes,
  noteKey,
  saveActive,
  saveGroup,
  saveNote,
  type GroupRow,
} from './store';
import type {
  Group,
  NextSession,
  Position,
  Progress,
  Session,
  SessionOptions,
  Track,
  TrackSummary,
} from './types';

export type FormationApi = {
  tracks(language: string): Promise<readonly TrackSummary[]>;
  session(
    track: Track,
    number: number,
    language: string,
    options?: SessionOptions,
  ): Promise<Session | undefined>;
  groups(): readonly Group[];
  group(id: string): Group | undefined;
  active(): Group | undefined;
  create(name: string): Promise<Group | undefined>;
  rename(group: string, name: string): Promise<Group | undefined>;
  remove(group: string): Promise<boolean>;
  activate(group: string): Promise<Group | undefined>;
  advance(group: string, to: Position): Promise<Group | undefined>;
  start(group: string, language: string): Promise<Group | undefined>;
  complete(group: string): Promise<Group | undefined>;
  progress(group: string, language: string): Promise<Progress | undefined>;
  next(group: string, language: string): Promise<NextSession | undefined>;
  note(group: string, track: Track, session: number): string | undefined;
  saveNote(group: string, track: Track, session: number, text: string): Promise<boolean>;
};

const standIn = '';

function publicGroup(row: GroupRow): Group {
  return { id: row.id, name: row.name, position: row.position };
}

function startedKey(position: Position): string {
  return `${position.track}:${position.session}`;
}

function isSessionNumber(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

export const formationModule = defineModule<FormationApi>({
  events: [
    'GroupCreated',
    'GroupRenamed',
    'GroupDeleted',
    'GroupActivated',
    'PositionChanged',
    'SessionStarted',
    'MovementCompleted',
    'LessonCompleted',
    'SessionCompleted',
    'SessionNoteSaved',
  ],
  owns: { tables: formationTables, directories: [], keys: [] },
  create(context) {
    const { db, files, ids } = context.ports;
    const view = corpusView(files, db);
    const groups = new Map<string, GroupRow>();
    const notes = new Map<string, string>();
    let active: string | undefined;
    let work: Promise<unknown> = Promise.resolve();

    const serial = <T>(task: () => Promise<T>): Promise<T> => {
      const result = work.then(task, task);
      work = result.catch(() => undefined);
      return result;
    };

    const ordered = (): GroupRow[] =>
      [...groups.values()].sort((left, right) => left.ordinal - right.ordinal);

    const store = async (row: GroupRow, activate: boolean): Promise<Group> => {
      await db.transaction(async (session: DbTransaction) => {
        await saveGroup(session, row);
        if (activate && active !== row.id) {
          await saveActive(session, row.id);
        }
      });
      groups.set(row.id, row);
      if (activate) {
        active = row.id;
      }
      return publicGroup(row);
    };

    const createGroup = async (name: string): Promise<Group> => {
      const id = ids.next();
      await context.emit({ type: 'GroupCreated', payload: { group: id } });
      const ordinal = Math.max(0, ...[...groups.values()].map((row) => row.ordinal)) + 1;
      return store({ id, name, position: firstPosition, ordinal }, active === undefined);
    };

    const renameGroup = async (id: string, name: string | undefined): Promise<Group | undefined> => {
      const row = groups.get(id);
      if (row === undefined) {
        return undefined;
      }
      await context.emit({ type: 'GroupRenamed', payload: { group: id } });
      return store(name === undefined ? row : { ...row, name }, false);
    };

    const removeGroup = async (id: string): Promise<boolean> => {
      if (!groups.has(id)) {
        return false;
      }
      await context.emit({ type: 'GroupDeleted', payload: { group: id } });
      const successor = active === id ? ordered().find((row) => row.id !== id)?.id : active;
      await db.transaction(async (session) => {
        await deleteGroup(session, id);
        if (successor !== active) {
          await saveActive(session, successor);
        }
      });
      groups.delete(id);
      for (const key of [...notes.keys()].filter((key) => key.startsWith(`${id}:`))) {
        notes.delete(key);
      }
      active = successor;
      return true;
    };

    const activateGroup = async (id: string): Promise<Group | undefined> => {
      const row = groups.get(id);
      if (row === undefined) {
        return undefined;
      }
      if (active === id) {
        return publicGroup(row);
      }
      await context.emit({ type: 'GroupActivated', payload: { group: id } });
      await db.transaction((session) => saveActive(session, id));
      active = id;
      return publicGroup(row);
    };

    const advanceGroup = async (id: string, to: Position): Promise<Group | undefined> => {
      const row = groups.get(id);
      if (row === undefined || !isReachable(to)) {
        return undefined;
      }
      const position = positionAt(to.track, to.session, to.movement);
      await context.emit({
        type: 'PositionChanged',
        payload: {
          group: id,
          track: position.track,
          session: position.session,
          ...(position.movement === undefined ? {} : { movement: position.movement }),
        },
      });
      return store({ ...row, position }, true);
    };

    const beginSession = async (
      id: string,
      position: Position,
      language: string,
    ): Promise<Group | undefined> => {
      const row = groups.get(id);
      if (row === undefined) {
        return undefined;
      }
      await context.emit({
        type: 'SessionStarted',
        payload: { group: id, track: position.track, session: position.session, language },
      });
      return store({ ...row, started: startedKey(position) }, true);
    };

    const startSession = async (id: string, language: string): Promise<Group | undefined> => {
      const row = groups.get(id);
      if (row === undefined) {
        return undefined;
      }
      const title = await sessionTitle(view, row.position.track, row.position.session, language);
      if (title === undefined) {
        return undefined;
      }
      if (row.started === startedKey(row.position)) {
        return publicGroup(row);
      }
      return beginSession(id, row.position, language);
    };

    const completeAt = async (id: string, position: Position): Promise<Group | undefined> => {
      const row = groups.get(id);
      if (row === undefined || position.track === 'topics') {
        return undefined;
      }
      if (position.track === 'foundations') {
        await context.emit({
          type: 'MovementCompleted',
          payload: {
            group: id,
            track: position.track,
            session: position.session,
            movement: position.movement ?? 'observation',
          },
        });
      } else {
        await context.emit({ type: 'LessonCompleted', payload: { group: id, session: position.session } });
      }
      const step = stepFrom(position);
      if (step.sessionCompleted) {
        await context.emit({
          type: 'SessionCompleted',
          payload: { group: id, track: position.track, session: position.session },
        });
      }
      return store({ ...row, position: step.next }, true);
    };

    const writeNote = async (id: string, track: Track, session: number, text: string): Promise<boolean> => {
      if (!groups.has(id) || !isSessionNumber(session)) {
        return false;
      }
      await context.emit({ type: 'SessionNoteSaved', payload: { group: id, track, session } });
      await db.transaction((transaction) => saveNote(transaction, { group: id, track, session, text }));
      notes.set(noteKey(id, { track, session }), text);
      return true;
    };

    const api: FormationApi = {
      tracks: (language) => trackSummaries(view, language),
      session: (track, number, language, options = {}) =>
        assembleSession(view, track, number, language, options),
      groups: () => ordered().map(publicGroup),
      group: (id) => {
        const row = groups.get(id);
        return row === undefined ? undefined : publicGroup(row);
      },
      active: () => {
        const row = active === undefined ? undefined : groups.get(active);
        return row === undefined ? undefined : publicGroup(row);
      },
      create: (name) => {
        const trimmed = name.trim();
        return trimmed === '' ? Promise.resolve(undefined) : serial(() => createGroup(trimmed));
      },
      rename: (id, name) => {
        const trimmed = name.trim();
        return trimmed === '' ? Promise.resolve(undefined) : serial(() => renameGroup(id, trimmed));
      },
      remove: (id) => serial(() => removeGroup(id)),
      activate: (id) => serial(() => activateGroup(id)),
      advance: (id, to) => serial(() => advanceGroup(id, to)),
      start: (id, language) => serial(() => startSession(id, language)),
      complete: (id) =>
        serial(async () => {
          const row = groups.get(id);
          return row === undefined ? undefined : completeAt(id, row.position);
        }),
      progress: async (id, language) => {
        const row = groups.get(id);
        if (row === undefined) {
          return undefined;
        }
        return progressOf(row.position, await sessionCount(view, row.position.track, language));
      },
      next: async (id, language) => {
        const row = groups.get(id);
        if (row === undefined) {
          return undefined;
        }
        const title = await sessionTitle(view, row.position.track, row.position.session, language);
        return title === undefined ? undefined : { group: id, position: row.position, title };
      },
      note: (id, track, session) => notes.get(noteKey(id, { track, session })),
      saveNote: (id, track, session, text) => serial(() => writeNote(id, track, session, text)),
    };

    return {
      api,
      async start() {
        groups.clear();
        notes.clear();
        for (const row of await loadGroups(db)) {
          groups.set(row.id, row);
        }
        for (const note of await loadNotes(db)) {
          notes.set(noteKey(note.group, note), note.text);
        }
        const stored = await loadActive(db);
        active = stored !== undefined && groups.has(stored) ? stored : undefined;
      },
      snapshot(): JsonValue {
        const rows = ordered();
        return {
          groups: rows.length,
          active: active ?? null,
          positions: Object.fromEntries(rows.map((row) => [row.id, { ...row.position }])),
          notes: notes.size,
        } as JsonValue;
      },
      redo: {
        GroupCreated: async () => {
          await serial(() => createGroup(standIn));
        },
        GroupRenamed: async (event) => {
          await serial(() => renameGroup(event.payload.group, undefined));
        },
        GroupDeleted: async (event) => {
          await serial(() => removeGroup(event.payload.group));
        },
        GroupActivated: async (event) => {
          await serial(() => activateGroup(event.payload.group));
        },
        PositionChanged: async (event) => {
          const { group, track, session, movement } = event.payload;
          await serial(() => advanceGroup(group, positionAt(track, session, movement)));
        },
        SessionStarted: async (event) => {
          const { group, track, session, language } = event.payload;
          await serial(() => beginSession(group, positionAt(track, session), language));
        },
        MovementCompleted: async (event) => {
          const { group, track, session, movement } = event.payload;
          const within = sessionMovements.find((candidate) => candidate === movement);
          if (within !== undefined) {
            await serial(() => completeAt(group, positionAt(track, session, within)));
          }
        },
        LessonCompleted: async (event) => {
          await serial(() => completeAt(event.payload.group, positionAt('training', event.payload.session)));
        },
        SessionNoteSaved: async (event) => {
          const { group, track, session } = event.payload;
          await serial(() => writeNote(group, track, session, standIn));
        },
      },
    };
  },
});
