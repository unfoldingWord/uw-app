import assert from 'node:assert/strict';
import { readArchive, writeArchive } from '@lib/burrito/archive';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { fixtureBundle } from '../bundled';
import type { SimDevice } from '../device';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const pack = languagePackId('qaa');

function tampered(archive: Uint8Array): Uint8Array {
  const read = readArchive(archive);
  if (!read.ok) {
    throw new Error('the carried archive is unreadable');
  }
  const files = new Map(read.files);
  const [path, bytes] = [...files.entries()].find(([key]) => key.endsWith('.usfm')) ?? [];
  if (path === undefined || bytes === undefined) {
    throw new Error('the carried text has no USFM');
  }
  const changed = bytes.slice();
  changed[0] = (changed[0] ?? 0) ^ 1;
  files.set(path, changed);
  return writeArchive(files, { mtime: new Date(2026, 0, 1) });
}

function failuresOf(phone: SimDevice): string[] {
  return phone.kernel.journal
    .read()
    .flatMap((entry) => (entry.type === 'PackFailed' ? [entry.payload.code] : []));
}

export default scenario(
  'ON-5',
  'a carried pack that does not install fails loudly with a code, is tried again on the next start, and leaves the app usable',
  async (world) => {
    const bundled = await fixtureBundle('qaa');
    const text = bundled.archives.find((archive) => archive.resource === 'qaa_ult');
    const original = text === undefined ? undefined : bundled.bytes.get(text.file);
    assert.ok(text !== undefined && original !== undefined);

    const phone = world.device('phone', { bundled });
    phone.adapters.bundled.replace(text.file, tampered(original));
    await phone.start();
    phone.adapters.http.setOnline(false);
    const outcomes = await phone.kernel.packs.placeBundled();
    assert.deepEqual(
      outcomes.map((outcome) => (outcome.ok ? outcome.pack.pack : `${outcome.pack ?? ''} ${outcome.code}`)),
      [`${pack} pack.checksum-mismatch`, imagePackId],
      'the language fails with its code and the pictures still arrive',
    );
    assert.deepEqual(failuresOf(phone), ['pack.checksum-mismatch']);
    const status = await phone.kernel.packs.status('qaa');
    assert.equal(status.failure, 'pack.checksum-mismatch', 'the failure is state a screen can show');

    await phone.restart();
    phone.adapters.http.setOnline(false);
    phone.adapters.bundled.failNext('files.not-found');
    const again = await phone.kernel.packs.placeBundled();
    assert.deepEqual(
      again.map((outcome) => (outcome.ok ? outcome.pack.pack : outcome.code)),
      ['files.not-found'],
      'the next start tries the language again, and a missing archive is its own code',
    );

    phone.adapters.http.setOnline(true);
    const chosen = await servicesOf(phone).onboarding.choose('qaa');
    const done = await chosen.done;
    assert.ok(done.ok, 'with a connection the leader still gets the language from the catalog');
    assert.equal(
      phone.kernel.packs.installed().find((item) => item.pack === pack)?.source,
      'catalog',
      'downloaded, not carried',
    );
    assert.deepEqual(await phone.kernel.packs.placeBundled(), [], 'once on the phone it is not placed again');
  },
);
