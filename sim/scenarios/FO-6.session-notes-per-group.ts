import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { stableJson } from '@lib/json';
import { installFromCatalog, withFormation } from '../install';
import { scenario } from '../scenario';
import { valueOf } from '../written';

const tuesdayNote = 'Maria asked why God rested on the seventh day';
const youthNote = 'Talk again about the garden next week';

export default scenario(
  'FO-6',
  'session notes belong to one group and one session, stay on the device across a restart, and never enter the journal',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa')], withFormation);
    const formation = () => device.kernel.formation;
    const tuesday = valueOf(await formation().create('Tuesday group'));
    const youth = valueOf(await formation().create('Youth leaders'));
    assert.ok(tuesday && youth);

    assert.equal(formation().note(tuesday.id, 'foundations', 1), undefined);
    assert.equal((await formation().saveNote(tuesday.id, 'foundations', 1, 'first thoughts'))?.ok, true);
    assert.equal((await formation().saveNote(tuesday.id, 'foundations', 1, tuesdayNote))?.ok, true);
    assert.equal((await formation().saveNote(youth.id, 'foundations', 1, youthNote))?.ok, true);
    assert.equal(await formation().saveNote('group-999999', 'foundations', 1, youthNote), undefined);

    await device.restart();
    assert.equal(formation().note(tuesday.id, 'foundations', 1), tuesdayNote);
    assert.equal(formation().note(youth.id, 'foundations', 1), youthNote);
    assert.equal(formation().note(tuesday.id, 'foundations', 2), undefined);

    const saved = device.kernel.journal.read().filter((entry) => entry.type === 'SessionNoteSaved');
    assert.deepEqual(
      saved.map((entry) => entry.payload),
      [
        { group: tuesday.id, track: 'foundations', session: 1 },
        { group: tuesday.id, track: 'foundations', session: 1 },
        { group: youth.id, track: 'foundations', session: 1 },
      ],
    );
    const journal = stableJson(device.kernel.journal.export());
    const snapshot = stableJson(device.kernel.snapshot());
    for (const text of [tuesdayNote, youthNote, 'first thoughts']) {
      assert.ok(!journal.includes(text), 'the journal never holds a note');
      assert.ok(!snapshot.includes(text), 'the snapshot never holds a note');
    }
    assert.equal((device.kernel.snapshot().modules.formation as { notes: number }).notes, 2);

    assert.equal((await formation().remove(youth.id))?.ok, true);
    assert.equal(formation().note(youth.id, 'foundations', 1), undefined, 'a deleted group takes its notes');
  },
);
