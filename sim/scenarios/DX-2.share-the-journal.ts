import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { parseJournalExport } from '@lib/journal/export';
import { stableJson } from '@lib/json';
import { diagnosticsPath } from '@lib/share/payload';
import { installFromCatalog } from '../install';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { transferBetween } from '../transfer';

const locale = { tag: 'sw-TZ', region: 'TZ', timeZone: 'Africa/Dar_es_Salaam' };

export default scenario(
  'DX-2',
  'a leader shares the journal and a snapshot through the share sheet, in one file that names no one and leaves out what they read unless they include it',
  async (world) => {
    const sender = world.device('sender', { platform: 'ios' });
    await sender.start();
    await installFromCatalog(sender, [languagePackId('qab')]);
    const phone = world.device('phone', { platform: 'android', locale });
    await phone.start();
    const moved = await transferBetween(sender, phone, { language: 'qab' });
    assert.ok(moved.installed?.ok);
    const story = await phone.kernel.corpus.story(1, 'qab');
    assert.ok(story);
    assert.ok((await phone.kernel.share.story(story, { locale: 'sw' })).ok);

    const saved = await phone.kernel.bookmarks.add({ target: 'story', story: 1, language: 'qab' });
    assert.ok(saved?.ok);

    const snapshot = phone.kernel.snapshot();
    const journal = phone.kernel.journal.export();
    const withheld = await phone.kernel.share.journal({ journal, snapshot }, { locale: 'en' });
    assert.ok(withheld.ok && withheld.outcome === 'shared');
    assert.equal(
      withheld.payload.text,
      phone.kernel.strings.t('diagnostics.body', 'en'),
      'by default the payload says the file leaves out what the leader read',
    );
    const stripped = JSON.parse(await phone.adapters.files.readText(diagnosticsPath)) as {
      reading: unknown;
      events: { type: string; payload: Record<string, unknown> }[];
      snapshot: { modules: Record<string, Record<string, unknown>>; journal: { tail: unknown[] } };
    };
    assert.equal(stripped.reading, 'left-out');
    const read = stripped.events.filter((event) =>
      ['StoryOpened', 'PassageOpened', 'ArticleOpened', 'BookmarkAdded'].includes(event.type),
    );
    assert.deepEqual(
      read.map((event) => event.type),
      ['StoryOpened', 'BookmarkAdded'],
      'the events stay, so the record of what the app did is whole',
    );
    assert.ok(
      read.every(
        (event) => !('story' in event.payload || 'reference' in event.payload || 'article' in event.payload),
      ),
      'no event says which passage, article or story',
    );
    assert.deepEqual(
      stripped.snapshot.modules.bookmarks,
      { count: 1 },
      'the bookmarks are counted, not listed',
    );
    assert.equal('lastPassage' in (stripped.snapshot.modules.preferences ?? {}), false);
    assert.ok(!JSON.stringify(stripped.snapshot.journal.tail).includes('"story":1'));
    const partial = await replayJournal(world, stripped, 'partial');
    assert.ok(partial.ok, partial.ok ? '' : partial.reason);
    assert.deepEqual(partial.snapshot.modules.bookmarks, { bookmarks: [] }, 'a bookmark cannot be rebuilt');
    assert.equal(
      stableJson(partial.snapshot.modules.packs),
      stableJson(snapshot.modules.packs),
      'everything else the file names is rebuilt',
    );

    const shared = await phone.kernel.share.journal(
      { journal, snapshot },
      { locale: 'en', includeReading: true },
    );
    assert.ok(shared.ok && shared.outcome === 'shared');
    assert.deepEqual(shared.payload.file, { path: diagnosticsPath, mimeType: 'application/json' });
    assert.equal(
      shared.payload.text,
      phone.kernel.strings.t('diagnostics.body.reading', 'en'),
      'the payload says in one sentence what the file holds, reading included',
    );
    assert.equal(
      phone.adapters.shareSheet.shared().at(-1),
      shared.payload,
      'it goes through the share sheet',
    );

    const text = await phone.adapters.files.readText(diagnosticsPath);
    const document = JSON.parse(text) as { snapshot: unknown; reading: unknown };
    assert.equal(document.reading, 'included');
    assert.equal(stableJson(document.snapshot), stableJson(snapshot), 'the file holds the snapshot');
    const parsed = parseJournalExport(document);
    assert.ok(parsed.ok, 'the file is a journal export the sim can read');
    assert.equal(parsed.journal.events.length, journal.events.length);

    for (const identifying of [
      locale.tag,
      locale.region,
      locale.timeZone,
      moved.offered.code,
      '192.0.2.',
      'sender',
      'phone',
    ]) {
      assert.ok(!text.includes(`"${identifying}`), `the file does not carry ${identifying}`);
    }
    const last = phone.kernel.journal.read().at(-1);
    assert.ok(
      last?.type === 'ShareSent' && last.payload.kind === 'journal' && last.payload.language === undefined,
    );

    const replayed = await replayJournal(world, document, 'helper');
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.deepEqual(replayed.divergence, []);
    assert.equal(stableJson(replayed.snapshot), stableJson(snapshot), 'the shared file rebuilds the device');

    const services = servicesOf(phone);
    assert.ok(
      (await services.settings.entries()).some((entry) => entry.id === 'diagnostics'),
      'Settings leads to diagnostics',
    );
    const diagnostics = services.diagnostics;
    assert.ok(await services.settings.setLocale('en'));
    assert.deepEqual(diagnostics.view(false), {
      title: 'Share diagnostics',
      body: phone.kernel.strings.t('diagnostics.body', 'en'),
      action: 'Share the file',
      includeReading: 'Include what I read',
    });
    assert.equal(diagnostics.view(true).body, phone.kernel.strings.t('diagnostics.body.reading', 'en'));
    for (const on of [false, true]) {
      assert.equal(diagnostics.view(on).body.split('. ').length, 1, 'one sentence says what the file holds');
    }
    assert.deepEqual(await diagnostics.share(false), { state: 'shared' });
    const handed = phone.adapters.shareSheet.shared().at(-1);
    assert.deepEqual(handed?.file, { path: diagnosticsPath, mimeType: 'application/json' });
    assert.equal(handed?.text, diagnostics.view(false).body);
    const again = JSON.parse(await phone.adapters.files.readText(diagnosticsPath)) as { reading: unknown };
    assert.ok(parseJournalExport(again).ok, 'the service shares a journal the sim can replay');
    assert.equal(again.reading, 'left-out', 'the service leaves reading out unless asked');
    assert.deepEqual(await diagnostics.share(true), { state: 'shared' });
    assert.equal(phone.adapters.shareSheet.shared().at(-1)?.text, diagnostics.view(true).body);
    const full = JSON.parse(await phone.adapters.files.readText(diagnosticsPath)) as { reading: unknown };
    assert.equal(full.reading, 'included');
    phone.adapters.shareSheet.respondWith('dismissed');
    assert.deepEqual(await diagnostics.share(false), { state: 'dismissed' });
  },
);
