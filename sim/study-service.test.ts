import { describe, expect, it } from 'vitest';
import { originalPackId } from '@lib/domain/pack';
import { installFromCatalog } from './install';
import { servicesOf } from './services';
import { createWorld } from './world';

async function readyPhone() {
  const phone = createWorld().device('phone');
  await phone.start();
  const services = servicesOf(phone);
  await services.onboarding.refresh();
  expect((await (await services.onboarding.choose('qaa')).done).ok).toBe(true);
  return { phone, services };
}

describe('the study service behind the passage view (ST-2, ST-7)', () => {
  it('lists the books and chapters on the phone in canonical order, and none before a language', async () => {
    const phone = createWorld().device('phone');
    await phone.start();
    expect(await servicesOf(phone).study.books()).toEqual([]);

    const { services } = await readyPhone();
    const books = await services.study.books();
    expect(books.map((book) => book.code)).toEqual(['RUT', '3JN']);
    expect(books[0]?.chapters).toEqual([1]);
    expect(books[0]?.testament).toBe('old');
    expect(books[1]?.testament).toBe('new');
  });

  it('offers the original-language text only once it is on the phone, and reads it as plain text', async () => {
    const { phone, services } = await readyPhone();
    expect(services.study.originalOf('RUT')).toBeUndefined();
    expect(await services.study.original('RUT 1')).toBeUndefined();

    await installFromCatalog(phone, [originalPackId('hbo'), originalPackId('el-x-koine')]);
    expect(services.study.originalOf('RUT')).toEqual({ language: 'hbo', label: 'Hebrew Old Testament' });
    expect(services.study.originalOf('3JN')).toEqual({
      language: 'el-x-koine',
      label: 'Greek New Testament',
    });
    const hebrew = await services.study.original('RUT 1:16');
    expect(hebrew?.text.reading).toBe('original');
    expect(hebrew?.text.direction).toBe('rtl');
    expect(hebrew?.language).toBe('hbo');
  });
});
