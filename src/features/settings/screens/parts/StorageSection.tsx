import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { SettingsService, StoragePack, StorageView } from '../../service';
import { Card } from './Card';
import { Line } from './Line';

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
      <Line role="overline" tone="dim" accessibilityRole="header">
        {words.t('storage.title')}
      </Line>
      {storage === undefined ? (
        <Line role="caption" tone="dim" live>
          {words.t('common.busy')}
        </Line>
      ) : (
        <>
          <Line role="label" tone="title">
            {storage.summary}
          </Line>
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
              <Line role="caption" tone="body" style={styles.grow}>
                {words.t('storage.low')}
              </Line>
            </View>
          ) : null}
          {storage.packs.length === 0 ? (
            <Line role="caption" tone="dim">
              {words.t('storage.empty')}
            </Line>
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
        <Line role="label" tone="body" style={styles.grow}>
          {pack.label}
        </Line>
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
        <Line role="caption" tone="body" live>
          {words.t(`failure.${failure}`)}
        </Line>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  grow: { flex: 1, minWidth: 0 },
});
