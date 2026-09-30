import assert from 'node:assert/strict';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import type { Provenance } from '@lib/domain/provenance';
import { parseReference } from '@lib/domain/reference';
import type { SharePayload } from '@lib/ports';
import { locales } from '@lib/strings/locales';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { transferBetween } from '../transfer';

function carriesAttribution(payload: SharePayload, provenance: Provenance): void {
  assert.ok(payload.provenance.length > 0, `${payload.title} carries its provenance`);
  for (const piece of payload.provenance) {
    assert.match(piece.licence, /CC BY-SA 4\.0/);
    for (const field of [piece.licence, piece.title, piece.publisher, piece.tag]) {
      assert.ok(payload.text.includes(field), `${payload.title} says ${field} in its text`);
    }
  }
  assert.ok(payload.provenance.some((piece) => piece.resource === provenance.resource));
}

export default scenario(
  'SH-5',
  'every shared item carries its licence and attribution, in every app language, and a transfer keeps them',
  async (world) => {
    const sender = world.device('sender', { platform: 'ios' });
    await sender.start();
    await installFromCatalog(sender, [languagePackId('qaa'), audioPackId('qaa', 'qaa_ult')]);
    const receiver = world.device('receiver', { platform: 'android' });
    await receiver.start();
    receiver.adapters.http.setOnline(false);
    const moved = await transferBetween(sender, receiver, { language: 'qaa' });
    assert.ok(moved.installed?.ok);

    const ruth = parseReference('RUT 1:16');
    assert.ok(ruth.ok);
    const there = await sender.kernel.corpus.passage(ruth.reference, { language: 'qaa' });
    const here = await receiver.kernel.corpus.passage(ruth.reference, { language: 'qaa' });
    assert.ok(there && here);
    assert.deepEqual(here.text.provenance, there.text.provenance, 'provenance travels with the pack');

    const story = await receiver.kernel.corpus.story(1, 'qaa');
    assert.ok(story);
    const [clip] = there.audio;
    assert.ok(clip);
    for (const locale of locales) {
      const text = await receiver.kernel.share.passage(here, { locale });
      const told = await receiver.kernel.share.story(story, { locale });
      const heard = await sender.kernel.share.audio(clip, { locale });
      assert.ok(text.ok && told.ok && heard.ok, locale);
      carriesAttribution(text.payload, here.text.provenance);
      carriesAttribution(told.payload, story.provenance);
      carriesAttribution(heard.payload, clip.provenance);
    }
    for (const payload of [
      ...receiver.adapters.shareSheet.shared(),
      ...sender.adapters.shareSheet.shared(),
    ]) {
      assert.ok(payload.provenance.length > 0, 'no content payload leaves without provenance');
    }
  },
);
