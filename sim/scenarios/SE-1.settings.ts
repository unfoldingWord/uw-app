import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { emptyTelemetry } from '@lib/telemetry/folds';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'SE-1',
  'settings hold the app language apart from the content language, the theme, the first name, the full-text index, storage, licence and About',
  async (world) => {
    const phone = world.device('phone', { locale: { tag: 'fr-FR', region: 'FR' } });
    await phone.start();
    const services = servicesOf(phone);
    assert.equal(services.settings.locale(), 'fr', 'the app language starts from the device locale');
    assert.equal(services.settings.locales().length, 16);
    assert.deepEqual(
      services.settings.locales().find((item) => item.locale === 'ar'),
      {
        locale: 'ar',
        name: 'العربية',
        direction: 'rtl',
        complete: true,
        selected: false,
      },
    );

    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa')).done).ok);
    assert.equal(await services.settings.setLocale('sw'), true);
    assert.equal(services.home.words().locale, 'sw', 'every feature words itself in the app language');
    assert.equal(services.home.words().t('nav.home'), phone.kernel.strings.t('nav.home', 'sw'));
    assert.equal(services.home.header().language?.language, 'qaa', 'the content language is unchanged');
    assert.equal(await services.settings.setLocale('xx' as 'en'), false, 'only the sixteen locales');

    await services.settings.setTheme('dark');
    await services.settings.setReducedBlur(true);
    assert.equal(await services.settings.setName('Jesse'), true);
    await phone.restart();
    const settings = servicesOf(phone).settings;
    assert.equal(settings.locale(), 'sw');
    assert.equal(settings.theme(), 'dark');
    assert.deepEqual(settings.appearance(), { scheme: 'dark', reducedBlur: true });
    assert.equal(settings.name(), 'Jesse');
    assert.equal(JSON.stringify(phone.kernel.journal.export()).includes('Jesse'), false);

    const off = await settings.fullText();
    assert.equal(off.on, false);
    assert.ok(off.cost.bytes > 0, 'the storage cost is known before the index is built');
    assert.equal(off.built, false);
    assert.equal(phone.kernel.corpus.index('qaa').built, false);
    const on = await settings.setFullText(true);
    assert.equal(on.on, true);
    assert.equal(on.built, true);
    assert.equal(phone.kernel.corpus.index('qaa').built, true);

    const storage = await settings.storage();
    assert.deepEqual(
      storage.packs.map((pack) => [pack.pack, pack.label]),
      [[languagePackId('qaa'), `Fixture A · ${storage.packs[0]?.size ?? ''}`]],
    );
    assert.ok((await settings.remove(languagePackId('qaa'))).ok);
    assert.deepEqual((await settings.storage()).packs, []);

    assert.deepEqual(
      settings.privacy().counts.map((count) => count.fold),
      Object.keys(emptyTelemetry),
      'the privacy screen lists exactly the folds that leave the device',
    );
    assert.deepEqual(
      (await settings.entries()).map((entry) => entry.id),
      [
        'appLanguage',
        'theme',
        'reducedBlur',
        'firstName',
        'fullText',
        'storage',
        'licence',
        'about',
        'privacy',
        'diagnostics',
      ],
    );
  },
);
