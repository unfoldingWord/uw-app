import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'HO-1',
  'the Home header shows the current language chip and a light and dark toggle whose choice is kept',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.deepEqual(services.home.header(), { language: undefined, theme: 'system' });

    await services.onboarding.choose('qab');
    const header = services.home.header();
    assert.deepEqual(header.language, {
      language: 'qab',
      autonym: 'Fixture B',
      label: 'Change language, now Fixture B',
    });

    assert.deepEqual(
      await services.home.toggleTheme('dark'),
      { ok: true, value: 'light' },
      'from a dark phone the toggle goes light',
    );
    assert.deepEqual(services.settings.appearance(), { scheme: 'light' });
    assert.deepEqual(await services.home.toggleTheme('dark'), { ok: true, value: 'dark' });
    assert.deepEqual(services.settings.appearance(), { scheme: 'dark' });

    let changes = 0;
    const stop = services.settings.onAppearance(() => {
      changes += 1;
    });
    await services.home.toggleTheme('light');
    stop();
    await services.home.toggleTheme('light');
    assert.equal(changes, 1, 'the root layout hears each change while it listens');

    await phone.restart();
    assert.equal(servicesOf(phone).home.header().theme, 'dark', 'the choice survives a restart');
    assert.deepEqual(phone.kernel.snapshot().modules.preferences, {
      values: { 'home.theme': 'dark', 'study.language': 'qab' },
      lastPassage: {},
    });
  },
);
