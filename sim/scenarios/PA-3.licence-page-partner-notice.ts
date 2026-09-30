import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'PA-3',
  'the licence page says the resources are free because partners make them so and links to Give',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const { about, onboarding } = servicesOf(phone);
    await onboarding.refresh();
    await phone.kernel.packs.installFromCatalog(languagePackId('qab'));
    const licence = about.licence();
    assert.equal(licence.title, 'Licence and attribution');
    assert.deepEqual(licence.notices, [
      'Content is shared under CC BY-SA 4.0 by the organization that published it.',
      'The app is open source under the MIT licence.',
      'Fonts are shared under the SIL Open Font License.',
    ]);
    assert.equal(licence.partners, 'These resources are free because partners make them so.');
    assert.deepEqual(licence.give, {
      label: 'Give at unfoldingword.org',
      url: 'https://unfoldingword.org/Give',
    });
    assert.deepEqual(
      licence.onPhone.map((row) => [row.resource, row.publisher, row.licence.includes('CC BY-SA 4.0')]),
      [
        ['qab_obs', 'unfoldingWord', true],
        ['qab_obs-sq', 'unfoldingWord', true],
      ],
      'every resource on the phone is listed with its publisher and licence',
    );
  },
);
