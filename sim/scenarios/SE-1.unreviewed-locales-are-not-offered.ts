import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'SE-1',
  'a locale is offered as the app language only once a native speaker has signed it off; until then the app speaks English, and the drafts stay testable',
  async (world) => {
    const french = world.device('french', { locale: { tag: 'fr-FR', region: 'FR' } });
    await french.start();
    const settings = servicesOf(french).settings;
    assert.equal(settings.locale(), 'en', 'an unreviewed device locale resolves to English');
    assert.deepEqual(
      settings.locales().map((item) => item.locale),
      ['en'],
      'no locale is signed off today, so English is the only app language offered',
    );
    assert.equal(await settings.setLocale('fr'), false, 'an unreviewed locale cannot be chosen');
    assert.equal(servicesOf(french).home.words().locale, 'en');

    const arabic = world.device('arabic', { locale: { tag: 'ar-EG', region: 'EG' } });
    await arabic.start();
    assert.equal(servicesOf(arabic).settings.layoutDirection(), 'ltr', 'English lays out left to right');

    const drafts = world.device('drafts', { locale: { tag: 'ar-EG', region: 'EG' }, localeGate: 'drafts' });
    await drafts.start();
    const draftSettings = servicesOf(drafts).settings;
    assert.equal(draftSettings.locale(), 'ar', 'with the drafts gate the sim still runs every locale');
    assert.equal(draftSettings.layoutDirection(), 'rtl');
    assert.equal(draftSettings.locales().length, 16);
  },
);
