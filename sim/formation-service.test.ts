import { describe, expect, it } from 'vitest';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog, withFormation } from './install';
import { servicesOf } from './services';
import { createWorld } from './world';

async function readyPhone() {
  const phone = createWorld().device('phone');
  await phone.start();
  await installFromCatalog(phone, [languagePackId('qaa')], withFormation);
  await phone.kernel.preferences.set('study.language', 'qaa');
  return { phone, formation: servicesOf(phone).formation };
}

describe('the formation service behind the story reader (FO-3, FO-5, LA-3)', () => {
  it('shows each frame only its own study questions, and keeps the story-level ones apart', async () => {
    const { formation } = await readyPhone();
    const session = await formation.session('foundations', 1);
    expect(session?.track).toBe('foundations');
    if (session?.track !== 'foundations') {
      return;
    }
    const ids = (frame: number) => {
      const talk = formation.talk(session.story, frame);
      return {
        frame: talk.frame.map((question) => question.id),
        story: talk.story.map((question) => question.id),
      };
    };
    expect(ids(3)).toEqual({ frame: ['q002'], story: ['q000'] });
    expect(formation.talk(session.story, 3).frame.map((question) => question.question)).toEqual([
      'How did God make the first man?',
    ]);
    expect(ids(1)).toEqual({ frame: ['q001'], story: ['q000'] });
    expect(ids(2)).toEqual({ frame: [], story: ['q000'] });
  });

  it('says the story pictures are not on the phone, and downloads them in one step', async () => {
    const { formation } = await readyPhone();
    expect(formation.pictures()).toBe('offered');
    const before = await formation.read(1);
    expect(before?.story.frames.map((frame) => formation.picture(frame))).toEqual([
      expect.any(String),
      undefined,
      undefined,
    ]);
    expect(await formation.downloadPictures()).toEqual({ ok: true });
    expect(formation.pictures()).toBe('on-phone');
    const after = await formation.read(1);
    expect(after?.story.frames.every((frame) => formation.picture(frame) !== undefined)).toBe(true);
  });

  it('reads nothing and offers nothing before a language is chosen', async () => {
    const phone = createWorld().device('phone');
    await phone.start();
    const formation = servicesOf(phone).formation;
    expect(await formation.read(1)).toBeUndefined();
    expect(await formation.storyList(1)).toEqual({ stories: [] });
    expect(formation.saved(1)).toBeUndefined();
    expect(formation.pictures()).toBe('not-offered');
    expect(await formation.absence(1)).toBe('not-downloaded');
  });

  it('tells a story number the language does not have from a language with no stories on the phone', async () => {
    const { formation } = await readyPhone();
    expect(await formation.read(999)).toBeUndefined();
    expect(await formation.absence(999)).toBe('not-found');
  });
});
