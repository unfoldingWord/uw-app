import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'HO-4',
  "the Continue formation card shows the active group's next session",
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa')).done).ok);
    assert.equal(await services.home.continueFormation(), undefined, 'no group, no card');

    const group = await services.formation.create('Tuesday group');
    assert.ok(group !== undefined);
    const card = await services.home.continueFormation();
    assert.deepEqual(card, {
      group: group.id,
      groupName: 'Tuesday group',
      position: { track: 'foundations', session: 1, movement: 'observation' },
      title: 'The Creation',
    });

    await services.formation.start(group.id);
    await services.formation.advance(group.id, { track: 'foundations', session: 2 });
    assert.equal((await services.home.continueFormation())?.title, 'Sin Enters the World');
  },
);
