import { sessionMovements, tracks } from '../domain/events';
import type { DbRow, DbTransaction } from '../ports';
import { positionAt } from './position';
import type { Group, Position, Track } from './types';

export const formationTables: readonly string[] = ['formation_groups', 'formation_notes', 'formation_state'];

const activeKey = 'active';

export type GroupRow = Group & { readonly ordinal: number; readonly started?: string };

export type NoteRow = {
  readonly group: string;
  readonly track: Track;
  readonly session: number;
  readonly text: string;
};

function text(row: DbRow, column: string): string | undefined {
  const value = row[column];
  return typeof value === 'string' ? value : undefined;
}

function whole(row: DbRow, column: string): number {
  const value = row[column];
  return typeof value === 'number' ? value : 0;
}

function trackOf(value: string | undefined): Track | undefined {
  return tracks.find((track) => track === value);
}

function groupOf(row: DbRow): GroupRow | undefined {
  const id = text(row, 'id');
  const track = trackOf(text(row, 'track'));
  if (id === undefined || track === undefined) {
    return undefined;
  }
  const movement = sessionMovements.find((candidate) => candidate === text(row, 'movement'));
  const started = text(row, 'started');
  const group: GroupRow = {
    id,
    name: text(row, 'name') ?? '',
    position: positionAt(track, whole(row, 'session'), movement),
    ordinal: whole(row, 'ordinal'),
  };
  return started === undefined ? group : { ...group, started };
}

export async function loadGroups(db: DbTransaction): Promise<GroupRow[]> {
  const rows = await db.all('SELECT * FROM formation_groups ORDER BY ordinal');
  return rows.flatMap((row) => groupOf(row) ?? []);
}

export async function loadNotes(db: DbTransaction): Promise<NoteRow[]> {
  const rows = await db.all('SELECT group_id, track, session, body FROM formation_notes');
  return rows.flatMap((row) => {
    const group = text(row, 'group_id');
    const track = trackOf(text(row, 'track'));
    return group === undefined || track === undefined
      ? []
      : [{ group, track, session: whole(row, 'session'), text: text(row, 'body') ?? '' }];
  });
}

export async function loadActive(db: DbTransaction): Promise<string | undefined> {
  const row = await db.get('SELECT value FROM formation_state WHERE key = ?', [activeKey]);
  return row === undefined ? undefined : text(row, 'value');
}

export async function saveGroup(db: DbTransaction, group: GroupRow): Promise<void> {
  await db.run(
    'INSERT OR REPLACE INTO formation_groups (id, ordinal, name, track, session, movement, started) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      group.id,
      group.ordinal,
      group.name,
      group.position.track,
      group.position.session,
      group.position.movement ?? null,
      group.started ?? null,
    ],
  );
}

export async function deleteGroup(db: DbTransaction, group: string): Promise<void> {
  await db.run('DELETE FROM formation_notes WHERE group_id = ?', [group]);
  await db.run('DELETE FROM formation_groups WHERE id = ?', [group]);
}

export async function saveActive(db: DbTransaction, group: string | undefined): Promise<void> {
  if (group === undefined) {
    await db.run('DELETE FROM formation_state WHERE key = ?', [activeKey]);
    return;
  }
  await db.run('INSERT OR REPLACE INTO formation_state (key, value) VALUES (?, ?)', [activeKey, group]);
}

export async function saveNote(db: DbTransaction, note: NoteRow): Promise<void> {
  await db.run(
    'INSERT OR REPLACE INTO formation_notes (group_id, track, session, body) VALUES (?, ?, ?, ?)',
    [note.group, note.track, note.session, note.text],
  );
}

export function noteKey(group: string, position: Pick<Position, 'track' | 'session'>): string {
  return `${group}:${position.track}:${position.session}`;
}
