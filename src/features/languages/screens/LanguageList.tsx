import type { ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import { Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Badge, EmptyState, Gap, Notice, Row, ThemedText, type ScreenListFrame } from '@shared/ui';
import { createLanguagesService, type EmptyCause, type LanguageRow } from '../service';
import type { Failures } from './outcomes';

export type LanguageListProps = {
  frame: ScreenListFrame;
  header: ReactNode;
  footer: ReactNode;
  rows: readonly LanguageRow[];
  query: string;
  empty: EmptyCause | undefined;
  failures: Failures;
  onSelect: (row: LanguageRow) => Promise<void>;
};

function Trailing({ row }: { row: LanguageRow }) {
  const languages = useService(createLanguagesService);
  const theme = useTheme();
  const words = languages.words();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sp4 }}>
      {row.installing ? (
        <ThemedText variant="caption" tone="dim">
          {words.t('languages.installing')}
        </ThemedText>
      ) : null}
      {row.badge === undefined ? null : <Badge label={row.badge} />}
      {row.selected ? <Icon name="check" /> : null}
    </View>
  );
}

export function LanguageList({
  frame,
  header,
  footer,
  rows,
  query,
  empty,
  failures,
  onSelect,
}: LanguageListProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  return (
    <FlatList
      {...frame.props}
      data={rows}
      extraData={failures}
      keyExtractor={(row) => row.language}
      ItemSeparatorComponent={() => <Gap size={frame.gap} />}
      ListHeaderComponent={<View style={{ gap: frame.gap, paddingBottom: frame.gap }}>{header}</View>}
      ListFooterComponent={<View style={{ gap: frame.gap, paddingTop: frame.gap }}>{footer}</View>}
      ListEmptyComponent={
        query.trim() === '' ? (
          <EmptyState
            icon="globe"
            title={words.t(empty === 'offline' ? 'languages.empty.offline' : 'languages.empty')}
          />
        ) : (
          <EmptyState icon="search" title={words.t('languages.noMatch', { query: query.trim() })} />
        )
      }
      renderItem={({ item: row }) => {
        const failure = failures[row.language];
        return (
          <Row
            title={row.autonym}
            detail={row.detail}
            selected={row.selected}
            trailing={<Trailing row={row} />}
            below={failure === undefined ? undefined : <Notice text={words.t(`failure.${failure}`)} />}
            press={{
              accessibilityLabel: words.t('languages.select', { language: row.autonym }),
              accessibilityHint: row.detail,
              selected: row.selected,
              onPress: () => onSelect(row),
            }}
          />
        );
      }}
    />
  );
}
