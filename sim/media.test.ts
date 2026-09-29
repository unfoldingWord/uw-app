import { describe, expect, it } from 'vitest';
import { imagePackId } from '@lib/domain/pack';
import { memoryUriScheme } from './adapters/files';
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

describe('story pictures and impact story images on the phone', () => {
  it('gives each frame the address of its picture once the image pack is on the phone', async () => {
    const { phone, services } = await readyPhone();
    const before = await services.study.story(1);
    expect(before.state).toBe('story');
    if (before.state !== 'story') {
      return;
    }
    const missing = before.story.frames.filter((frame) => frame.image === undefined);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.map((frame) => services.study.picture(frame))).toEqual(missing.map(() => undefined));

    await installFromCatalog(phone, [imagePackId]);
    const after = await services.study.story(1);
    if (after.state !== 'story') {
      throw new Error('story 1 is not on the phone');
    }
    const frames = after.story.frames;
    expect(frames.every((frame) => frame.image !== undefined)).toBe(true);
    for (const frame of frames) {
      expect(services.study.picture(frame)).toBe(`${memoryUriScheme}${frame.image?.path ?? ''}`);
      expect(services.formation.picture(frame)).toBe(services.study.picture(frame));
    }
  });

  it('gives no address for a file outside the pack and partner image folders, a staging folder or a missing file', async () => {
    const { phone } = await readyPhone();
    await phone.adapters.files.mkdir('packs/.staging/x');
    await phone.adapters.files.writeText('packs/.staging/x/a.jpg', 'x');
    await phone.adapters.files.mkdir('transfer/incoming');
    await phone.adapters.files.writeText('transfer/incoming/a.jpg', 'x');
    const { media } = phone.kernel;
    expect(media.uriOf('packs/.staging/x/a.jpg')).toBeUndefined();
    expect(media.uriOf('transfer/incoming/a.jpg')).toBeUndefined();
    expect(media.uriOf('packs/nothing-here.jpg')).toBeUndefined();
    expect(media.uriOf('packs/../transfer/incoming/a.jpg')).toBeUndefined();
    expect(media.uriOf('partners/images')).toBeUndefined();
  });
});
