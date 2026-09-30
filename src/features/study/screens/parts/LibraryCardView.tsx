import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassChip, GlassSurface, Icon, type IconName } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { LibraryCard } from '../../service';
import type { StudyWords } from '../../strings';
import { Say } from './Say';

const icons: Record<LibraryCard['type'], IconName> = {
  literal: 'layers',
  simplified: 'layers',
  notes: 'sparkle',
  wordLinks: 'search',
  questions: 'check',
  words: 'search',
  academy: 'compass',
  stories: 'grid',
  storyHelps: 'check',
  formation: 'users',
  audio: 'mic',
  images: 'folder',
  hebrew: 'globe',
  greek: 'globe',
};

export type LibraryCardViewProps = {
  words: StudyWords;
  card: LibraryCard;
  failure: string | undefined;
  onDownload: (card: LibraryCard) => Promise<void>;
};

export function LibraryCardView({ words, card, failure, onDownload }: LibraryCardViewProps) {
  const theme = useTheme();
  const others = card.publishers.slice(1);
  return (
    <GlassSurface
      level={2}
      blur="strong"
      radius="lg"
      shadow="rest"
      style={[styles.row, { padding: theme.space.sp7, gap: theme.space.sp7 }]}
    >
      <View
        style={[
          styles.tile,
          {
            width: theme.space.sp14,
            height: theme.space.sp14,
            borderRadius: theme.radius.rSm,
            backgroundColor: theme.color.glassFill3,
            borderWidth: theme.border.borderGlassSoft.width,
            borderColor: theme.border.borderGlassSoft.color,
          },
        ]}
      >
        <Icon name={icons[card.type]} />
      </View>
      <View style={[styles.fill, { gap: theme.space.sp2 }]}>
        <Say role="body" tone="title" weight="semibold">
          {card.title}
        </Say>
        <Say role="caption" tone="body">
          {card.about}
        </Say>
        <View style={[styles.wrap, { gap: theme.space.sp3, marginTop: theme.space.sp3 }]}>
          {card.count === undefined ? null : <GlassChip size="sm">{card.count}</GlassChip>}
          <GlassChip size="sm">{card.meta}</GlassChip>
          {others.map((publisher) => (
            <GlassChip key={publisher} size="sm">
              {publisher}
            </GlassChip>
          ))}
          <GlassChip
            size="sm"
            leading={
              card.state === 'on-phone' ? (
                <View
                  style={{
                    width: theme.space.sp3,
                    height: theme.space.sp3,
                    borderRadius: theme.radius.rPill,
                    backgroundColor: theme.color.accentTeal,
                  }}
                />
              ) : undefined
            }
          >
            {card.state === 'on-phone'
              ? words.t('library.onPhone')
              : card.state === 'downloading'
                ? words.t('library.downloading')
                : card.optional
                  ? words.t('library.optional')
                  : words.t('library.notDownloaded')}
          </GlassChip>
        </View>
        {card.state === 'on-phone' || card.pack === undefined ? null : (
          <GlassButton
            variant="glass"
            size="sm"
            busy={card.state === 'downloading'}
            onPress={() => onDownload(card)}
            style={{ marginTop: theme.space.sp4 }}
          >
            {words.t('library.download', { resource: card.title })}
          </GlassButton>
        )}
        {failure === undefined ? null : (
          <Say role="caption" tone="warm" live>
            {failure}
          </Say>
        )}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
