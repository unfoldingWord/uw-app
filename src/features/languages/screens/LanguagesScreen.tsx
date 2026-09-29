import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type { PackId } from '@lib/domain/pack';
import { GlassInput, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Header, IconAction, Notice, ScreenScaffold, useAsyncValue } from '@shared/ui';
import { createLanguagesService } from '../service';
import { ExtrasSection } from './ExtrasSection';
import { LanguageList } from './LanguageList';
import { withOutcome, type Failures, type Outcome } from './outcomes';
import { RemoveSheet, type PendingRemove } from './RemoveSheet';
import { StorageSection } from './StorageSection';
import { UpdatesSection } from './UpdatesSection';

const pollMs = 1000;

export default function LanguagesScreen() {
  const languages = useService(createLanguagesService);
  const theme = useTheme();
  const router = useRouter();
  const words = languages.words();
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(0);
  const [failures, setFailures] = useState<Failures>({});
  const [pending, setPending] = useState<PendingRemove | undefined>(undefined);
  const bump = () => setVersion((current) => current + 1);
  const refreshed = useAsyncValue(() => languages.refresh(), []);
  const [running, setRunning] = useState(0);
  const online = useAsyncValue(() => languages.online(), [refreshed.value, running]);
  const rows = languages.list(query);
  const everyRow = languages.list();
  const installing = running > 0 || everyRow.some((row) => row.installing);

  useEffect(() => {
    if (!installing) {
      return undefined;
    }
    const timer = setTimeout(bump, pollMs);
    return () => clearTimeout(timer);
  }, [installing, version]);

  const run = async (key: string, action: () => Promise<Outcome>) => {
    setFailures((current) => withOutcome(current, key, { ok: true }));
    setRunning((current) => current + 1);
    const outcome = await action();
    setRunning((current) => current - 1);
    setFailures((current) => withOutcome(current, key, outcome));
    bump();
  };

  const refreshFailure =
    refreshed.value !== undefined && !refreshed.value.ok && refreshed.value.code !== 'http.offline'
      ? refreshed.value.code
      : undefined;

  return (
    <ScreenScaffold
      clearance={pending === undefined ? 'none' : 'footer'}
      header={
        <Header
          back={{ label: words.t('common.close'), onPress: () => router.back() }}
          overline={languages.overline()}
          title={words.t('languages.title')}
          trailing={
            <IconAction
              icon="navigation"
              label={words.t('transfer.open')}
              onPress={() => router.push('/transfer')}
            />
          }
        />
      }
      footer={
        pending === undefined ? undefined : (
          <RemoveSheet
            pending={pending}
            onCancel={() => setPending(undefined)}
            onRemove={async () => {
              await run(pending.pack, () => languages.remove(pending.pack));
              setPending(undefined);
            }}
          />
        )
      }
    >
      <GlassInput
        accessibilityLabel={words.t('languages.search')}
        placeholder={words.t('languages.search')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        leading={<Icon name="search" size={theme.fontSize.fsBody} />}
        returnKeyType="search"
      />
      {online.value === false ? <Notice tone="progress" text={words.t('languages.offline')} /> : null}
      {refreshFailure === undefined ? null : <Notice text={words.t(`failure.${refreshFailure}`)} />}
      <LanguageList
        rows={rows}
        query={query}
        failures={failures}
        onSelect={(row) =>
          run(row.language, async () => {
            await languages.select(row.language);
            return row.offline || row.installing ? { ok: true } : languages.download(row.language);
          })
        }
      />
      <ExtrasSection
        version={version}
        failures={failures}
        onInstall={(pack: PackId) => run(pack, () => languages.install(pack))}
      />
      <UpdatesSection
        version={version}
        rows={everyRow}
        failures={failures}
        onUpdate={(pack) => run(pack, () => languages.update(pack))}
      />
      <StorageSection version={version} rows={everyRow} failures={failures} onRemove={setPending} />
    </ScreenScaffold>
  );
}
