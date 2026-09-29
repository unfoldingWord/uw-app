import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { failureCodeOf } from '@lib/domain/failures';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Card, Notice, Row, ScreenScaffold, ThemedText } from '@shared/ui';
import type { IncomingView, PeerView, ReceiveResult, ResourceChoice, TransferService } from '../../service';
import { PickRow } from './PickRow';
import { ProgressCard } from './Progress';
import { useStatus } from './useStatus';

type Incoming = Extract<IncomingView, { ok: true }>;

type Received = Extract<ReceiveResult, { ok: true }>;

type Stage =
  | { readonly kind: 'looking'; readonly peers: readonly PeerView[] | undefined }
  | { readonly kind: 'incoming'; readonly offer: Incoming }
  | { readonly kind: 'receiving'; readonly offer: Incoming }
  | { readonly kind: 'received'; readonly result: Received }
  | { readonly kind: 'failed'; readonly message: string };

function failureStage(service: TransferService, error: unknown): Stage {
  return { kind: 'failed', message: service.words().t(`failure.${failureCodeOf(error)}`) };
}

const keyOf = (item: Pick<ResourceChoice, 'publisher' | 'resource'>): string =>
  `${item.publisher}/${item.resource}`;

export type ReceiveFlowProps = {
  service: TransferService;
  header: ReactNode;
  onOpen: (language: string) => Promise<void>;
  onDone: () => void;
};

function OfferChoices({
  service,
  offer,
  onAccept,
  onDecline,
}: {
  service: TransferService;
  offer: Incoming;
  onAccept: (resources: readonly ResourceChoice[], app: boolean) => Promise<void>;
  onDecline: () => Promise<void>;
}) {
  const theme = useTheme();
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(offer.resources.map(keyOf)));
  const [withApp, setWithApp] = useState(offer.app !== undefined);
  const chosen = offer.resources.filter((item) => picked.has(keyOf(item)));
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
  return (
    <>
      <Card>
        <ThemedText variant="cardTitle" tone="title" accessibilityRole="header">
          {offer.title}
        </ThemedText>
        <ThemedText variant="caption" tone="body">
          {offer.size}
        </ThemedText>
      </Card>
      {offer.resources.map((item) => (
        <PickRow
          key={keyOf(item)}
          title={item.title}
          detail={item.size}
          label={item.label}
          on={picked.has(keyOf(item))}
          onToggle={() => toggle(item)}
        />
      ))}
      {offer.app === undefined ? null : (
        <PickRow
          title={offer.app.label}
          detail={offer.app.size}
          label={service.words().t('common.joined', { first: offer.app.label, second: offer.app.size })}
          on={withApp}
          onToggle={() => setWithApp((current) => !current)}
        />
      )}
      <View style={{ gap: theme.space.sp4 }}>
        <GlassButton
          variant="dark"
          size="lg"
          full
          disabled={chosen.length === 0 && !withApp}
          onPress={() => onAccept(chosen, withApp)}
        >
          {offer.accept}
        </GlassButton>
        <GlassButton variant="quiet" full onPress={onDecline}>
          {offer.decline}
        </GlassButton>
      </View>
    </>
  );
}

export function ReceiveFlow({ service, header, onOpen, onDone }: ReceiveFlowProps) {
  const words = service.words();
  const looking = service.looking();
  const [stage, setStage] = useState<Stage>({ kind: 'looking', peers: undefined });
  const status = useStatus(service, stage.kind === 'receiving');

  const find = useCallback(async () => {
    setStage({ kind: 'looking', peers: undefined });
    try {
      setStage({ kind: 'looking', peers: await service.discover() });
    } catch (error) {
      setStage(failureStage(service, error));
    }
  }, [service]);

  useEffect(() => {
    void find();
  }, [find]);

  const connect = async (peer: PeerView) => {
    try {
      const offer = await service.connect(peer.peer);
      setStage(offer.ok ? { kind: 'incoming', offer } : { kind: 'failed', message: offer.message });
    } catch (error) {
      setStage(failureStage(service, error));
    }
  };

  const accept = async (offer: Incoming, resources: readonly ResourceChoice[], app: boolean) => {
    setStage({ kind: 'receiving', offer });
    try {
      const result = await service.accept({
        resources: resources.map(({ publisher, resource }) => ({ publisher, resource })),
        app,
      });
      setStage(result.ok ? { kind: 'received', result } : { kind: 'failed', message: result.message });
    } catch (error) {
      setStage(failureStage(service, error));
    }
  };

  switch (stage.kind) {
    case 'looking':
      return (
        <ScreenScaffold header={header}>
          <Card>
            <ThemedText
              variant="cardTitle"
              tone="title"
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {looking.title}
            </ThemedText>
            <ThemedText variant="caption" tone="body">
              {looking.hint}
            </ThemedText>
          </Card>
          {(stage.peers ?? []).map((peer) => (
            <Row
              key={peer.peer.id}
              icon="navigation"
              title={peer.label}
              detail={peer.codeLabel}
              chevron
              press={{
                onPress: () => connect(peer),
                accessibilityLabel: words.t('common.joined', { first: peer.label, second: peer.codeLabel }),
              }}
            />
          ))}
          <GlassButton variant="glass" full busy={stage.peers === undefined} onPress={find}>
            {looking.find}
          </GlassButton>
        </ScreenScaffold>
      );
    case 'incoming':
      return (
        <ScreenScaffold header={header}>
          <OfferChoices
            service={service}
            offer={stage.offer}
            onAccept={(resources, app) => accept(stage.offer, resources, app)}
            onDecline={async () => {
              await service.decline();
              await find();
            }}
          />
        </ScreenScaffold>
      );
    case 'receiving':
      return (
        <ScreenScaffold header={header}>
          <ProgressCard
            status={status}
            waiting={words.t('transfer.receiving', { percent: 0 })}
            stop={words.t('transfer.stop')}
            onStop={() => service.cancel()}
          />
        </ScreenScaffold>
      );
    case 'received':
      return (
        <ScreenScaffold header={header}>
          <Card>
            {stage.result.state === 'ready-to-read' ? (
              <>
                <ThemedText
                  variant="cardTitle"
                  tone="title"
                  accessibilityRole="header"
                  accessibilityLiveRegion="polite"
                >
                  {stage.result.label}
                </ThemedText>
                {stage.result.app === undefined ? null : (
                  <Notice
                    tone="ready"
                    text={words.t('transfer.app.ready', { size: stage.result.app.size })}
                  />
                )}
                <GlassButton
                  variant="dark"
                  size="lg"
                  full
                  onPress={() =>
                    stage.result.state === 'ready-to-read' ? onOpen(stage.result.language) : undefined
                  }
                >
                  {stage.result.open}
                </GlassButton>
              </>
            ) : (
              <>
                <Notice tone="ready" text={words.t('transfer.app.ready', { size: stage.result.app.size })} />
                <GlassButton variant="dark" full onPress={onDone}>
                  {words.t('common.done')}
                </GlassButton>
              </>
            )}
          </Card>
        </ScreenScaffold>
      );
    case 'failed':
      return (
        <ScreenScaffold header={header}>
          <Card>
            <Notice text={stage.message} />
            <GlassButton variant="dark" full onPress={find}>
              {words.t('common.retry')}
            </GlassButton>
          </Card>
        </ScreenScaffold>
      );
  }
}
