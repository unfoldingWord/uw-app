import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'HO-4',
  "the Continue formation card shows the active group's next session and opens it",
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
      href: '/formation/session/foundations/1',
    });

    await services.formation.start(group.id);
    await services.formation.advance(group.id, { track: 'foundations', session: 2 });
    const next = await services.home.continueFormation();
    assert.equal(next?.title, 'Sin Enters the World');
    assert.equal(next?.href, '/formation/session/foundations/2', 'the card opens the next session');
    const opened = await services.formation.session('foundations', 2);
    assert.equal(opened?.track === 'foundations' && opened.story.title, 'Sin Enters the World');
  },
);
