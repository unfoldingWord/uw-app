import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GlassButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Notice, Row, SectionTitle } from '@shared/ui';
import { createLanguagesService } from '../service';
import type { Failures } from './outcomes';
import { downloadedHref } from './routes';

export type DownloadedSectionProps = {
  failures: Failures;
  onSelect: (language: string) => Promise<void>;
};

export function DownloadedSection({ failures, onSelect }: DownloadedSectionProps) {
  const languages = useService(createLanguagesService);
  const theme = useTheme();
  const router = useRouter();
  const words = languages.words();
  const downloaded = languages.downloaded();
  if (downloaded.length === 0) {
    return null;
  }
  return (
    <>
      <SectionTitle>{words.t('languages.downloaded.title')}</SectionTitle>
      {downloaded.map((item) => {
        const failure = failures[item.language];
        return (
          <View key={item.language} style={[styles.line, { gap: theme.space.sp4 }]}>
            <View style={styles.fill}>
              <Row
                title={item.autonym}
                detail={item.englishName}
                selected={item.selected}
                trailing={item.selected ? <Icon name="check" /> : undefined}
                below={failure === undefined ? undefined : <Notice text={words.t(`failure.${failure}`)} />}
                press={{
                  accessibilityLabel: words.t('languages.select', { language: item.autonym }),
                  selected: item.selected,
                  onPress: () => onSelect(item.language),
                }}
              />
            </View>
            <GlassButton
              size="sm"
              variant="glass"
              accessibilityLabel={item.show}
              onPress={() => router.push(downloadedHref(item.language))}
            >
              {item.resources}
            </GlassButton>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1, minWidth: 0 },
});
