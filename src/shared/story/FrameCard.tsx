import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassSurface } from '@shared/glass';
import { contentText, useTheme, type Direction } from '@shared/theme';
import { ThemedText } from '@shared/ui';
import { PictureWell } from './PictureWell';

export type FrameCardProps = {
  title: string;
  position: string;
  text: string;
  language: string;
  direction: Direction;
  pictureLabel: string;
  picture: string | undefined;
  count: number;
  index: number;
  inWell?: ReactNode;
  children?: ReactNode;
};

export function FrameCard({
  title,
  position,
  text,
  language,
  direction,
  pictureLabel,
  picture,
  count,
  index,
  inWell,
  children,
}: FrameCardProps) {
  const theme = useTheme();
  const textStyle = contentText(theme, theme.text.body, { language, sample: text, direction });
  return (
    <GlassSurface
      level={2}
      blur="strong"
      shadow="card"
      style={{ padding: theme.space.sp5, gap: theme.space.sp4 }}
    >
      <PictureWell tall label={pictureLabel} {...(picture === undefined ? {} : { uri: picture })}>
        {inWell}
        <ThemedText variant="overline" tone="onImage">
          {position}
        </ThemedText>
        <ThemedText variant="cardTitle" tone="onImage">
          {title}
        </ThemedText>
      </PictureWell>
      <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: theme.space.sp4 }}>
        <ThemedText variant="body" tone="title" selectable style={textStyle}>
          {text}
        </ThemedText>
      </View>
      {children}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.dots, { gap: theme.space.sp2, paddingVertical: theme.space.sp3 }]}
      >
        {Array.from({ length: count }, (_, dot) => (
          <View
            key={dot}
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
