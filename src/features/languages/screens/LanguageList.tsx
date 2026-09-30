import { View } from 'react-native';
import { Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Badge, EmptyState, Notice, Row, ThemedText } from '@shared/ui';
import { createLanguagesService, type LanguageRow } from '../service';
import type { Failures } from './outcomes';

export type LanguageListProps = {
  rows: readonly LanguageRow[];
  query: string;
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

export function LanguageList({ rows, query, failures, onSelect }: LanguageListProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  if (rows.length === 0) {
    return query.trim() === '' ? (
      <EmptyState icon="globe" title={words.t('languages.offline')} />
    ) : (
      <EmptyState icon="search" title={words.t('languages.noMatch', { query: query.trim() })} />
    );
  }
  return (
    <>
      {rows.map((row) => {
        const failure = failures[row.language];
        return (
          <Row
            key={row.language}
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
      })}
    </>
  );
}
