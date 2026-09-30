import assert from 'node:assert/strict';
import { admittedRows } from '@lib/burrito/flavors';
import { validate } from '@lib/burrito/validate';
import { languagePackId, packDirectory } from '@lib/domain/pack';
import { readBurrito } from '@lib/packs/tree';
import { burritoRootOf, installFromCatalog } from '../install';
import { scenario } from '../scenario';

const article = 'ingredients/payload/kt/god.md';

export default scenario(
  'LA-6',
  'Word Links keep no second copy of the Words articles on the phone, and Storage shows the measured size',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const [pack] = await installFromCatalog(phone, [languagePackId('qaa')]);
    assert.ok(pack !== undefined);
    const files = phone.adapters.files;
    const words = burritoRootOf(phone, 'qaa_tw');
    const links = burritoRootOf(phone, 'qaa_twl');
    assert.ok(await files.exists(`${words}/${article}`), 'the Words burrito keeps its articles');
    assert.equal(
      await files.exists(`${links}/${article}`),
      false,
      'the same article is not extracted a second time from Word Links',
    );
    assert.ok(await files.exists(`${links}/ingredients/RUT.tsv`), 'the Word Links tables are kept');

    const storage = await phone.kernel.packs.storage();
    const measured = await files.size(packDirectory(languagePackId('qaa')));
    assert.equal(storage.packs[0]?.bytes, measured, 'Storage shows the size measured on the phone');
    const linksBurrito = pack.burritos.find((burrito) => burrito.provenance.resource === 'qaa_twl');
    assert.equal(linksBurrito?.bytes, await files.size(links));

    const whole = await readBurrito(files, links);
    const report = validate(whole, { rows: admittedRows });
    assert.ok(report.ok, report.ok ? '' : report.message);
    assert.ok(whole.has(article), 'what leaves the phone is the burrito as it arrived');
  },
);
