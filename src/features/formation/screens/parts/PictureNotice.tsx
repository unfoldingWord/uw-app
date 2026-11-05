import { useState } from 'react';
import { View } from 'react-native';
import type { FailureCode } from '@lib/domain/failures';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { ThemedText } from '@shared/ui';
import type { FormationService, Frame, Pictures } from '../../service';

export type PictureNoticeProps = {
  service: FormationService;
  frame: Frame | undefined;
  pictures: Pictures;
  onInstalled: () => Promise<void>;
};

export function PictureNotice({ service, frame, pictures, onInstalled }: PictureNoticeProps) {
  const theme = useTheme();
  const words = service.words();
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  if (frame === undefined || frame.imageName === undefined || service.picture(frame) !== undefined) {
    return null;
  }
  const download = async () => {
    const outcome = await service.downloadPictures();
    setFailure(outcome.ok ? undefined : outcome.code);
    if (outcome.ok) {
      await onInstalled();
    }
  };
  return (
    <View style={{ gap: theme.space.sp4, alignItems: 'flex-start', paddingBottom: theme.space.sp4 }}>
      <ThemedText variant="caption" tone="onImage" live>
        {pictures === 'on-phone' ? words.t('session.pictures.notFound') : words.t('session.picturesMissing')}
      </ThemedText>
      {pictures === 'offered' ? (
        <GlassButton size="sm" onPress={download}>
          {words.t('session.pictures.download')}
        </GlassButton>
      ) : null}
      {failure === undefined ? null : (
        <ThemedText variant="caption" tone="onImage" live>
          {words.t(`failure.${failure}`)}
        </ThemedText>
      )}
    </View>
  );
}
