import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassIconButton, GlassSurface, Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { StudyWords } from '../../strings';
import type { ChapterPlace } from './passage';
import { studyRoutes } from './routes';
import { Say } from './Say';

export type StudyHeaderProps = {
  words: StudyWords;
  language: string | undefined;
  place: string | undefined;
  previous: ChapterPlace | undefined;
  next: ChapterPlace | undefined;
  onGo: (place: ChapterPlace) => void;
  onChoose: () => void;
};

export function StudyHeader({ words, language, place, previous, next, onGo, onChoose }: StudyHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const size = theme.space.sp14;
  const target = { minWidth: theme.space.sp13, minHeight: theme.space.sp13 };
  return (
    <View
      style={{
        gap: theme.space.sp4,
        paddingHorizontal: theme.space.gutterScreen,
        paddingTop: theme.space.sp6,
      }}
    >
      <View style={[styles.row, { gap: theme.space.sp4 }]}>
        {language === undefined ? null : (
          <GlassButton
            size="sm"
            accessibilityLabel={words.t('common.language.chip', { language })}
            leading={<Icon name="globe" size={theme.fontSize.fsSubtitle} />}
            trailing={<Icon name="chevronDown" size={theme.fontSize.fsCaption} />}
            onPress={() => router.push(studyRoutes.languages)}
            style={styles.chip}
          >
            <Say role="caption" tone="title" weight="semibold" lines={1}>
              {language}
            </Say>
          </GlassButton>
        )}
        <View style={styles.fill} />
        <GlassIconButton
          label={words.t('common.search')}
          size={size}
          onPress={() => router.push(studyRoutes.search)}
        >
          <Icon name="search" />
        </GlassIconButton>
        <GlassIconButton
          label={words.t('library.open')}
          size={size}
          onPress={() => router.push(studyRoutes.library)}
        >
          <Icon name="layers" />
        </GlassIconButton>
      </View>
      {place === undefined ? null : (
        <GlassSurface
          level={3}
          blur="medium"
          radius="pill"
          shadow="rest"
          style={[styles.row, { paddingHorizontal: theme.space.sp3 }]}
        >
          <GlassButton
            variant="quiet"
            accessibilityLabel={words.t('study.nav.previous')}
            disabled={previous === undefined}
            onPress={() => (previous === undefined ? undefined : onGo(previous))}
            style={[styles.chevron, target]}
          >
            <Icon name="chevronLeft" size={theme.fontSize.fsSubtitle} />
          </GlassButton>
          <GlassButton
            variant="quiet"
            accessibilityLabel={place}
            accessibilityHint={words.t('study.nav.choose')}
            onPress={onChoose}
            style={[styles.fill, target]}
          >
            <Say role="label" tone="title" weight="semibold" lines={1}>
              {place}
            </Say>
          </GlassButton>
          <GlassButton
            variant="quiet"
            accessibilityLabel={words.t('study.nav.next')}
            disabled={next === undefined}
            onPress={() => (next === undefined ? undefined : onGo(next))}
            style={[styles.chevron, target]}
          >
            <Icon name="chevronRight" size={theme.fontSize.fsSubtitle} />
          </GlassButton>
        </GlassSurface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1, minWidth: 0 },
  chevron: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  chip: { flexShrink: 1 },
});
