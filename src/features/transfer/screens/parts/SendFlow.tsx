import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Card, EmptyState, Notice, ScreenScaffold, SectionTitle, ThemedText } from '@shared/ui';
import type { AppPackageView, OfferView, ResourceChoice, TransferService } from '../../service';
import { AddressCard } from './AddressCard';
import { PickRow } from './PickRow';
import { ProgressCard } from './Progress';
import { useStatus } from './useStatus';

type Offered = Extract<OfferView, { ok: true }>;

type Stage =
  | { readonly kind: 'select' }
  | { readonly kind: 'running'; readonly offer: Offered }
  | { readonly kind: 'sent'; readonly messages: readonly string[] }
  | { readonly kind: 'failed'; readonly message: string };

const keyOf = (item: Pick<ResourceChoice, 'publisher' | 'resource'>): string =>
  `${item.publisher}/${item.resource}`;

export type SendFlowProps = {
  service: TransferService;
  app: AppPackageView;
  header: ReactNode;
  onDone: () => void;
};

function AppChoice({
  service,
  app,
  on,
  onToggle,
}: {
  service: TransferService;
  app: AppPackageView;
  on: boolean;
  onToggle: () => void;
}) {
  if (app.state !== 'available') {
    return <Notice tone="progress" text={app.reason} />;
  }
  const words = service.words();
  return (
    <PickRow
      title={app.label}
      detail={words.t('common.joined', { first: app.size, second: app.about })}
      label={words.t('common.joined', { first: app.label, second: app.size })}
      on={on}
      onToggle={onToggle}
    />
  );
}

export function SendFlow({ service, app, header, onDone }: SendFlowProps) {
  const theme = useTheme();
  const words = service.words();
  const choices = service.choices();
  const resources = choices.state === 'choices' ? choices.resources : [];
  const language = choices.state === 'choices' ? choices.language : undefined;
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(resources.map(keyOf)));
  const [withApp, setWithApp] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'select' });
  const status = useStatus(service, stage.kind === 'running');

  const chosen = resources.filter((item) => picked.has(keyOf(item)));
  const appBytes = withApp && app.state === 'available' ? app.bytes : 0;
  const summary = service.summary(language, chosen, appBytes);
  const empty = chosen.length === 0 && appBytes === 0;

  const toggle = (item: ResourceChoice) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(keyOf(item))) {
        next.delete(keyOf(item));
      } else {
        next.add(keyOf(item));
      }
      return next;
    });

  const start = async () => {
    setStage({ kind: 'select' });
    const offer = await service.offer({
      ...(language === undefined || chosen.length === 0 ? {} : { language }),
      resources: chosen.map(({ publisher, resource }) => ({ publisher, resource })),
      app: appBytes > 0,
    });
    if (!offer.ok) {
      setStage({ kind: 'failed', message: offer.message });
      return;
    }
    setStage({ kind: 'running', offer });
    const sent = await service.send(offer);
    setStage(sent.ok ? { kind: 'sent', messages: sent.messages } : { kind: 'failed', message: sent.message });
  };

  if (stage.kind === 'running') {
    return (
      <ScreenScaffold header={header}>
        <ProgressCard
          status={status}
          waiting={stage.offer.waiting}
          stop={stage.offer.stop}
          onStop={() => service.cancel()}
          code={{ label: stage.offer.codeLabel, hint: stage.offer.hint }}
        />
        {stage.offer.fallback === undefined ||
        (status !== undefined && status.state !== 'advertising') ? null : (
          <AddressCard fallback={stage.offer.fallback} />
        )}
      </ScreenScaffold>
    );
  }

  if (stage.kind === 'sent') {
    return (
      <ScreenScaffold header={header}>
        <Card>
          {stage.messages.map((message) => (
            <ThemedText key={message} variant="body" tone="title" accessibilityLiveRegion="polite">
              {message}
            </ThemedText>
          ))}
          <GlassButton variant="dark" full onPress={onDone}>
            {words.t('common.done')}
          </GlassButton>
        </Card>
      </ScreenScaffold>
    );
  }

  const sendable = choices.state === 'choices' || app.state === 'available';

  return (
    <ScreenScaffold
      header={header}
      clearance={sendable ? 'footer' : 'none'}
      footer={
        sendable ? (
          <View style={{ gap: theme.space.sp4 }}>
            {stage.kind === 'failed' ? <Notice text={stage.message} /> : null}
            <GlassButton variant="dark" size="lg" full disabled={empty} onPress={start}>
              {stage.kind === 'failed' ? words.t('common.retry') : words.t('transfer.find')}
            </GlassButton>
          </View>
        ) : undefined
      }
    >
      {choices.state === 'nothing' ? (
        <EmptyState icon="globe" title={choices.message} />
      ) : (
        <>
          <SectionTitle>{choices.heading}</SectionTitle>
          {resources.map((item) => (
            <PickRow
              key={keyOf(item)}
              title={item.title}
              detail={item.size}
              label={item.label}
              on={picked.has(keyOf(item))}
              onToggle={() => toggle(item)}
            />
          ))}
        </>
      )}
      <AppChoice
        service={service}
        app={app}
        on={withApp}
        onToggle={() => setWithApp((current) => !current)}
      />
      <Card level={2} shadow="rest">
        <ThemedText variant="label" tone="title" weight={theme.fontWeight.fwSemibold}>
          {summary.label}
        </ThemedText>
        <ThemedText variant="caption" tone="body">
          {words.t('transfer.note')}
        </ThemedText>
      </Card>
    </ScreenScaffold>
  );
}
