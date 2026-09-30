import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';
import { GlassButton, GlassInput, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, ListRow, Screen, ThemedText, Toggle } from '@shared/ui';
import {
  createSettingsService,
  type FullTextState,
  type SettingsEntry,
  type SettingsEntryId,
  type SettingsService,
  type StorageView,
  type ThemeChoice,
} from '../service';
import { Choice } from './parts/Choice';
import { StorageSection } from './parts/StorageSection';
import { useLoad } from './parts/useLoad';

type Overview = {
  readonly entries: readonly SettingsEntry[];
  readonly fullText: FullTextState;
  readonly storage: StorageView;
};

async function overviewOf(service: SettingsService): Promise<Overview> {
  const [entries, fullText, storage] = await Promise.all([
    service.entries(),
    service.fullText(),
    service.storage(),
  ]);
  return { entries, fullText, storage };
}

const themeChoices: readonly ThemeChoice[] = ['system', 'light', 'dark'];

function entryOf(entries: readonly SettingsEntry[], id: SettingsEntryId): SettingsEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

export default function SettingsScreen() {
  const service = useService(createSettingsService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const load = useCallback(() => overviewOf(service), [service]);
  const overview = useLoad(load);
  const entries = overview.value?.entries ?? [];
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() => service.theme());
  const [name, setName] = useState(() => service.name() ?? '');
  const [nameState, setNameState] = useState<'idle' | 'saved' | FailureCode>('idle');
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  const [, setRevision] = useState(0);
  const locales = service.locales();
  const current = locales.find((choice) => choice.selected);

  const attempt = async (work: () => Promise<boolean>) => {
    try {
      setFailure((await work()) ? undefined : 'unexpected');
    } catch (error) {
      setFailure(failureCodeOf(error));
    }
  };

  const saveName = async () => {
    try {
      setNameState((await service.setName(name.trim())) ? 'saved' : 'unexpected');
    } catch (error) {
      setNameState(failureCodeOf(error));
    }
  };

  const themeLabel = (choice: ThemeChoice) =>
    choice === 'system'
      ? words.t('common.theme.system')
      : choice === 'light'
        ? words.t('common.theme.light')
        : words.t('common.theme.dark');

  const fullText = overview.value?.fullText;
  const appLanguage = entryOf(entries, 'appLanguage');
  const themeEntry = entryOf(entries, 'theme');
  const blur = entryOf(entries, 'reducedBlur');
  const motion = entryOf(entries, 'reducedMotion');
  const firstName = entryOf(entries, 'firstName');
  const fullTextEntry = entryOf(entries, 'fullText');
  const links: readonly { id: SettingsEntryId; href: '/licence' | '/about' | '/privacy' }[] = [
    { id: 'licence', href: '/licence' },
    { id: 'about', href: '/about' },
    { id: 'privacy', href: '/privacy' },
  ];

  return (
    <Screen
      dense
      title={words.t('settings.title')}
      back={{ label: words.t('common.back'), onPress: () => router.back() }}
    >
      {failure === undefined ? null : (
        <ThemedText variant="caption" tone="body" live>
          {words.t(`failure.${failure}`)}
        </ThemedText>
      )}
      <ListRow
        title={words.t('settings.appLanguage')}
        detail={appLanguage?.about ?? words.t('settings.appLanguage.about')}
        selected={languagesOpen}
        trailing={
          <View style={[styles.value, { gap: theme.space.sp3 }]}>
            <ThemedText variant="label" tone="dim">
              {current?.name ?? ''}
            </ThemedText>
            <Icon name="chevronDown" size={theme.space.sp8} />
          </View>
        }
        onPress={() => setLanguagesOpen((open) => !open)}
      />
      {languagesOpen ? (
        <Card level={1} style={{ gap: theme.space.sp3 }}>
          {locales.map((choice) => (
            <Choice
              key={choice.locale}
              label={choice.name}
              direction={choice.direction}
              {...(choice.complete ? {} : { detail: words.t('settings.appLanguage.partial') })}
              selected={choice.selected}
              onPress={async () => {
                await attempt(() => service.setLocale(choice.locale));
                setRevision((revision) => revision + 1);
                await overview.reload();
              }}
            />
          ))}
          <ThemedText variant="caption" tone="dim">
            {words.t('settings.appLanguage.direction')}
          </ThemedText>
        </Card>
      ) : null}
      <Card level={1}>
        <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold}>
          {words.t('settings.theme')}
        </ThemedText>
        <ThemedText variant="caption" tone="body">
          {themeEntry?.about ?? words.t('settings.theme.about')}
        </ThemedText>
        <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: theme.space.gapInline }]}>
          {themeChoices.map((choice) => (
            <Choice
              key={choice}
              label={themeLabel(choice)}
              selected={themeChoice === choice}
              onPress={async () => {
                setThemeChoice(choice);
                await attempt(() => service.setTheme(choice));
              }}
            />
          ))}
        </View>
      </Card>
      <Card level={1}>
        <View style={[styles.value, { gap: theme.space.sp6 }]}>
          <View style={styles.grow}>
            <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold}>
              {words.t('settings.reducedBlur')}
            </ThemedText>
            <ThemedText variant="caption" tone="body">
              {blur?.about ?? words.t('settings.reducedBlur.about')}
            </ThemedText>
          </View>
          <Toggle
            label={words.t('settings.reducedBlur')}
            on={theme.reducedBlur}
            onChange={(on) => attempt(() => service.setReducedBlur(on))}
          />
        </View>
        <View style={[styles.value, { gap: theme.space.sp6 }]}>
          <View style={styles.grow}>
            <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold}>
              {words.t('settings.reducedMotion')}
            </ThemedText>
            <ThemedText variant="caption" tone="body">
              {motion?.about ?? words.t('settings.reducedMotion.about')}
            </ThemedText>
          </View>
          <Toggle
            label={words.t('settings.reducedMotion')}
            on={theme.reducedMotion}
            onChange={(on) => attempt(() => service.setReducedMotion(on))}
          />
        </View>
      </Card>
      <Card level={1}>
        <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold}>
          {words.t('settings.firstName')}
        </ThemedText>
        <ThemedText variant="caption" tone="body">
          {firstName?.about ?? words.t('settings.firstName.about')}
        </ThemedText>
        <GlassInput
          accessibilityLabel={words.t('settings.firstName')}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setNameState('idle');
          }}
          autoComplete="off"
          autoCorrect={false}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => void saveName()}
        />
        <View style={[styles.value, { gap: theme.space.sp6 }]}>
          <GlassButton size="sm" variant="dark" onPress={saveName}>
            {words.t('common.save')}
          </GlassButton>
          {nameState === 'idle' ? null : (
            <ThemedText variant="caption" tone="dim" live style={styles.grow}>
              {nameState === 'saved' ? words.t('common.done') : words.t(`failure.${nameState}`)}
            </ThemedText>
          )}
        </View>
      </Card>
      <Card level={1}>
        <View style={[styles.value, { gap: theme.space.sp6 }]}>
          <View style={styles.grow}>
            <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold}>
              {words.t('settings.fullText')}
            </ThemedText>
            <ThemedText variant="caption" tone="body">
              {fullText?.about ?? fullTextEntry?.about ?? words.t('common.busy')}
            </ThemedText>
          </View>
          <Toggle
            label={words.t('settings.fullText')}
            hint={fullText?.about}
            on={fullText?.on ?? false}
            disabled={fullText === undefined}
            onChange={async (on) => {
              try {
                await service.setFullText(on);
                setFailure(undefined);
              } catch (error) {
                setFailure(failureCodeOf(error));
              }
              await overview.reload();
            }}
          />
        </View>
      </Card>
      <StorageSection service={service} storage={overview.value?.storage} onChanged={overview.reload} />
      {links.map((link) => {
        const entry = entryOf(entries, link.id);
        return entry === undefined ? null : (
          <ListRow
            key={link.id}
            title={entry.title}
            detail={entry.about}
            onPress={() => router.push(link.href)}
          />
        );
      })}
      <ListRow
        title={words.t('settings.diagnostics')}
        detail={words.t('settings.diagnostics.about')}
        onPress={() => router.push('/diagnostics')}
      />
      <ThemedText
        variant="caption"
        tone="faint"
        style={{ paddingHorizontal: theme.space.sp2, paddingTop: theme.space.sp6 }}
      >
        {service.footer()}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  grow: { flex: 1, minWidth: 0 },
});
