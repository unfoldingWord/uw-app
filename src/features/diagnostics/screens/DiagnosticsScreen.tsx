import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, Header, Notice, ScreenScaffold, ThemedText, Toggle } from '@shared/ui';
import { createDiagnosticsService } from '../service';

export default function DiagnosticsScreen() {
  const service = useService(createDiagnosticsService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const [includeReading, setIncludeReading] = useState(false);
  const view = service.view(includeReading);
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const leave = () => (router.canGoBack() ? router.back() : router.navigate('/settings'));

  const share = async () => {
    setFailure(undefined);
    const done = await service.share(includeReading);
    if (done.state === 'failed') {
      setFailure(done.message);
      return;
    }
    if (done.state === 'shared') {
      leave();
    }
  };

  return (
    <ScreenScaffold
      header={<Header back={{ label: words.t('common.back'), onPress: leave }} title={view.title} />}
    >
      <Card>
        <ThemedText variant="body" tone="title" accessibilityLiveRegion="polite">
          {view.body}
        </ThemedText>
        <View style={[styles.row, { gap: theme.space.sp6 }]}>
          <View style={styles.grow}>
            <ThemedText variant="label" tone="title">
              {view.includeReading}
            </ThemedText>
          </View>
          <Toggle label={view.includeReading} on={includeReading} onChange={setIncludeReading} />
        </View>
        <GlassButton variant="dark" size="lg" full onPress={share}>
          {view.action}
        </GlassButton>
        {failure === undefined ? null : <Notice text={failure} />}
      </Card>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
