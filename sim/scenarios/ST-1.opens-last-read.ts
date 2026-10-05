import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-1',
  'Study opens to the passage view on the last-read reference, or the first chapter on the phone',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    assert.deepEqual(await services.study.open(), { state: 'no-language' });

    await services.onboarding.refresh();
    await services.languages.select('qaa');
    assert.deepEqual(await services.study.open(), {
      state: 'not-downloaded',
      language: 'qaa',
      pack: 'language:qaa',
    });

    assert.ok((await services.home.completeDownload())?.ok);
    const first = await services.study.open();
    assert.equal(first.state, 'passage');
    assert.equal(
      first.state === 'passage' && first.view.reference,
      'RUT 1',
      'the first chapter on the phone',
    );
    assert.equal(first.state === 'passage' && first.view.reading, 'literal');

    const tapped = await services.study.passage('3JN 1:2');
    assert.ok(tapped.state === 'passage');
    assert.equal(tapped.view.passage.reference, '3JN 1', 'the screen shows the whole chapter');
    assert.deepEqual(tapped.view.landing, { chapter: 1, verse: 2 }, 'and lands on the verse');
    assert.equal(services.home.continueReading()?.reference, '3JN 1:2');
    await phone.restart();
    const again = await servicesOf(phone).study.open();
    assert.equal(again.state === 'passage' && again.view.reference, '3JN 1:2', 'the last-read reference');
    assert.equal(again.state === 'passage' && again.view.passage.reference, '3JN 1');
    assert.deepEqual(again.state === 'passage' && again.view.landing, { chapter: 1, verse: 2 });
    assert.deepEqual(
      phone.kernel.journal
        .read()
        .flatMap((entry) => (entry.type === 'PassageOpened' ? [entry.payload.reference] : [])),
      ['RUT 1', '3JN 1:2', '3JN 1:2'],
      'opening a verse journals the verse, never the chapter around it',
    );
    assert.equal(servicesOf(phone).home.continueReading()?.reference, '3JN 1:2');

    await servicesOf(phone).study.setReading('simplified');
    const simplified = await servicesOf(phone).study.open();
    assert.equal(simplified.state === 'passage' && simplified.view.reading, 'simplified');
    assert.deepEqual(simplified.state === 'passage' && simplified.view.choices, [
      { text: 'literal', label: 'Close to the original', selected: false },
      { text: 'simplified', label: 'Everyday words', selected: true },
    ]);
    await phone.restart();
    const kept = await servicesOf(phone).study.open();
    assert.equal(kept.state === 'passage' && kept.view.reading, 'simplified', 'the reading is kept');
  },
);
