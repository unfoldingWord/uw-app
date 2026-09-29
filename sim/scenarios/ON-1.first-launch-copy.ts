import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ON-1',
  'first launch shows the logo, overline, tagline, body, the two actions and the no-account footer, in the app locale',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const { onboarding } = servicesOf(phone);
    assert.equal(onboarding.needed(), true, 'a device with no content language starts in onboarding');
    assert.deepEqual(onboarding.copy(), {
      logo: 'unfoldingWord',
      overline: 'Open Bible translation resources',
      tagline: 'Every resource. Every language. One open door.',
      body: 'Read, listen and share what the global church has built with unfoldingWord, in the languages you work in, online or off.',
      choose: 'Choose your language',
      english: 'Continue in English',
      footer: 'Free. Openly licensed. No account needed.',
      nameLabel: 'Your first name (optional)',
      nameHint: 'Stays on this phone. Used only to greet you.',
    });

    const french = world.device('french', { locale: { tag: 'fr-FR', region: 'FR' } });
    await french.start();
    const copy = servicesOf(french).onboarding.copy();
    assert.equal(copy.logo, 'unfoldingWord', 'the name is the same in every locale');
    assert.equal(copy.choose, french.kernel.strings.t('onboarding.choose', 'fr'));
    assert.notEqual(copy.choose, 'Choose your language', 'the copy follows the device locale');
    assert.equal(servicesOf(french).onboarding.words().locale, 'fr');
  },
);
