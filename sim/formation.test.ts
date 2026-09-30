import { describe, expect, it } from 'vitest';
import { languagePackId, type PackId } from '@lib/domain/pack';
import { installFromCatalog } from './install';
import { createWorld } from './world';
import { valueOf } from './written';

async function phone(packs: readonly PackId[]) {
  const device = createWorld().device('phone');
  await device.start();
  await installFromCatalog(device, packs);
  return device;
}

describe('formation at its interface', () => {
  it("gives Home the active group's next session (HO-4)", async () => {
    const device = await phone([languagePackId('qaa')]);
    const formation = device.kernel.formation;
    expect(formation.active()).toBeUndefined();
    const tuesday = valueOf(await formation.create('Tuesday group'));
    const youth = valueOf(await formation.create('Youth leaders'));
    expect(tuesday && youth).toBeTruthy();
    if (tuesday === undefined || youth === undefined) {
      return;
    }
    expect(formation.active()?.id).toBe(tuesday.id);
    expect(await formation.next(tuesday.id, 'qaa')).toEqual({
      group: tuesday.id,
      position: { track: 'foundations', session: 1, movement: 'observation' },
      title: 'The Creation',
    });

    await formation.advance(youth.id, { track: 'foundations', session: 2, movement: 'journal' });
    expect(formation.active()?.id).toBe(youth.id);
    await formation.complete(youth.id);
    const active = formation.active();
    expect(active?.id).toBe(youth.id);
    expect(await formation.next(youth.id, 'qaa')).toEqual({
      group: youth.id,
      position: { track: 'foundations', session: 3, movement: 'observation' },
      title: 'The Flood',
    });
    await formation.complete(youth.id);
    await formation.advance(youth.id, { track: 'foundations', session: 4 });
    expect(await formation.next(youth.id, 'qaa')).toBeUndefined();
    expect((await formation.progress(youth.id, 'qaa'))?.finished).toBe(true);

    await formation.remove(youth.id);
    expect(formation.active()?.id).toBe(tuesday.id);
    await formation.remove(tuesday.id);
    expect(formation.active()).toBeUndefined();
  });

  it('counts formation sessions started per language, once per group and session (PRD section 9)', async () => {
    const device = await phone([languagePackId('qaa'), languagePackId('qab')]);
    const formation = device.kernel.formation;
    const group = valueOf(await formation.create('Tuesday group'));
    const other = valueOf(await formation.create('Youth leaders'));
    if (group === undefined || other === undefined) {
      throw new Error('groups were not created');
    }
    await formation.start(group.id, 'qaa');
    await formation.start(group.id, 'qaa');
    await formation.start(other.id, 'qab');
    await formation.advance(group.id, { track: 'foundations', session: 9 });
    expect(await formation.start(group.id, 'qaa')).toBeUndefined();
    expect(device.kernel.telemetry.counts().formationSessionsStarted).toEqual({ qaa: 1, qab: 1 });
  });

  it('walks Training one lesson at a time with LessonCompleted and SessionCompleted', async () => {
    const device = await phone([languagePackId('qaa')]);
    const formation = device.kernel.formation;
    const group = valueOf(await formation.create('Translators'));
    if (group === undefined) {
      throw new Error('the group was not created');
    }
    expect(await formation.advance(group.id, { track: 'topics', session: 1 })).toBeUndefined();
    await formation.advance(group.id, { track: 'training', session: 1 });
    await formation.start(group.id, 'qaa');
    await formation.complete(group.id);
    expect(formation.group(group.id)?.position).toEqual({ track: 'training', session: 2 });
    const types = device.kernel.journal
      .read()
      .map((entry) => entry.type)
      .filter((type) =>
        ['PositionChanged', 'SessionStarted', 'LessonCompleted', 'SessionCompleted'].includes(type),
      );
    expect(types).toEqual(['PositionChanged', 'SessionStarted', 'LessonCompleted', 'SessionCompleted']);
    const next = await formation.next(group.id, 'qaa');
    const session = await formation.session('training', 2, 'qaa');
    expect(next?.title).toBe(session?.track === 'training' ? session.article.title : 'missing');
  });

  it('refuses a name with nothing in it and an unknown group, with no event', async () => {
    const device = await phone([]);
    const formation = device.kernel.formation;
    const before = device.kernel.journal.stats().lastSeq;
    expect(await formation.create(' \n ')).toBeUndefined();
    expect(await formation.rename('group-000404', 'Grace')).toBeUndefined();
    expect(await formation.remove('group-000404')).toBeUndefined();
    expect(await formation.activate('group-000404')).toBeUndefined();
    expect(await formation.complete('group-000404')).toBeUndefined();
    expect(await formation.progress('group-000404', 'qaa')).toBeUndefined();
    expect(device.kernel.journal.stats().lastSeq).toBe(before);
  });
});
