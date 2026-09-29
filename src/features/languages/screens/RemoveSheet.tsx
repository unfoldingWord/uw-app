import { View } from 'react-native';
import type { PackId } from '@lib/domain/pack';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Sheet, ThemedText } from '@shared/ui';
import { createLanguagesService } from '../service';

export type PendingRemove = { pack: PackId; label: string };

export type RemoveSheetProps = {
  pending: PendingRemove;
  onCancel: () => void;
  onRemove: () => Promise<void>;
};

export function RemoveSheet({ pending, onCancel, onRemove }: RemoveSheetProps) {
  const languages = useService(createLanguagesService);
  const theme = useTheme();
  const words = languages.words();
  return (
    <Sheet>
      <ThemedText variant="label" tone="title" accessibilityRole="alert">
        {words.t('languages.removeConfirm', { language: pending.label })}
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: theme.space.gapInline, flexWrap: 'wrap' }}>
        <GlassButton variant="dark" onPress={onRemove}>
          {words.t('languages.remove')}
        </GlassButton>
        <GlassButton variant="glass" onPress={onCancel}>
          {words.t('common.cancel')}
        </GlassButton>
      </View>
    </Sheet>
  );
}
