import { describe, expect, it } from 'vitest';
import { languagePackId } from '@lib/domain/pack';
import { servicesOf } from './services';
import { createWorld } from './world';

describe('a pack Home calls ready can be read (HO-5, ST-1)', () => {
  it('never reports a complete download while Study still finds nothing to read', async () => {
    const world = createWorld();
    const device = world.device('phone');
    await device.start();
    await device.kernel.catalog.refresh();
    const services = servicesOf(device);
    await services.languages.select('qaa');
    const seen: Promise<{ home: string; study: string }>[] = [];
    const stop = device.kernel.packs.onChange(() => {
      seen.push(
        (async () => {
          const home = (await services.home.download()).state;
          const study = (await services.study.open()).state;
          return { home, study };
        })(),
      );
    });
    const outcome = await device.kernel.packs.installFromCatalog(languagePackId('qaa'));
    stop();
    expect(outcome.ok).toBe(true);
    const observed = await Promise.all(seen);
    expect(observed.length).toBeGreaterThan(0);
    for (const moment of observed) {
      if (moment.home === 'complete') {
        expect(moment.study).toBe('passage');
      }
    }
    expect((await services.study.open()).state).toBe('passage');
  });
});
