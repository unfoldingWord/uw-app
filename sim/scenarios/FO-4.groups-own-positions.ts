import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { stableJson } from '@lib/json';
import { installFromCatalog, withFormation } from '../install';
import { scenario } from '../scenario';

const names = ['Tuesday group', 'Youth leaders', 'Women of Grace Fellowship'];

export default scenario(
  'FO-4',
  'any number of groups, each with its own name and position, kept on the device and never in the journal',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa')], withFormation);
    const formation = () => device.kernel.formation;

    assert.deepEqual(formation().groups(), []);
    assert.equal(await formation().create('   '), undefined, 'a group needs a name');
    const tuesday = await formation().create(names[0] ?? '');
    const youth = await formation().create(`  ${names[1] ?? ''} `);
    assert.ok(tuesday && youth);
    assert.equal(youth.name, 'Youth leaders');
    assert.deepEqual(tuesday.position, { track: 'foundations', session: 1, movement: 'observation' });
    assert.equal(formation().active()?.id, tuesday.id, 'the first group becomes the active group');

    await formation().start(tuesday.id, 'qaa');
    for (let step = 0; step < 6; step += 1) {
      await formation().complete(tuesday.id);
    }
    await formation().advance(youth.id, { track: 'foundations', session: 3, movement: 'discourse' });
    await formation().complete(youth.id);

    assert.deepEqual(formation().group(tuesday.id)?.position, {
      track: 'foundations',
      session: 2,
      movement: 'translation',
    });
    assert.deepEqual(formation().group(youth.id)?.position, {
      track: 'foundations',
      session: 3,
      movement: 'theological',
    });
    assert.deepEqual(await formation().progress(tuesday.id, 'qaa'), {
      track: 'foundations',
      done: 1,
      sessions: 3,
      fraction: 6 / 15,
      finished: false,
    });

    const events = device.kernel.journal.read();
    const types = events.map((entry) => entry.type);
    assert.equal(types.filter((type) => type === 'GroupCreated').length, 2);
    assert.equal(types.filter((type) => type === 'MovementCompleted').length, 7);
    assert.equal(types.filter((type) => type === 'SessionCompleted').length, 1);
    assert.deepEqual(
      events.filter((entry) => entry.type === 'SessionStarted').map((entry) => entry.payload),
      [{ group: tuesday.id, track: 'foundations', session: 1, language: 'qaa' }],
    );

    await formation().rename(youth.id, names[2] ?? '');
    const third = await formation().create('Elders');
    assert.ok(third);
    await formation().activate(youth.id);
    assert.equal(formation().active()?.id, youth.id);
    assert.equal(await formation().remove(third.id), true);
    assert.equal(formation().group(third.id), undefined);

    await device.restart();
    assert.deepEqual(
      formation()
        .groups()
        .map((group) => [group.id, group.name, group.position.session]),
      [
        [tuesday.id, names[0], 2],
        [youth.id, names[2], 3],
      ],
      'groups, names and positions survive a restart',
    );
    assert.equal(formation().active()?.id, youth.id);

    const journal = stableJson(device.kernel.journal.export());
    const snapshot = stableJson(device.kernel.snapshot());
    for (const name of [...names, 'Elders']) {
      assert.ok(!journal.includes(name), `the journal never holds the group name ${name}`);
      assert.ok(!snapshot.includes(name), `the snapshot never holds the group name ${name}`);
    }
    const shown = device.kernel.snapshot().modules.formation as {
      groups: number;
      active: string;
      positions: Record<string, unknown>;
    };
    assert.equal(shown.groups, 2);
    assert.equal(shown.active, youth.id);
    assert.deepEqual(Object.keys(shown.positions).sort(), [tuesday.id, youth.id].sort());
  },
);
