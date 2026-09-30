import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GlassButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, EmptyState, Header, ScreenScaffold, ThemedText, useAsyncValue } from '@shared/ui';
import { createTransferService } from '../service';
import { ReceiveFlow, type TypedStart } from './parts/ReceiveFlow';
import { SendFlow } from './parts/SendFlow';

type Mode = 'choose' | 'send' | 'receive';

type LinkParams = { address?: string | string[]; code?: string | string[] };

function typedStartOf(params: LinkParams): TypedStart | undefined {
  const address = typeof params.address === 'string' ? params.address : undefined;
  const code = typeof params.code === 'string' ? params.code : undefined;
  return address === undefined || code === undefined ? undefined : { address, code };
}

export default function TransferScreen() {
  const service = useService(createTransferService);
  const theme = useTheme();
  const router = useRouter();
  const words = service.words();
  const params = useLocalSearchParams<LinkParams>();
  const [typed] = useState(() => typedStartOf(params));
  const [mode, setMode] = useState<Mode>(typed === undefined ? 'choose' : 'receive');
  const capabilities = useAsyncValue(() => service.capabilities(), []);
  const facts = capabilities.value;

  const leave = () => (router.canGoBack() ? router.back() : router.navigate('/'));

  const back = async () => {
    if (mode === 'choose') {
      leave();
      return;
    }
    await service.cancel();
    setMode('choose');
  };

  const header = (
    <Header
      back={{ label: words.t('common.back'), onPress: back }}
      overline={facts?.overline ?? words.t('transfer.overline')}
      title={mode === 'receive' ? words.t('transfer.receive.title') : words.t('transfer.title')}
    />
  );

  if (facts === undefined) {
    return <ScreenScaffold header={header} />;
  }

  if (!facts.available) {
    return (
      <ScreenScaffold header={header}>
        <EmptyState icon="navigation" title={facts.unavailable ?? facts.title} body={facts.note} />
      </ScreenScaffold>
    );
  }

  if (mode === 'send') {
    return <SendFlow service={service} app={facts.app} header={header} onDone={leave} />;
  }

  if (mode === 'receive') {
    return (
      <ReceiveFlow
        service={service}
        header={header}
        typed={typed}
        onDone={leave}
        onOpen={async (language) => {
          await service.open(language);
          router.navigate('/study');
        }}
      />
    );
  }

  return (
    <ScreenScaffold header={header}>
      <Card>
        <ThemedText variant="body" tone="title">
          {facts.note}
        </ThemedText>
        <ThemedText variant="caption" tone="dim">
          {facts.permission}
        </ThemedText>
      </Card>
      <View style={{ flexGrow: 1 }} />
      <View style={{ gap: theme.space.sp4 }}>
        <GlassButton
          variant="dark"
          size="lg"
          full
          leading={<Icon name="navigation" />}
          onPress={() => setMode('send')}
        >
          {facts.send}
        </GlassButton>
        <GlassButton variant="glass" size="lg" full onPress={() => setMode('receive')}>
          {facts.receive}
        </GlassButton>
      </View>
    </ScreenScaffold>
  );
}
