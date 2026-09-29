import { StyleSheet, View } from 'react-native';
import { GlassSurface } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { Frame, FormationWords } from '../../service';
import { Line } from './Line';
import { PictureWell } from './PictureWell';

export type FrameCardProps = {
  words: FormationWords;
  title: string;
  frames: readonly Frame[];
  index: number;
};

export function FrameCard({ words, title, frames, index }: FrameCardProps) {
  const theme = useTheme();
  const frame = frames[index];
  const number = frame?.number ?? index + 1;
  const position = words.t('session.frame', { number: index + 1, total: frames.length });
  return (
    <GlassSurface
      level={2}
      blur="strong"
      shadow="card"
      style={{ padding: theme.space.sp5, gap: theme.space.sp4 }}
    >
      <PictureWell tall label={words.t('session.frame.picture', { number })}>
        <Line role="overline" tone="onImage">
          {position}
        </Line>
        <Line role="cardTitle" tone="onImage">
          {title}
        </Line>
      </PictureWell>
      <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: theme.space.sp4 }}>
        <Line role="body" tone="title">
          {frame?.text ?? ''}
        </Line>
      </View>
      {frame !== undefined && frame.image === undefined ? (
        <Line role="caption" tone="dim" style={{ paddingHorizontal: theme.space.sp4 }}>
          {words.t('session.picturesMissing')}
        </Line>
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
