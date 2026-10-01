import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { GlassButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { backgroundImage, useTheme } from '@shared/theme';
import { Card, EmptyState, prototypeValues, ThemedText } from '@shared/ui';
import { createHomeService, type FormationCard, type ReadingCard } from '../service';

export type ContinueReadingProps = {
  card: ReadingCard | undefined;
  autonym: string;
  onOpen: () => void;
};

export function ContinueReading({ card, autonym, onOpen }: ContinueReadingProps) {
  const home = useService(createHomeService);
  const theme = useTheme();
  const words = home.words();
  const title = words.t('home.reading.title');
  if (card === undefined) {
    return <EmptyState icon="layers" title={title} body={words.t('home.reading.empty')} />;
  }
  return (
    <Card
      press={{
        accessibilityLabel: words.t('common.joined', { first: title, second: card.label }),
        onPress: onOpen,
      }}
    >
      <ThemedText variant="overline" tone="dim">
        {title}
      </ThemedText>
      <View style={[styles.line, { gap: theme.space.sp6 }]}>
        <View style={styles.grow}>
          <ThemedText variant="cardTitle" tone="title">
            {card.label}
          </ThemedText>
          <ThemedText variant="label" tone="body" weight={theme.fontWeight.fwRegular}>
            {words.t('home.reading.detail', { language: autonym })}
          </ThemedText>
        </View>
        <GlassButton variant="dark" onPress={onOpen}>
          {words.t('home.reading.action')}
        </GlassButton>
      </View>
    </Card>
  );
}

export type ContinueFormationProps = { card: FormationCard | undefined; onOpen: (href: string) => void };

const stackAbove = 2 * prototypeValues.card.tile;

export function ContinueFormation({ card, onOpen }: ContinueFormationProps) {
  const home = useService(createHomeService);
  const theme = useTheme();
  const words = home.words();
  const { fontScale, width } = useWindowDimensions();
  const [stacked, setStacked] = useState(false);
  useEffect(() => setStacked(false), [fontScale, width]);
  if (card === undefined) {
    return (
      <EmptyState
        icon="users"
        title={words.t('nav.formation')}
        body={words.t('home.formation.empty')}
        action={
          <GlassButton variant="glass" size="sm" onPress={() => onOpen('/formation')}>
            {words.t('common.open')}
          </GlassButton>
        }
      />
    );
  }
  const action = words.t('home.formation.action', { group: card.groupName });
  const measure = (event: LayoutChangeEvent) => {
    if (!stacked && event.nativeEvent.layout.height > stackAbove) {
      setStacked(true);
    }
  };
  const tile = (
    <View
      style={[
        styles.tile,
        {
          width: prototypeValues.card.tile,
          minHeight: prototypeValues.card.tile,
          padding: theme.space.sp3,
          borderRadius: theme.radius.rLg,
          overflow: 'hidden',
        },
        backgroundImage(prototypeValues.sessionTile),
      ]}
    >
      <ThemedText variant="overline" tone="onImage" align="center">
        {card.position.track === 'foundations'
          ? words.t('home.formation.story', { number: card.position.session })
          : String(card.position.session)}
      </ThemedText>
    </View>
  );
  const text = (
    <View style={stacked ? undefined : styles.grow} onLayout={measure}>
      <ThemedText variant="overline" tone="dim">
        {words.t('home.formation.title', { group: card.groupName })}
      </ThemedText>
      <ThemedText variant="time" tone="title">
        {card.title}
      </ThemedText>
      {card.next === undefined ? null : (
        <ThemedText variant="label" tone="body" weight={theme.fontWeight.fwRegular}>
          {card.next}
        </ThemedText>
      )}
    </View>
  );
  const chevron = (
    <View
      style={[
        styles.tile,
        {
          width: prototypeValues.control,
          height: prototypeValues.control,
          borderRadius: theme.radius.rPill,
          backgroundColor: theme.color.surfaceInverse,
          marginEnd: theme.space.sp4,
        },
      ]}
    >
      <Icon name="chevronRight" color={theme.color.textOnInverse} />
    </View>
  );
  return (
    <Card
      padding="tight"
      press={{
        accessibilityLabel: words.t('common.joined', { first: action, second: card.title }),
        onPress: () => onOpen(card.href),
      }}
    >
      {stacked ? (
        <View style={{ gap: theme.space.sp6 }}>
          <View style={[styles.line, styles.apart]}>
            {tile}
            {chevron}
          </View>
          {text}
        </View>
      ) : (
        <View style={[styles.line, { gap: theme.space.sp7 }]}>
          {tile}
          {text}
          {chevron}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  apart: { justifyContent: 'space-between' },
});
