import { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { backgroundImage, useTheme } from '@shared/theme';
import { Card, prototypeValues, ThemedText, type TextTone } from '@shared/ui';
import { createHomeService } from '../service';

function ButtonLabel({ tone, children }: { tone: TextTone; children: string }) {
  const theme = useTheme();
  return (
    <ThemedText variant="label" tone={tone} family="brand" weight={theme.fontWeight.fwSemibold}>
      {children}
    </ThemedText>
  );
}

export function InvitationCard() {
  const home = useService(createHomeService);
  const theme = useTheme();
  const [at] = useState(() => Date.now());
  const [version, setVersion] = useState(0);
  const invitation = home.invitation(at);
  const due = invitation.state === 'due';
  const shown = due && invitation.shown;

  useEffect(() => {
    if (due && !shown) {
      void home.invitationShown(at).then(() => setVersion((current) => current + 1));
    }
  }, [home, at, due, shown, version]);

  if (invitation.state !== 'due') {
    return null;
  }
  const { story, words, give, image } = invitation;
  const [excerpt] = story.body;

  return (
    <Card padding="tight">
      <View
        style={[
          styles.well,
          {
            minHeight: prototypeValues.card.well,
            padding: theme.space.sp8,
            borderRadius: theme.radius.rLg,
            backgroundColor: theme.color.surfaceNight,
            ...backgroundImage(prototypeValues.storyWell),
          },
        ]}
      >
        {image === undefined ? null : (
          <>
            <Image
              source={{ uri: image }}
              resizeMode="cover"
              accessible
              accessibilityRole="image"
              accessibilityLabel={story.title}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, backgroundImage(prototypeValues.imageProtection)]}
            />
          </>
        )}
        <ThemedText variant="overline" tone="onImage" family="brand">
          {words.overline}
        </ThemedText>
        <ThemedText
          variant="cardTitle"
          tone="onImage"
          family="brand"
          weight={prototypeValues.brandHeadingWeight}
          accessibilityRole="header"
        >
          {story.title}
        </ThemedText>
      </View>
      <View style={{ paddingHorizontal: theme.space.sp4, gap: theme.space.sp5 }}>
        {excerpt === undefined ? null : (
          <ThemedText variant="label" tone="body" family="brand" weight={theme.fontWeight.fwRegular}>
            {excerpt}
          </ThemedText>
        )}
        <ThemedText variant="caption" tone="dim" family="brand">
          {words.securityNote}
        </ThemedText>
        <GlassButton
          variant="quiet"
          size="sm"
          accessibilityLabel={words.readMore}
          accessibilityHint={words.opensBrowser}
          onPress={() => Linking.openURL(story.link)}
        >
          <ButtonLabel tone="link">{words.readMore}</ButtonLabel>
        </GlassButton>
        <ThemedText variant="label" tone="title" family="brand" weight={theme.fontWeight.fwRegular}>
          {words.body}
        </ThemedText>
      </View>
      <View style={[styles.actions, { gap: theme.space.gapInline, padding: theme.space.sp4 }]}>
        <GlassButton
          variant="dark"
          style={styles.grow}
          full
          accessibilityLabel={words.action}
          accessibilityHint={words.opensBrowser}
          onPress={async () => {
            await home.tapInvitation();
            setVersion((current) => current + 1);
            await Linking.openURL(give);
          }}
        >
          <ButtonLabel tone="inverse">{words.action}</ButtonLabel>
        </GlassButton>
        <GlassButton
          variant="quiet"
          accessibilityLabel={words.dismiss}
          onPress={async () => {
            await home.dismissInvitation();
            setVersion((current) => current + 1);
          }}
        >
          <ButtonLabel tone="dim">{words.dismiss}</ButtonLabel>
        </GlassButton>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  well: { justifyContent: 'flex-end', overflow: 'hidden' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  grow: { flexGrow: 1 },
});
