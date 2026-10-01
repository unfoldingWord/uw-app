import assert from 'node:assert/strict';
import { createStartFaults } from '@lib/faults';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';

function refusedBackup(): Error {
  return Object.assign(new Error('files.io: the device root still reads as included in backups'), {
    code: 'files.io',
    step: 'backup',
  });
}

export default scenario(
  'DX-1',
  'a platform fault at boot, before any kernel exists, is journaled as a Failure with a code by the kernel that starts next',
  async (world) => {
    const faults = createStartFaults();
    assert.throws(
      () =>
        faults.capture(() => {
          throw refusedBackup();
        }),
      /included in backups/,
      'the boot still fails closed',
    );
    assert.equal(
      faults.capture(() => 'ports'),
      'ports',
      'a boot that succeeds passes its ports through',
    );
    assert.deepEqual(faults.pending(), [{ code: 'files.io', step: 'backup' }]);

    const phone = world.device('phone', { startFaults: faults.pending() });
    await phone.start();
    faults.clear();
    assert.deepEqual(faults.pending(), []);
    const entries = phone.kernel.journal.read();
    const failures = entries.filter((entry) => entry.type === 'Failure');
    assert.equal(failures.length, 1);
    const [fault] = failures;
    assert.ok(fault?.type === 'Failure');
    assert.equal(fault.payload.code, 'files.io');
    assert.deepEqual(fault.payload.context, { step: 'backup' }, 'the step names the fault and nothing else');
    const opened = entries.findIndex((entry) => entry.type === 'AppOpened');
    assert.ok(entries.indexOf(fault) < opened, 'the fault is journaled before the app opens');

    await phone.restart();
    assert.equal(
      phone.kernel.journal.read().filter((entry) => entry.type === 'Failure').length,
      1,
      'a restart does not journal the fault again',
    );

    const replayed = await replayJournal(
      world,
      JSON.parse(JSON.stringify(phone.kernel.journal.export())) as unknown,
      'replayed',
    );
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.ok(
      replayed.divergence[0]?.recorded.includes('"Failure"') === true,
      'replay names the boot fault as the first divergence, since the sim has no platform to fail',
    );
  },
);
