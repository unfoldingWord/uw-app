import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Header, Notice, ScreenScaffold, Sheet, ThemedText, useAsyncValue } from '@shared/ui';
import { createShareService, type ShareDone, type ShareTarget } from '../service';

type Params = { kind?: string; ref?: string; number?: string; text?: string };

type Pressed = 'text' | 'audio';

type TextChoice = NonNullable<Extract<ShareTarget, { kind: 'passage' }>['text']>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function textOf(value: string | undefined): TextChoice | undefined {
  return value === 'literal' || value === 'simplified' ? value : undefined;
}

function targetOf(params: Params): ShareTarget | undefined {
  const kind = single(params.kind);
  const reference = single(params.ref);
  if (kind === 'story') {
    const number = Number(single(params.number) ?? reference);
    return Number.isSafeInteger(number) && number > 0 ? { kind: 'story', number } : undefined;
  }
  if (kind === 'passage' && reference !== undefined && reference.length > 0) {
    const text = textOf(single(params.text));
    return text === undefined ? { kind: 'passage', reference } : { kind: 'passage', reference, text };
  }
  return undefined;
}

export default function ShareScreen() {
  const service = useService(createShareService);
  const theme = useTheme();
  const router = useRouter();
  const words = service.words();
  const params = useLocalSearchParams<Params>();
  const target = targetOf(params);
  const [failed, setFailed] = useState<{ on: Pressed; message: string } | undefined>(undefined);
  const menu = useAsyncValue(
    () => (target === undefined ? Promise.resolve(undefined) : service.menu(target)),
    [target?.kind, target?.kind === 'story' ? target.number : target?.reference],
  );

  const close = () => (router.canGoBack() ? router.back() : router.navigate('/'));

  const finish = (on: Pressed, done: ShareDone) => {
    if (done.state === 'shared') {
      close();
      return;
    }
    if (done.state === 'failed') {
      setFailed({ on, message: done.message });
      return;
    }
    if (done.state === 'dismissed') {
      setFailed(undefined);
      return;
    }
    setFailed({ on, message: words.t('failure.files.not-found') });
  };

  const asText = async () => {
    setFailed(undefined);
    if (target === undefined) {
      return;
    }
    finish(
      'text',
      target.kind === 'story'
        ? await service.story(target.number)
        : await service.passage(target.reference, target.text),
    );
  };

  const asAudio = async () => {
    setFailed(undefined);
    if (target?.kind !== 'passage') {
      return;
    }
    finish('audio', await service.audio(target.reference));
  };

  const header = <Header back={{ label: words.t('common.close'), onPress: close }} />;
  const ready = menu.value?.state === 'ready' ? menu.value : undefined;

  return (
    <ScreenScaffold header={header} scroll={false}>
      <View style={{ flexGrow: 1 }} />
      {menu.value === undefined && target !== undefined && menu.failure === undefined ? null : ready ===
        undefined ? (
        <Sheet>
          <Notice text={words.t(`failure.${menu.failure ?? 'files.not-found'}`)} />
          <GlassButton variant="glass" full onPress={close}>
            {words.t('common.close')}
          </GlassButton>
        </Sheet>
      ) : (
        <Sheet accessibilityLabel={ready.title}>
          <ThemedText variant="overline" tone="dim" accessibilityRole="header">
            {ready.title}
          </ThemedText>
          <ThemedText variant="cardTitle" tone="title">
            {ready.subject}
          </ThemedText>
          <View style={{ gap: theme.space.sp4 }}>
            <GlassButton variant="dark" size="lg" full onPress={asText}>
              {ready.asText}
            </GlassButton>
            {failed?.on === 'text' ? <Notice text={failed.message} /> : null}
            {ready.asAudio === undefined ? null : (
              <GlassButton variant="glass" size="lg" full onPress={asAudio}>
                {ready.asAudio}
              </GlassButton>
            )}
            {failed?.on === 'audio' ? <Notice text={failed.message} /> : null}
            {ready.noAudio === undefined ? null : (
              <ThemedText variant="caption" tone="dim" align="center">
                {ready.noAudio}
              </ThemedText>
            )}
          </View>
          <ThemedText variant="caption" tone="faint" align="center">
            {ready.note}
          </ThemedText>
        </Sheet>
      )}
    </ScreenScaffold>
  );
}
