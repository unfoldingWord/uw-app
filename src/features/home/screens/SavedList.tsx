import { useState } from 'react';
import type { FailureCode } from '@lib/domain/failures';
import type { IconName } from '@shared/glass';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { EmptyState, Notice, Row, SectionTitle } from '@shared/ui';
import { createHomeService, type SavedItem, type SavedKind } from '../service';

const kindIcons: Record<SavedKind, IconName> = {
  passage: 'bookmark',
  word: 'sparkle',
  academy: 'folder',
  story: 'grid',
};

export type SavedListProps = { items: readonly SavedItem[]; onOpen: (item: SavedItem) => void };

export function SavedList({ items, onOpen }: SavedListProps) {
  const home = useService(createHomeService);
  const words = home.words();
  const [failures, setFailures] = useState<Readonly<Record<string, FailureCode>>>({});
  const remove = async (id: string) => {
    const outcome = await home.removeSaved(id);
    setFailures((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== id));
      return outcome === undefined || outcome.ok ? rest : { ...rest, [id]: outcome.code };
    });
  };
  return (
    <>
      <SectionTitle>{words.t('home.saved.title')}</SectionTitle>
      {items.length === 0 ? (
        <EmptyState icon="bookmark" title={words.t('home.saved.empty')} />
      ) : (
        items.map((item) => {
          const { title } = item;
          const failure = failures[item.bookmark.id];
          return (
            <Row
              key={item.bookmark.id}
              icon={kindIcons[item.kind]}
              title={title}
              detail={item.detail}
              press={{
                accessibilityLabel: words.t('common.joined', { first: title, second: item.detail }),
                onPress: () => onOpen(item),
              }}
              trailing={
                <GlassButton
                  size="sm"
                  variant="quiet"
                  accessibilityLabel={words.t('common.bookmark.remove')}
                  accessibilityHint={title}
                  onPress={() => remove(item.bookmark.id)}
                >
                  {words.t('common.remove')}
                </GlassButton>
              }
              below={failure === undefined ? undefined : <Notice text={words.t(`failure.${failure}`)} />}
            />
          );
        })
      )}
    </>
  );
}
