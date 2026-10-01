import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Card, ThemedText } from '@shared/ui';
import type { SettingsService, StoragePack, StorageView } from '../../service';

export type StorageSectionProps = {
  service: SettingsService;
  storage: StorageView | undefined;
  onChanged: () => Promise<void>;
};

export function StorageSection({ service, storage, onChanged }: StorageSectionProps) {
  const theme = useTheme();
  const words = service.words();
  return (
    <Card level={1}>
      <ThemedText variant="overline" tone="dim" accessibilityRole="header">
        {words.t('storage.title')}
      </ThemedText>
      {storage === undefined ? (
        <ThemedText variant="caption" tone="dim" live>
          {words.t('common.busy')}
        </ThemedText>
      ) : (
        <>
          <ThemedText variant="label" tone="title">
            {storage.summary}
          </ThemedText>
          {storage.low ? (
            <View style={[styles.row, { gap: theme.space.sp4 }]}>
              <View
                style={{
                  width: theme.space.sp4,
                  height: theme.space.sp4,
                  borderRadius: theme.radius.rPill,
                  backgroundColor: theme.color.accentWarm,
                }}
              />
              <ThemedText variant="caption" tone="body" style={styles.grow}>
                {words.t('storage.low')}
              </ThemedText>
            </View>
          ) : null}
          {storage.packs.length === 0 ? (
            <ThemedText variant="caption" tone="dim">
              {words.t('storage.empty')}
            </ThemedText>
          ) : (
            storage.packs.map((pack) => (
              <PackRow key={pack.pack} service={service} pack={pack} onChanged={onChanged} />
            ))
          )}
        </>
      )}
    </Card>
  );
}

function PackRow({
  service,
  pack,
  onChanged,
}: {
  service: SettingsService;
  pack: StoragePack;
  onChanged: () => Promise<void>;
}) {
  const theme = useTheme();
  const words = service.words();
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  const remove = async () => {
    try {
      const outcome = await service.remove(pack.pack);
      setFailure(outcome.ok ? undefined : outcome.code);
    } catch (error) {
      setFailure(failureCodeOf(error));
    }
    setConfirming(false);
    await onChanged();
  };
  const removeLabel = words.t('common.joined', { first: words.t('common.remove'), second: pack.label });
  return (
    <View style={{ gap: theme.space.sp3 }}>
      <View style={[styles.row, { gap: theme.space.sp4 }]}>
        <ThemedText variant="label" tone="body" style={styles.grow}>
          {pack.label}
        </ThemedText>
        {confirming ? null : (
          <GlassButton
            size="sm"
            variant="quiet"
            accessibilityLabel={removeLabel}
            onPress={() => setConfirming(true)}
          >
            {words.t('common.remove')}
          </GlassButton>
        )}
      </View>
      {confirming ? (
        <View style={[styles.row, styles.wrap, { gap: theme.space.gapInline }]}>
          <GlassButton size="sm" variant="dark" onPress={() => setConfirming(false)}>
            {words.t('common.cancel')}
          </GlassButton>
          <GlassButton size="sm" accessibilityLabel={removeLabel} onPress={remove}>
            {words.t('common.remove')}
          </GlassButton>
        </View>
      ) : null}
      {failure === undefined ? null : (
        <ThemedText variant="caption" tone="body" live>
          {words.t(`failure.${failure}`)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  grow: { flex: 1, minWidth: 0 },
});
