import assert from 'node:assert/strict';
import { stableJson } from '@lib/json';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'DX-1',
  'a database write that fails while saving a bookmark, a group or a note is journaled as a Failure with a code, nothing claims it succeeded, and the device replays',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa')).done).ok);
    const types = () => phone.kernel.journal.read().map((entry) => entry.type);
    const failures = () =>
      phone.kernel.journal
        .read()
        .flatMap((entry) =>
          entry.type === 'Failure' ? [{ code: entry.payload.code, type: entry.payload.context.type }] : [],
        );

    phone.adapters.db.failWrites(/\bbookmarks\b/);
    const story = { target: 'story', story: 3, language: 'qaa' } as const;
    const refused = await services.study.save(story);
    assert.deepEqual(refused, { ok: false, code: 'db.io' }, 'the save returns the failure');
    assert.equal(types().includes('BookmarkAdded'), false, 'no success event for a write that failed');
    assert.deepEqual(failures(), [{ code: 'db.io', type: 'BookmarkAdded' }]);
    assert.equal(services.study.saved(story), undefined, 'nothing is saved in memory either');
    assert.deepEqual(services.home.saved(), []);

    phone.adapters.db.failWrites(false);
    const saved = await services.study.save(story);
    assert.ok(saved?.ok === true, 'the same save succeeds once the database accepts writes');
    phone.adapters.db.failWrites(/\bbookmarks\b/);
    assert.deepEqual(await services.study.unsave(saved.value.id), { ok: false, code: 'db.io' });
    assert.equal(types().includes('BookmarkRemoved'), false);
    assert.equal(services.home.saved().length, 1, 'a removal that failed keeps the bookmark');
    phone.adapters.db.failWrites(false);

    phone.adapters.db.failWrites(/\bformation_/);
    assert.deepEqual(await services.formation.create('Tuesday group'), { ok: false, code: 'db.io' });
    assert.equal(types().includes('GroupCreated'), false);
    assert.deepEqual(services.formation.groups(), []);
    phone.adapters.db.failWrites(false);
    const created = await services.formation.create('Tuesday group');
    assert.ok(created?.ok === true);
    const id = created.value.id;
    phone.adapters.db.failWrites(/\bformation_/);
    assert.deepEqual(await services.formation.saveNote(id, 'foundations', 1, 'Light'), {
      ok: false,
      code: 'db.io',
    });
    assert.equal(services.formation.note(id, 'foundations', 1), undefined);
    assert.deepEqual(await services.formation.complete(id), { ok: false, code: 'db.io' });
    assert.deepEqual(services.formation.group(id)?.position, {
      track: 'foundations',
      session: 1,
      movement: 'observation',
    });
    phone.adapters.db.failWrites(false);
    assert.deepEqual(
      failures().map((failure) => failure.type),
      ['BookmarkAdded', 'BookmarkRemoved', 'GroupCreated', 'SessionNoteSaved', 'MovementCompleted'],
    );
    assert.ok(failures().every((failure) => failure.code === 'db.io'));

    await phone.restart();
    assert.equal(servicesOf(phone).home.saved().length, 1, 'what was written survives a restart');
    assert.equal(servicesOf(phone).formation.groups().length, 1);

    const replayed = await replayJournal(
      world,
      JSON.parse(JSON.stringify(phone.kernel.journal.export())) as unknown,
      'replayed',
    );
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.ok(
      replayed.divergence[0]?.recorded.includes('"Failure"') === true,
      'a replay names the first refused write as the divergence',
    );
    assert.equal(
      stableJson(replayed.snapshot.modules),
      stableJson(phone.kernel.snapshot().modules),
      'the replayed device holds the same bookmarks and groups',
    );
  },
);
