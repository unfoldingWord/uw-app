import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { FailureCode } from '@lib/domain/failures';
import { View } from 'react-native';
import { GlassButton, GlassIconButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import {
  Header,
  IconAction,
  Notice,
  prototypeValues,
  ScreenScaffold,
  ThemedText,
  useAsyncValue,
  useChanges,
} from '@shared/ui';
import { createHomeService } from '../service';
import { ContinueFormation, ContinueReading } from './ContinueCards';
import { DownloadCard } from './DownloadCard';
import { InvitationCard } from './InvitationCard';
import { SavedList } from './SavedList';
import { WhatsNew } from './WhatsNew';

const pollMs = 1000;

function localNow(): { at: number; utcOffsetMinutes: number } {
  const at = Date.now();
  return { at, utcOffsetMinutes: -new Date(at).getTimezoneOffset() };
}

export default function HomeScreen() {
  const home = useService(createHomeService);
  const theme = useTheme();
  const router = useRouter();
  const changes = useChanges(home.onChange);
  const [focus, setFocus] = useState(0);
  useFocusEffect(useCallback(() => setFocus((current) => current + 1), []));
  const words = home.words();
  const header = home.header();
  const now = localNow();
  const greeting = home.greeting(now);
  const [completing, setCompleting] = useState(false);
  const [themeFailure, setThemeFailure] = useState<FailureCode | undefined>(undefined);
  const failed = (code: FailureCode | undefined) =>
    code === undefined ? null : <Notice text={words.t(`failure.${code}`)} />;
  const download = useAsyncValue(() => home.download(), [changes, focus], {
    pollMs: (view) => (view.state === 'installing' || completing ? pollMs : undefined),
  });
  const formation = useAsyncValue(
    () => home.continueFormation().then((card) => ({ card })),
    [changes, focus],
  );
  const checked = useAsyncValue(() => home.checkForUpdates(), []);
  useAsyncValue(() => home.refreshStories(), [focus]);
  const updates = useAsyncValue(
    () => home.whatsNew(),
    [changes, focus, download.value?.state, checked.value],
  );
  const openLanguages = () => router.push('/languages');

  return (
    <ScreenScaffold
      clearance="tabs"
      header={
        <Header
          leading={
            header.language === undefined ? null : (
              <GlassButton
                variant="glass"
                accessibilityLabel={header.language.label}
                leading={<Icon name="globe" size={theme.fontSize.fsBody} />}
                trailing={<Icon name="chevronDown" size={theme.fontSize.fsLabel} />}
                onPress={openLanguages}
              >
                <ThemedText variant="label" tone="title" numberOfLines={1}>
                  {header.language.autonym}
                </ThemedText>
              </GlassButton>
            )
          }
          trailing={
            <>
              <IconAction
                icon="settings"
                label={words.t('common.settings')}
                onPress={() => router.push('/settings')}
              />
              <GlassIconButton
                size={prototypeValues.control}
                label={words.t('common.theme.toggle')}
                onPress={async () => {
                  const outcome = await home.toggleTheme(theme.scheme);
                  setThemeFailure(outcome.ok ? undefined : outcome.code);
                }}
              >
                <Icon name={theme.scheme === 'dark' ? 'sun' : 'moon'} />
              </GlassIconButton>
            </>
          }
        />
      }
    >
      {failed(themeFailure)}
      <View style={{ paddingTop: prototypeValues.greetingTop, paddingBottom: theme.space.sp9 }}>
        <ThemedText variant="caption" tone="dim">
          {greeting.date}
        </ThemedText>
        <ThemedText variant="hero" tone="title" accessibilityRole="header">
          {greeting.text}
        </ThemedText>
      </View>
      {failed(download.failure)}
      {download.value === undefined ? null : (
        <DownloadCard
          view={download.value}
          autonym={header.language?.autonym ?? ''}
          onOpenLanguages={openLanguages}
          onComplete={async () => {
            setCompleting(true);
            download.reload();
            const outcome = await home.completeDownload();
            setCompleting(false);
            download.reload();
            return outcome === undefined || outcome.ok ? undefined : outcome.code;
          }}
        />
      )}
      <ContinueReading
        card={home.continueReading()}
        autonym={header.language?.autonym ?? ''}
        onOpen={() => router.push('/study')}
      />
      {failed(formation.failure)}
      {formation.value === undefined ? null : (
        <ContinueFormation card={formation.value.card} onOpen={(href) => router.push(href)} />
      )}
      <InvitationCard />
      {failed(updates.failure ?? checked.failure)}
      {updates.value === undefined ? null : <WhatsNew items={updates.value} onUpdated={download.reload} />}
      <SavedList items={home.saved()} onOpen={(item) => router.push(item.href)} />
    </ScreenScaffold>
  );
}
