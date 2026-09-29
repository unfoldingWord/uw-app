import { describe, expect, it } from 'vitest';
import { parseReference } from '@lib/domain/reference';
import { importLocalBurrito } from './burritos';
import { largeText } from './large';
import { createWorld } from './world';

const books = ['ISA', 'GEN', 'EXO', 'NUM', 'DEU', 'LEV', 'JOS', 'JDG'];

type Collect = () => void;

function collector(): Collect | undefined {
  const candidate: unknown = Reflect.get(globalThis, 'gc');
  return typeof candidate === 'function' ? () => Reflect.apply(candidate, globalThis, []) : undefined;
}

function retained(collect: Collect): number {
  collect();
  collect();
  return process.memoryUsage().heapUsed;
}

async function open(device: ReturnType<ReturnType<typeof createWorld>['device']>, book: string) {
  const reference = parseReference(`${book} 1:1`);
  if (!reference.ok) {
    throw new Error(book);
  }
  return device.kernel.corpus.passage(reference.reference, { language: 'qay' });
}

describe('corpus memory on a large pack (ST-9, PRD 8.5)', () => {
  it('keeps a few parsed books, not every book it has opened, and builds the index book by book', async () => {
    const collect = collector();
    expect(collect, 'vitest runs with --expose-gc (vitest.config.ts execArgv)').toBeDefined();
    if (collect === undefined) {
      return;
    }
    const world = createWorld();
    const device = world.device('phone');
    await device.start();
    const text = largeText('qay_ult', 'qay', books, 20, 22);
    const bytes = text.ingredients.reduce((sum, item) => sum + item.bytes.byteLength, 0);
    expect(bytes).toBeGreaterThan(20 * 1024 * 1024);
    const outcome = await importLocalBurrito(device, text);
    expect(outcome.ok).toBe(true);

    const baseline = retained(collect);
    expect(await open(device, 'GEN')).toBeDefined();
    const oneBook = retained(collect) - baseline;
    expect(oneBook).toBeGreaterThan(1024 * 1024);
    for (const book of books) {
      expect(await open(device, book)).toBeDefined();
    }
    const everyBook = retained(collect) - baseline;
    expect(
      everyBook,
      `opening ${books.length} books kept ${Math.round(everyBook / 1e6)} MB against ${Math.round(oneBook / 1e6)} MB for one`,
    ).toBeLessThan(oneBook * 4);

    const built = await device.kernel.corpus.reindex('qay');
    expect(built.built).toBe(true);
    const afterIndex = retained(collect) - baseline;
    expect(afterIndex, 'building the index keeps no book it parsed').toBeLessThan(oneBook * 4);
  }, 60_000);
});
