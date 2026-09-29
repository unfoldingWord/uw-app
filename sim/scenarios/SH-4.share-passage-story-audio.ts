import assert from 'node:assert/strict';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { getTheAppLink } from '@lib/share/payload';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';

export default scenario(
  'SH-4',
  'a passage and a story go out as text, and a chapter as audio where it exists, each with a link to get the app',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa'), audioPackId('qaa', 'qaa_ult-audio')]);
    phone.adapters.http.setOnline(false);
    const { corpus, share } = phone.kernel;
    const ruth = parseReference('RUT 1:16');
    assert.ok(ruth.ok);
    const passage = await corpus.passage(ruth.reference, { language: 'qaa' });
    assert.ok(passage);
    const verse = passage.text.verses[0];
    assert.ok(verse);

    const text = await share.passage(passage, { locale: 'en' });
    assert.ok(text.ok && text.outcome === 'shared');
    assert.equal(text.payload.title, `${passage.text.bookName} 1:16`);
    assert.ok(text.payload.text.includes(verse.text), 'the passage text goes out');
    assert.ok(text.payload.text.endsWith(`Get the app: ${getTheAppLink}`), 'the link is appended');
    assert.equal(text.payload.file, undefined);

    const story = await corpus.story(1, 'qaa');
    assert.ok(story);
    const told = await share.story(story, { locale: 'en' });
    assert.ok(told.ok && told.outcome === 'shared');
    assert.equal(told.payload.title, story.title);
    for (const frame of story.frames) {
      assert.ok(told.payload.text.includes(frame.text), `frame ${frame.number} goes out`);
    }
    assert.ok(told.payload.text.includes(getTheAppLink));

    const [clip] = passage.audio;
    assert.ok(clip, 'Ruth 1 has audio in the fixture');
    const heard = await share.audio(clip, { locale: 'en' });
    assert.ok(heard.ok && heard.outcome === 'shared');
    assert.deepEqual(heard.payload.file, { path: clip.path, mimeType: 'audio/mpeg' });
    assert.ok(heard.payload.text.includes(getTheAppLink));

    const french = await share.passage(passage, { locale: 'fr' });
    assert.ok(french.ok);
    assert.ok(french.payload.text.includes(getTheAppLink));
    assert.ok(
      !french.payload.text.includes('Get the app'),
      'the words around the content follow the app language',
    );

    const sheet = phone.adapters.shareSheet.shared();
    assert.equal(sheet.length, 4, 'every payload is handed to the share sheet');

    phone.adapters.shareSheet.respondWith('dismissed');
    const mark = phone.kernel.journal.stats().lastSeq;
    const dismissed = await share.story(story, { locale: 'en' });
    assert.ok(dismissed.ok && dismissed.outcome === 'dismissed');
    assert.deepEqual(
      phone.kernel.journal.read(mark),
      [],
      'a dismissed sheet sends nothing and counts nothing',
    );

    const sent = phone.kernel.journal.read().filter((entry) => entry.type === 'ShareSent');
    assert.deepEqual(
      sent.map((entry) => entry.type === 'ShareSent' && [entry.payload.kind, entry.payload.language]),
      [
        ['passage', 'qaa'],
        ['story', 'qaa'],
        ['audio', 'qaa'],
        ['passage', 'qaa'],
      ],
    );
    assert.equal(phone.kernel.telemetry.counts().sharesSent, 4);

    const silent = parseReference('3JN 1:1');
    assert.ok(silent.ok);
    const letter = await corpus.passage(silent.reference, { language: 'qaa' });
    assert.deepEqual(letter?.audio, [], 'where there is no audio there is nothing to share as audio');
    const gone = await share.audio({ ...clip, path: 'packs/audio/qaa/missing.mp3' }, { locale: 'en' });
    assert.equal(!gone.ok && gone.code, 'audio.unavailable');
  },
);
