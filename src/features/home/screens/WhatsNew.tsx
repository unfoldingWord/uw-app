import { useState } from 'react';
import type { FailureCode } from '@lib/domain/failures';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Notice, Row, SectionTitle } from '@shared/ui';
import { createHomeService, type WhatsNewItem } from '../service';

export type WhatsNewProps = { items: readonly WhatsNewItem[]; onUpdated: () => void };

export function WhatsNew({ items, onUpdated }: WhatsNewProps) {
  const home = useService(createHomeService);
  const words = home.words();
  const [failures, setFailures] = useState<Readonly<Record<string, FailureCode>>>({});
  if (items.length === 0) {
    return null;
  }
  return (
    <>
      <SectionTitle>{words.t('home.new.title')}</SectionTitle>
      {items.map((item) => {
        const failure = failures[item.pack];
        return (
          <Row
            key={item.pack}
            title={item.title}
            detail={item.detail}
            trailing={
              <GlassButton
                size="sm"
                variant="dark"
                accessibilityHint={item.title}
                onPress={async () => {
                  const outcome = await home.update(item.pack);
                  setFailures((current) => {
                    const rest = Object.fromEntries(
                      Object.entries(current).filter(([pack]) => pack !== item.pack),
                    );
                    return outcome.ok ? rest : { ...rest, [item.pack]: outcome.code };
                  });
                  onUpdated();
                }}
              >
                {words.t('home.new.action')}
              </GlassButton>
            }
            below={failure === undefined ? undefined : <Notice text={words.t(`failure.${failure}`)} />}
          />
        );
      })}
    </>
  );
}
