import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { createSettingsService } from '../service';
import { Card } from './parts/Card';
import { Line } from './parts/Line';
import { Screen } from './parts/Screen';

export default function PrivacyScreen() {
  const service = useService(createSettingsService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const privacy = service.privacy();

  return (
    <Screen title={privacy.title} back={{ label: words.t('common.back'), onPress: () => router.back() }}>
      <Card level={2}>
        <Line role="body" tone="title" weight={theme.fontWeight.fwSemibold}>
          {privacy.summary}
        </Line>
      </Card>
      <Card level={1}>
        <Line role="body" tone="body">
          {privacy.intro}
        </Line>
        <View accessibilityRole="list" style={{ gap: theme.space.sp4 }}>
          {privacy.counts.map((count) => (
            <View key={count.fold} style={[styles.item, { gap: theme.space.sp4 }]}>
              <View
                style={{
                  width: theme.space.sp3,
                  height: theme.space.sp3,
                  marginTop: theme.space.sp3,
                  borderRadius: theme.radius.rPill,
                  backgroundColor: theme.color.accentBlue,
                }}
              />
              <Line role="label" tone="title" style={styles.grow}>
                {count.label}
              </Line>
            </View>
          ))}
        </View>
      </Card>
      <Card level={1}>
        {privacy.notes.map((note) => (
          <Line key={note} role="body" tone="body">
            {note}
          </Line>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
});
