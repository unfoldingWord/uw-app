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
    assert.equal(services.settings.layoutDirection(), 'ltr');
    const directions: string[] = [];
    const stop = services.settings.onLayoutDirection((next) => directions.push(next));
    assert.equal(await services.settings.setLocale('ar'), true);
    assert.equal(
      services.settings.layoutDirection(),
      'rtl',
      'the layout follows the app language, not the content',
    );
    assert.equal(await services.settings.setLocale('fa'), true);
    assert.equal(await services.settings.setLocale('sw'), true);
    stop();
    assert.deepEqual(directions, ['rtl', 'rtl', 'ltr'], 'the root layout hears each app language change');
    assert.equal(services.settings.layoutDirection(), 'ltr');
    assert.equal(
      phone.kernel.strings.words('en').t('settings.appLanguage.direction'),
      'The app restarts to change the layout direction when you switch to or from Arabic, Urdu or Farsi.',
    );
    assert.equal(services.home.words().locale, 'sw', 'every feature words itself in the app language');
    assert.equal(services.home.words().t('nav.home'), phone.kernel.strings.t('nav.home', 'sw'));
    assert.equal(services.home.header().language?.language, 'qaa', 'the content language is unchanged');
    assert.equal(await services.settings.setLocale('xx' as 'en'), false, 'only the sixteen locales');

    await services.settings.setTheme('dark');
    await services.settings.setReducedBlur(true);
    assert.equal(await services.settings.setName('Jesse'), true);
    await phone.restart();
    let settings = servicesOf(phone).settings;
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
    assert.equal(phone.kernel.corpus.indexWanted('qaa'), true, 'the wish for the index is a Corpus fact');
    await phone.restart();
    settings = servicesOf(phone).settings;
    assert.equal((await settings.fullText()).on, true, 'the toggle reads the kept wish');
    const dropped = await settings.setFullText(false);
    assert.equal(dropped.on, false);
    assert.equal(dropped.built, false, 'turning it off drops the index and gives the space back');
    assert.equal(phone.kernel.corpus.indexWanted('qaa'), false);
    assert.equal(phone.kernel.journal.read().at(-1)?.type, 'IndexDropped');
    await phone.restart();
    settings = servicesOf(phone).settings;
    assert.equal((await settings.fullText()).on, false);

    const storage = await settings.storage();
    assert.deepEqual(
      storage.packs.map((pack) => [pack.pack, pack.label]),
      [[languagePackId('qaa'), `Fixture A · ${storage.packs[0]?.size ?? ''}`]],
    );
    assert.ok((await settings.remove(languagePackId('qaa'))).ok);
    assert.deepEqual((await settings.storage()).packs, []);

    assert.deepEqual(
      settings.privacy().counts.map((count) => count.fold),
      Object.keys(phone.kernel.telemetry.leaving()),
      'the privacy screen lists exactly the folds that leave the device',
    );
    assert.deepEqual(
      Object.keys(phone.kernel.telemetry.leaving()),
      [
        'appOpens',
        'languagePackDownloads',
        'transfersCompleted',
        'sharesSent',
        'formationSessionsStarted',
        'invitationTaps',
        'impactStoryOpens',
      ],
      'what would leave is the PRD section 9 fold list and nothing else',
    );
    assert.ok(
      'transfersByPlatformPair' in emptyTelemetry,
      'the platform pair split stays a count on the phone',
    );
    assert.equal(
      phone.kernel.strings.words('en').t('privacy.counts'),
      'The app counts only these numbers, on this phone, and will send only them, in batches, once sending is turned on in a later release.',
      'the privacy screen says nothing is sent today',
    );
    assert.equal(settings.privacy().intro, phone.kernel.strings.words(settings.locale()).t('privacy.counts'));
    assert.equal(
      phone.kernel.strings.words('en').t('privacy.backup'),
      'A backup of this phone may include your notes and group names until a later update confirms they are kept out.',
      'the privacy screen says a backup may still carry notes until the backup exclusion is proven on a phone',
    );
    assert.equal(
      settings.privacy().notes.at(-1),
      phone.kernel.strings.words(settings.locale()).t('privacy.backup'),
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
