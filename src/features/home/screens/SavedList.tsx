import type { IconName } from '@shared/glass';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { EmptyState, Row, SectionTitle } from '@shared/ui';
import { createHomeService, type SavedItem, type SavedKind } from '../service';
import type { HomeWords } from '../strings';

const kindIcons: Record<SavedKind, IconName> = {
  passage: 'bookmark',
  word: 'sparkle',
  academy: 'folder',
  story: 'grid',
};

function titleOf(words: HomeWords, item: SavedItem): string {
  const { bookmark } = item;
  switch (bookmark.target) {
    case 'passage':
      return bookmark.reference;
    case 'story':
      return words.t('home.formation.story', { number: bookmark.story });
    case 'article':
      return bookmark.article.split('/').at(-1) ?? bookmark.article;
  }
}

export type SavedListProps = { items: readonly SavedItem[]; onOpen: (id: string) => void };

export function SavedList({ items, onOpen }: SavedListProps) {
  const home = useService(createHomeService);
  const words = home.words();
  return (
    <>
      <SectionTitle>{words.t('home.saved.title')}</SectionTitle>
      {items.length === 0 ? (
        <EmptyState icon="bookmark" title={words.t('home.saved.empty')} />
      ) : (
        items.map((item) => {
          const title = titleOf(words, item);
          return (
            <Row
              key={item.bookmark.id}
              icon={kindIcons[item.kind]}
              title={title}
              detail={item.detail}
              press={{
                accessibilityLabel: words.t('common.joined', { first: title, second: item.detail }),
                onPress: () => onOpen(item.bookmark.id),
              }}
              trailing={
                <GlassButton
                  size="sm"
                  variant="quiet"
                  accessibilityLabel={words.t('common.bookmark.remove')}
                  accessibilityHint={title}
                  onPress={() => home.removeSaved(item.bookmark.id)}
                >
                  {words.t('common.remove')}
                </GlassButton>
              }
            />
          );
        })
      )}
    </>
  );
}
