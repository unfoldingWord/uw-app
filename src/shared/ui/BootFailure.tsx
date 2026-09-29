import { StyleSheet, View } from 'react-native';
import { createStrings } from '@lib/strings/strings';
import { tables } from '@lib/strings/locales/index';
import { resolveLocale } from '@lib/strings/locales';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { EmptyState } from './EmptyState';
import { ScreenScaffold } from './ScreenScaffold';

export type BootFailureProps = {
  localeTags: readonly string[];
  onRetry: () => Promise<unknown>;
};

const strings = createStrings(tables);

export function BootFailure({ localeTags, onRetry }: BootFailureProps) {
  const theme = useTheme();
  const words = strings.words(resolveLocale(localeTags));
  return (
    <ScreenScaffold scroll={false}>
      <View style={[styles.bottom, { gap: theme.space.gapStack }]}>
        <EmptyState
          title={words.t('failure.boot')}
          action={
            <GlassButton variant="dark" full onPress={onRetry}>
              {words.t('common.retry')}
            </GlassButton>
          }
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: 'flex-end' },
});
