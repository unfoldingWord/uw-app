import { useRouter } from 'expo-router';
import { useState } from 'react';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Card, Header, Notice, ScreenScaffold, ThemedText } from '@shared/ui';
import { createDiagnosticsService } from '../service';

export default function DiagnosticsScreen() {
  const service = useService(createDiagnosticsService);
  const router = useRouter();
  const words = service.words();
  const view = service.view();
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const leave = () => (router.canGoBack() ? router.back() : router.navigate('/settings'));

  const share = async () => {
    setFailure(undefined);
    const done = await service.share();
    if (done.state === 'failed') {
      setFailure(done.message);
      return;
    }
    if (done.state === 'shared') {
      leave();
    }
  };

  return (
    <ScreenScaffold
      header={<Header back={{ label: words.t('common.back'), onPress: leave }} title={view.title} />}
    >
      <Card>
        <ThemedText variant="body" tone="title">
          {view.body}
        </ThemedText>
        <GlassButton variant="dark" size="lg" full onPress={share}>
          {view.action}
        </GlassButton>
        {failure === undefined ? null : <Notice text={failure} />}
      </Card>
    </ScreenScaffold>
  );
}
