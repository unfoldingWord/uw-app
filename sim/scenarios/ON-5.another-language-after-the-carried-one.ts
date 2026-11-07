import assert from 'node:assert/strict';
import { fixtureBundle } from '../bundled';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ON-5',
  'a reader downloads another language while the carried pictures are still being placed, and nothing downloads the pictures again',
  async (world) => {
    const phone = world.device('phone', { bundled: await fixtureBundle('qaa') });
    await phone.start();
    const services = servicesOf(phone);
    assert.ok((await services.languages.refresh()).ok);
    const placing = phone.kernel.packs.placeBundled();
    assert.ok(await services.languages.select('qab'));
    const downloaded = await services.languages.download('qab');
    assert.ok(downloaded.ok, downloaded.ok ? '' : downloaded.code);
    await placing;
    assert.deepEqual(phone.kernel.packs.installing(), []);
    const pictures = phone.kernel.journal
      .read()
      .filter((entry) => entry.type === 'PackInstallStarted' && entry.payload.pack === 'image:obs')
      .map((entry) => (entry.type === 'PackInstallStarted' ? entry.payload.source : ''));
    assert.deepEqual(
      pictures,
      ['bundled'],
      'the pictures the app carries are placed once and never downloaded',
    );
    const card = await services.home.download();
    assert.equal(card.state, 'complete', JSON.stringify(card));
  },
);
