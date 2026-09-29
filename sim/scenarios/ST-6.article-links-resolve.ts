import assert from 'node:assert/strict';
import type { Block, Inline, LinkTarget } from '@lib/corpus/types';
import { languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';

type FoundLink = { text: string; target: LinkTarget | undefined };

function inlineText(inlines: readonly Inline[]): string {
  return inlines
    .map((inline) => (inline.kind === 'text' ? inline.text : inlineText(inline.children)))
    .join('');
}

function linksIn(blocks: readonly Block[]): FoundLink[] {
  const fromInlines = (inlines: readonly Inline[]): FoundLink[] =>
    inlines.flatMap((inline) => {
      if (inline.kind === 'link') {
        return [{ text: inlineText(inline.children), target: inline.target }];
      }
      return inline.kind === 'text' ? [] : fromInlines(inline.children);
    });
  return blocks.flatMap((block) => {
    switch (block.kind) {
      case 'heading':
      case 'paragraph':
        return fromInlines(block.children);
      case 'list':
        return block.items.flatMap(linksIn);
      case 'quote':
        return linksIn(block.children);
    }
  });
}

export default scenario(
  'ST-6',
  'Words and Academy articles read as typed blocks whose links resolve to other articles and to passages',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;

    const love = await corpus.article('tw/bible/kt/love', 'qaa');
    assert.ok(love);
    assert.equal(love.kind, 'word');
    assert.equal(love.title, 'love, beloved');
    assert.equal(love.provenance.resource, 'qaa_tw');
    assert.equal(love.blocks[0]?.kind, 'heading');
    assert.deepEqual(linksIn(love.blocks), [
      { text: 'God', target: { kind: 'article', id: 'tw/bible/kt/god' } },
      { text: 'truth, true', target: { kind: 'article', id: 'tw/bible/kt/truth' } },
      { text: '3 John 1:1', target: { kind: 'passage', reference: '3JN 1:1' } },
    ]);

    const metaphor = await corpus.article('ta/translate/figs-metaphor', 'qaa');
    assert.ok(metaphor);
    assert.equal(metaphor.kind, 'academy');
    assert.equal(metaphor.title, 'Metaphor');
    assert.equal(metaphor.subtitle, 'What is a metaphor and how can I translate one?');
    assert.deepEqual(metaphor.related, ['ta/translate/figs-idiom', 'ta/translate/translate-names']);
    assert.deepEqual(linksIn(metaphor.blocks), [
      { text: '3 John 1:3', target: { kind: 'passage', reference: '3JN 1:3' } },
      { text: 'Idiom', target: { kind: 'article', id: 'ta/translate/figs-idiom' } },
    ]);
    const strategies = metaphor.blocks.find((block) => block.kind === 'list');
    assert.ok(
      strategies && strategies.kind === 'list' && strategies.ordered && strategies.items.length === 2,
    );

    const contents = await corpus.contents('qaa');
    for (const entry of [...contents.words, ...contents.academy]) {
      const article = await corpus.article(entry.id, 'qaa');
      assert.ok(article, `${entry.id} opens`);
      for (const link of linksIn(article.blocks)) {
        assert.ok(link.target, `${entry.id}: "${link.text}" resolves`);
        if (link.target.kind === 'article') {
          assert.ok(
            await corpus.article(link.target.id, 'qaa'),
            `${entry.id} links to ${link.target.id}, which opens`,
          );
        }
        if (link.target.kind === 'passage') {
          const parsed = parseReference(link.target.reference);
          assert.ok(parsed.ok);
          assert.ok(
            await corpus.passage(parsed.reference, { language: 'qaa' }),
            `${link.target.reference} opens`,
          );
        }
      }
    }
    assert.equal(await corpus.article('tw/bible/kt/missing', 'qaa'), undefined);

    const opened = device.kernel.journal.read().filter((entry) => entry.type === 'ArticleOpened');
    assert.deepEqual(opened[0]?.payload, { article: 'tw/bible/kt/love', language: 'qaa' });
  },
);
