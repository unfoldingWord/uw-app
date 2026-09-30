import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const hour = 60 * 60 * 1000;

export default scenario(
  'HO-2',
  'Home shows the date and a greeting for the time of day, in local time, with the first name when given',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const { home, settings } = servicesOf(phone);
    const monday = Date.UTC(2026, 0, 5, 0, 0, 0);

    assert.deepEqual(home.greeting({ at: monday + 8 * hour, utcOffsetMinutes: 0 }), {
      part: 'morning',
      text: 'Good morning',
      date: 'Monday, January 5',
    });
    assert.equal(home.greeting({ at: monday + 13 * hour, utcOffsetMinutes: 0 }).part, 'afternoon');
    assert.equal(home.greeting({ at: monday + 19 * hour, utcOffsetMinutes: 0 }).part, 'evening');
    assert.equal(home.greeting({ at: monday + 2 * hour, utcOffsetMinutes: 0 }).part, 'evening');

    const nairobi = home.greeting({ at: monday + 22 * hour, utcOffsetMinutes: 180 });
    assert.deepEqual(
      [nairobi.part, nairobi.date],
      ['evening', 'Tuesday, January 6'],
      'the hour and the date are local, not UTC',
    );

    await settings.setName('Jesse');
    assert.equal(
      home.greeting({ at: monday + 13 * hour, utcOffsetMinutes: 0 }).text,
      'Good afternoon, Jesse',
    );

    await settings.setLocale('fr');
    const french = home.greeting({ at: monday + 8 * hour, utcOffsetMinutes: 0 });
    assert.equal(french.text, phone.kernel.strings.t('home.greeting.morning.named', 'fr', { name: 'Jesse' }));
    assert.equal(french.date, 'lundi 5 janvier');
  },
);
