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
  'a leader shares the journal and a snapshot through the share sheet, in one file that names no one',
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

    const snapshot = phone.kernel.snapshot();
    const journal = phone.kernel.journal.export();
    const shared = await phone.kernel.share.journal({ journal, snapshot }, { locale: 'en' });
    assert.ok(shared.ok && shared.outcome === 'shared');
    assert.deepEqual(shared.payload.file, { path: diagnosticsPath, mimeType: 'application/json' });
    assert.equal(
      shared.payload.text,
      phone.kernel.strings.t('diagnostics.body', 'en'),
      'the payload says in one sentence what the file holds',
    );
    assert.equal(
      phone.adapters.shareSheet.shared().at(-1),
      shared.payload,
      'it goes through the share sheet',
    );

    const text = await phone.adapters.files.readText(diagnosticsPath);
    const document = JSON.parse(text) as { snapshot: unknown };
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
    assert.deepEqual(diagnostics.view(), {
      title: 'Share diagnostics',
      body: phone.kernel.strings.t('diagnostics.body', 'en'),
      action: 'Share the file',
    });
    assert.equal(diagnostics.view().body.split('. ').length, 1, 'one sentence says what the file holds');
    assert.deepEqual(await diagnostics.share(), { state: 'shared' });
    const handed = phone.adapters.shareSheet.shared().at(-1);
    assert.deepEqual(handed?.file, { path: diagnosticsPath, mimeType: 'application/json' });
    const again = JSON.parse(await phone.adapters.files.readText(diagnosticsPath)) as unknown;
    assert.ok(parseJournalExport(again).ok, 'the service shares a journal the sim can replay');
    phone.adapters.shareSheet.respondWith('dismissed');
    assert.deepEqual(await diagnostics.share(), { state: 'dismissed' });
  },
);
