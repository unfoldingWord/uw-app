import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'HO-3',
  'the Continue reading card shows the last passage opened in Study for the current language',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa')).done).ok);
    assert.equal(services.home.continueReading(), undefined, 'nothing opened, no card');

    await services.study.passage('RUT 1:1');
    await services.study.passage('3JN 1:2');
    assert.deepEqual(services.home.continueReading(), {
      reference: '3JN 1:2',
      label: '3 John 1:2',
      language: 'qaa',
    });
    await services.languages.select('qab');
    assert.equal(services.home.continueReading(), undefined, 'the card follows the current language');
    await services.languages.select('qaa');

    await phone.restart();
    assert.equal(servicesOf(phone).home.continueReading()?.reference, '3JN 1:2', 'kept across a restart');
    assert.equal(
      servicesOf(phone).home.continueReading()?.label,
      '3 John 1:2',
      'a leader reads the book name, not its code',
    );
  },
);
