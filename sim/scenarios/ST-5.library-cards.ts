import assert from 'node:assert/strict';
import { audioPackId, languagePackId, originalPackId } from '@lib/domain/pack';
import { withFormation } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-5',
  'the library shows one card per resource type with counts, download state and publishers, unfoldingWord first',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    await services.languages.select('qaa');

    const before = await services.study.library();
    assert.equal(before.language, 'qaa');
    assert.deepEqual(
      before.cards.map((card) => [card.type, card.state]),
      [
        ['literal', 'not-downloaded'],
        ['simplified', 'not-downloaded'],
        ['notes', 'not-downloaded'],
        ['wordLinks', 'not-downloaded'],
        ['questions', 'not-downloaded'],
        ['words', 'not-downloaded'],
        ['academy', 'not-downloaded'],
        ['stories', 'not-downloaded'],
        ['storyHelps', 'not-downloaded'],
        ['formation', 'not-downloaded'],
        ['audio', 'not-downloaded'],
        ['images', 'not-downloaded'],
        ['hebrew', 'not-downloaded'],
        ['greek', 'not-downloaded'],
      ],
    );
    const stories = before.cards.find((card) => card.type === 'stories');
    assert.deepEqual(
      stories?.publishers,
      ['unfoldingWord', 'Door43-Catalog'],
      'unfoldingWord is listed first',
    );
    assert.equal(stories?.title, 'Open Bible Stories');
    assert.equal(stories?.pack, languagePackId('qaa'));

    assert.ok((await services.home.completeDownload())?.ok);
    const after = await services.study.library();
    const byType = new Map(after.cards.map((card) => [card.type, card]));
    assert.equal(byType.get('literal')?.state, 'on-phone');
    assert.equal(byType.get('literal')?.count, '2 books');
    assert.equal(byType.get('words')?.count, '6 articles');
    assert.equal(byType.get('academy')?.count, '3 articles');
    assert.equal(byType.get('stories')?.count, '3 stories');
    assert.equal(byType.get('simplified')?.count, '2 books');
    assert.equal(byType.get('notes')?.count, '8 notes');
    assert.equal(byType.get('wordLinks')?.count, '6 word links');
    assert.equal(byType.get('questions')?.count, '4 questions');
    assert.equal(byType.get('storyHelps')?.count, '11 story helps');
    assert.equal(byType.get('formation')?.count, undefined, 'nothing is counted before it is on the phone');
    assert.equal(byType.get('audio')?.state, 'not-downloaded', 'audio is never part of the language pack');
    assert.equal(byType.get('hebrew')?.optional, true, 'original-language texts are optional downloads');
    assert.equal(after.overline, 'Fixture A · 14 resource types');

    assert.ok((await services.study.download(originalPackId('hbo'))).ok);
    assert.ok((await services.study.download(audioPackId('qaa', 'qaa_ult'))).ok);
    assert.ok((await services.languages.downloadImages()).ok);
    const movements = byType.get('formation');
    assert.ok(movements?.pack !== undefined, 'the Five movements card carries the language pack');
    assert.ok(
      (await services.study.download(movements.pack, withFormation)).ok,
      'the card downloads the formation row through the service',
    );
    const counted = new Map((await services.study.library()).cards.map((card) => [card.type, card]));
    assert.equal(counted.get('hebrew')?.state, 'on-phone');
    assert.equal(counted.get('hebrew')?.count, '1 book');
    assert.equal(counted.get('audio')?.count, '1 chapter');
    assert.equal(counted.get('images')?.count, '7 pictures');
    assert.equal(counted.get('formation')?.count, '3 stories with movements');
    assert.ok(
      [...counted.values()].every((card) => card.state !== 'on-phone' || card.count !== undefined),
      'every card on the phone carries a count',
    );
  },
);
