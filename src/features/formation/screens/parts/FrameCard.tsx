import { StyleSheet, View } from 'react-native';
import { GlassSurface } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { ThemedText } from '@shared/ui';
import type { Frame, FormationWords } from '../../service';
import { PictureWell } from './PictureWell';

export type FrameCardProps = {
  words: FormationWords;
  title: string;
  frames: readonly Frame[];
  index: number;
  pictureOf: (frame: Frame) => string | undefined;
};

export function FrameCard({ words, title, frames, index, pictureOf }: FrameCardProps) {
  const theme = useTheme();
  const frame = frames[index];
  const number = frame?.number ?? index + 1;
  const position = words.t('session.frame', { number: index + 1, total: frames.length });
  const picture = frame === undefined ? undefined : pictureOf(frame);
  return (
    <GlassSurface
      level={2}
      blur="strong"
      shadow="card"
      style={{ padding: theme.space.sp5, gap: theme.space.sp4 }}
    >
      <PictureWell
        tall
        label={words.t('session.frame.picture', { number })}
        {...(picture === undefined ? {} : { uri: picture })}
      >
        <ThemedText variant="overline" tone="onImage">
          {position}
        </ThemedText>
        <ThemedText variant="cardTitle" tone="onImage">
          {title}
        </ThemedText>
      </PictureWell>
      <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: theme.space.sp4 }}>
        <ThemedText variant="body" tone="title">
          {frame?.text ?? ''}
        </ThemedText>
      </View>
      {frame !== undefined && frame.image === undefined ? (
        <ThemedText variant="caption" tone="dim" style={{ paddingHorizontal: theme.space.sp4 }}>
          {words.t('session.picturesMissing')}
        </ThemedText>
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.dots, { gap: theme.space.sp2, paddingVertical: theme.space.sp3 }]}
      >
        {frames.map((item, dot) => (
          <View
            key={item.number}
            style={{
              width: dot === index ? theme.space.sp9 : theme.space.sp3,
              height: theme.space.sp2,
              borderRadius: theme.radius.rPill,
              backgroundColor: dot <= index ? theme.color.accentBlue : theme.color.dotRingStroke,
            }}
          />
        ))}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
});
