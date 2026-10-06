import { describe, expect, it } from 'vitest';
import { languagePackId, originalPackId } from '@lib/domain/pack';
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

  it('tells the helps panel which help kinds are on the phone, so an empty verse is not a missing download', async () => {
    const { phone, services } = await readyPhone();
    const full = await services.study.passage('RUT 1:16');
    expect(full.state === 'passage' && full.view.helps).toEqual({
      notes: true,
      wordLinks: true,
      questions: true,
    });
    await installFromCatalog(phone, [languagePackId('qab')]);
    expect(await services.languages.select('qab')).toBe(true);
    expect(await services.study.open()).toEqual({ state: 'no-text', language: 'qab', originals: [] });
  });

  it('names what a leader reads: book names, the language by name, and article titles instead of ids', async () => {
    const { services } = await readyPhone();
    expect(services.study.languageName()).toBe('Fixture A');
    const view = await services.study.passage('RUT 1:16');
    expect(view.state === 'passage' && view.view.label).toBe('Ruth 1:16');
    expect(services.study.referenceName('3JN 1:2')).toBe('3 John 1:2');
    expect((await services.study.books()).map((book) => book.name)).toEqual(['Ruth', '3 John']);
    expect(services.study.label({ kind: 'article', id: 'tw/bible/kt/god' })).toBe('God');
    expect(services.study.label({ kind: 'article', id: 'ta/translate/figs-idiom' })).toBe('Idiom');
    expect(services.study.label({ kind: 'story', story: 1 })).toBe('The Creation');
    expect(services.study.label({ kind: 'passage', reference: 'RUT 1:16' })).toBe('Ruth 1:16');
    expect(services.study.label({ kind: 'article', id: 'tw/bible/kt/nothing' })).toBeUndefined();
    const article = await services.study.article('ta/translate/figs-metaphor');
    expect(article.state === 'article' && article.related).toEqual([
      { id: 'ta/translate/figs-idiom', title: 'Idiom' },
      { id: 'ta/translate/translate-names', title: 'How to Translate Names' },
    ]);
  });
});
