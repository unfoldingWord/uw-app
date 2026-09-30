import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, Screen, ThemedText } from '@shared/ui';
import { createSettingsService } from '../service';

export default function PrivacyScreen() {
  const service = useService(createSettingsService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const privacy = service.privacy();

  return (
    <Screen title={privacy.title} back={{ label: words.t('common.back'), onPress: () => router.back() }}>
      <Card level={2}>
        <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold}>
          {privacy.summary}
        </ThemedText>
      </Card>
      <Card level={1}>
        <ThemedText variant="body" tone="body">
          {privacy.intro}
        </ThemedText>
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
              <ThemedText variant="label" tone="title" style={styles.grow}>
                {count.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </Card>
      <Card level={1}>
        {privacy.notes.map((note) => (
          <ThemedText key={note} variant="body" tone="body">
            {note}
          </ThemedText>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
});
