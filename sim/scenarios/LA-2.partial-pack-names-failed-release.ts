import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const notesArchive = 'https://git.door43.org/unfoldingWord/qaa_tn/sb/';
const literalArchive = 'https://git.door43.org/unfoldingWord/qaa_ult/sb/';
const failedNotes = {
  publisher: 'unfoldingWord',
  resource: 'qaa_tn',
  language: 'qaa',
  tag: 'v1',
  code: 'http.status',
};

export default scenario(
  'LA-2',
  'an optional burrito that fails does not sink the language pack: the pack installs partial and names the failed release',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.languages.refresh();
    await services.languages.select('qaa');
    const pack = languagePackId('qaa');

    const defaults = await phone.kernel.packs.defaults(pack);
    assert.ok(
      !defaults.some((release) => release.row === 'formation'),
      'a provisional row with no source is not in the default pack',
    );

    phone.adapters.http.script(notesArchive, { status: 500 }, 1);
    const outcome = await services.languages.download('qaa');
    assert.ok(outcome.ok, outcome.ok ? '' : outcome.code);
    assert.ok(!outcome.pack.burritos.some((burrito) => burrito.provenance.resource === 'qaa_tn'));

    const installed = phone.kernel.journal.read().find((entry) => entry.type === 'PackInstalled');
    assert.ok(installed?.type === 'PackInstalled');
    assert.deepEqual(installed.payload.failed, [failedNotes], 'the journal names the failed release');
    const journal = phone.kernel.journal.read();
    const resourceFailures = journal.filter((entry) => entry.type === 'PackResourceFailed');
    assert.deepEqual(
      resourceFailures.map(
        (entry) => entry.type === 'PackResourceFailed' && { ...entry.payload, install: undefined },
      ),
      [{ install: undefined, pack, ...failedNotes }],
      'each optional release that fails is its own event, with its release',
    );
    const [resourceFailure] = resourceFailures;
    assert.ok(resourceFailure?.type === 'PackResourceFailed');
    assert.equal(resourceFailure.payload.install, installed.payload.install);
    assert.ok(
      journal.indexOf(resourceFailure) < journal.indexOf(installed),
      'the release failure is journaled before the partial pack is installed',
    );
    assert.ok(
      !journal.some((entry) => entry.type === 'PackFailed'),
      'PackFailed stays the event for an install that did not happen',
    );

    const ruth = parseReference('RUT 1:16');
    assert.ok(ruth.ok);
    const passage = await phone.kernel.corpus.passage(ruth.reference, { language: 'qaa' });
    assert.ok(passage !== undefined, 'the passage reads from the partial pack');
    assert.ok(passage.text.verses.length > 0);

    const status = await phone.kernel.packs.status('qaa');
    assert.equal(status.complete, false, 'a partial pack is incomplete');
    assert.deepEqual(
      status.missing.map((release) => release.resource),
      ['qaa_tn'],
    );
    assert.deepEqual(status.failed, [failedNotes]);

    const home = await services.home.download();
    assert.equal(home.state, 'missing', 'Home counts the partial pack as incomplete');

    const missing = await services.languages.missing();
    assert.deepEqual(
      missing.map((item) => ({ resource: item.resource, publisher: item.publisher, code: item.code })),
      [{ resource: 'qaa_tn', publisher: 'unfoldingWord', code: 'http.status' }],
      'the Languages screen names the missing resource with its failure',
    );
    assert.ok(missing.every((item) => item.title !== '' && item.detail !== ''));

    const retried = await services.languages.download('qaa');
    assert.ok(retried.ok);
    const after = await phone.kernel.packs.status('qaa');
    assert.equal(after.complete, true, 'Retry installs only what is missing');
    assert.deepEqual(after.failed, []);
    assert.deepEqual(await services.languages.missing(), []);

    const other = world.device('other');
    await other.start();
    await other.kernel.catalog.refresh();
    other.adapters.http.script(literalArchive, { status: 500 }, 1);
    const sunk = await other.kernel.packs.installFromCatalog(pack);
    assert.equal(sunk.ok, false, 'a failed literal text fails the install');
    assert.equal(other.kernel.packs.installed().length, 0);
    const failed = other.kernel.journal.read().find((entry) => entry.type === 'PackFailed');
    assert.ok(failed?.type === 'PackFailed');
    assert.deepEqual(
      {
        publisher: failed.payload.publisher,
        resource: failed.payload.resource,
        tag: failed.payload.tag,
        code: failed.payload.code,
      },
      { publisher: 'unfoldingWord', resource: 'qaa_ult', tag: 'v1', code: 'http.status' },
      'PackFailed names the release that failed',
    );
  },
);
