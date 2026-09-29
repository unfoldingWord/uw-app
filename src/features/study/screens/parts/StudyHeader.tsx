import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassIconButton, GlassSurface, Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { StudyWords } from '../../strings';
import type { ChapterPlace } from './passage';
import { studyRoutes } from './routes';

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
  return (
    <View
      style={[
        styles.row,
        { gap: theme.space.sp4, paddingHorizontal: theme.space.gutterScreen, paddingTop: theme.space.sp6 },
      ]}
    >
      {language === undefined ? null : (
        <GlassButton
          size="sm"
          accessibilityLabel={words.t('common.language.chip', { language })}
          leading={<Icon name="globe" size={theme.fontSize.fsSubtitle} />}
          onPress={() => router.push(studyRoutes.languages)}
        >
          {language}
        </GlassButton>
      )}
      {place === undefined ? (
        <View style={styles.fill} />
      ) : (
        <GlassSurface level={3} blur="medium" radius="pill" shadow="rest" style={[styles.fill, styles.row]}>
          <GlassIconButton
            label={words.t('study.nav.previous')}
            size={theme.space.sp13}
            disabled={previous === undefined}
            onPress={() => (previous === undefined ? undefined : onGo(previous))}
          >
            <Icon name="chevronLeft" size={theme.fontSize.fsSubtitle} />
          </GlassIconButton>
          <GlassButton
            variant="quiet"
            size="sm"
            accessibilityHint={words.t('study.nav.choose')}
            onPress={onChoose}
            style={styles.fill}
          >
            {place}
          </GlassButton>
          <GlassIconButton
            label={words.t('study.nav.next')}
            size={theme.space.sp13}
            disabled={next === undefined}
            onPress={() => (next === undefined ? undefined : onGo(next))}
          >
            <Icon name="chevronRight" size={theme.fontSize.fsSubtitle} />
          </GlassIconButton>
        </GlassSurface>
      )}
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1, minWidth: 0 },
});
