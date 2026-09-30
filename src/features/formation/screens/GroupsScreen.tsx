import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FailureCode } from '@lib/domain/failures';
import { GlassButton, GlassInput, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import {
  createFormationService,
  type FormationService,
  type FormationWords,
  type Group,
  type Progress as GroupProgress,
} from '../service';
import { Card, SectionTitle } from './parts/Card';
import { Line } from './parts/Line';
import { settle, type WriteResult } from './parts/outcome';
import { Progress } from './parts/Progress';
import { Screen } from './parts/Screen';
import { useLoad } from './parts/useLoad';
import { groupLine, sessionHref } from './parts/wording';

type GroupState = { readonly group: Group; readonly progress: GroupProgress | undefined };

type Listing = { readonly groups: readonly GroupState[]; readonly active: string | undefined };

async function listingOf(service: FormationService): Promise<Listing> {
  const groups = await Promise.all(
    service.groups().map(async (group) => ({ group, progress: await service.progress(group.id) })),
  );
  return { groups, active: service.active()?.id };
}

async function attempt(work: () => Promise<WriteResult>, fail: (code: FailureCode | undefined) => void) {
  fail(await settle(work));
}

export default function GroupsScreen() {
  const service = useService(createFormationService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const load = useCallback(() => listingOf(service), [service]);
  const listing = useLoad(load);
  const [name, setName] = useState('');
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  const groups = listing.value?.groups ?? [];

  const create = async () => {
    const chosen =
      name.trim() === '' ? words.t('formation.group.default', { number: groups.length + 1 }) : name;
    await attempt(() => service.create(chosen), setFailure);
    setName('');
    await listing.reload();
  };

  return (
    <Screen
      title={words.t('formation.groups.title')}
      back={{ label: words.t('common.back'), onPress: () => router.back() }}
    >
      <Card level={2}>
        <Line role="label" tone="title" weight={theme.fontWeight.fwSemibold}>
          {words.t('formation.groups.addLabel')}
        </Line>
        <GlassInput
          accessibilityLabel={words.t('formation.group.name')}
          placeholder={words.t('formation.group.namePlaceholder')}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          maxLength={80}
        />
        <GlassButton
          variant="dark"
          full
          leading={<Icon name="plus" size={theme.space.sp8} />}
          onPress={create}
        >
          {words.t('formation.groups.addLabel')}
        </GlassButton>
        {failure === undefined ? null : (
          <Line role="caption" tone="body">
            {words.t(`failure.${failure}`)}
          </Line>
        )}
      </Card>
      {groups.length === 0 && !listing.loading ? (
        <Line role="body" tone="body">
          {words.t('formation.groups.empty')}
        </Line>
      ) : null}
      {groups.length === 0 ? null : <SectionTitle>{words.t('formation.groups.title')}</SectionTitle>}
      {groups.map(({ group, progress }) => (
        <GroupCard
          key={group.id}
          service={service}
          words={words}
          group={group}
          progress={progress}
          active={group.id === listing.value?.active}
          onChanged={listing.reload}
          onOpen={() => router.push(sessionHref(group.position.track, group.position.session))}
        />
      ))}
    </Screen>
  );
}

type GroupCardProps = {
  service: FormationService;
  words: FormationWords;
  group: Group;
  progress: GroupProgress | undefined;
  active: boolean;
  onChanged: () => Promise<void>;
  onOpen: () => void;
};

type Mode = 'view' | 'rename' | 'delete';

function GroupCard({ service, words, group, progress, active, onChanged, onOpen }: GroupCardProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState(group.name);
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  const line = groupLine(words, group, progress);

  const open = async () => {
    const failed = await settle(() => service.activate(group.id));
    setFailure(failed);
    if (failed === undefined) {
      onOpen();
    }
  };
  const rename = async () => {
    await attempt(() => service.rename(group.id, draft), setFailure);
    setMode('view');
    await onChanged();
  };
  const remove = async () => {
    await attempt(() => service.remove(group.id), setFailure);
    await onChanged();
  };

  return (
    <Card level={active ? 2 : 1}>
      <View style={[styles.head, { gap: theme.space.sp6 }]}>
        <Icon name={active ? 'check' : 'users'} />
        <View style={styles.grow}>
          <Line role="body" tone="title" weight={theme.fontWeight.fwSemibold}>
            {group.name}
          </Line>
          <Line role="caption" tone="body">
            {line}
          </Line>
        </View>
      </View>
      {progress === undefined ? null : <Progress fraction={progress.fraction} label={line} />}
      {mode === 'rename' ? (
        <View style={{ gap: theme.space.sp4 }}>
          <GlassInput
            accessibilityLabel={words.t('formation.group.name')}
            placeholder={words.t('formation.group.namePlaceholder')}
            value={draft}
            onChangeText={setDraft}
            maxLength={80}
          />
          <View style={[styles.actions, { gap: theme.space.gapInline }]}>
            <GlassButton variant="dark" size="sm" onPress={rename} disabled={draft.trim() === ''}>
              {words.t('common.save')}
            </GlassButton>
            <GlassButton size="sm" onPress={() => setMode('view')}>
              {words.t('common.cancel')}
            </GlassButton>
          </View>
        </View>
      ) : null}
      {mode === 'delete' ? (
        <View style={{ gap: theme.space.sp4 }}>
          <View style={[styles.head, { gap: theme.space.sp4 }]}>
            <View
              style={{
                width: theme.space.sp4,
                height: theme.space.sp4,
                borderRadius: theme.radius.rPill,
                backgroundColor: theme.color.accentWarm,
              }}
            />
            <Line role="label" tone="title" style={styles.grow}>
              {words.t('formation.group.deleteConfirm', { group: group.name })}
            </Line>
          </View>
          <View style={[styles.actions, { gap: theme.space.gapInline }]}>
            <GlassButton size="sm" variant="dark" onPress={() => setMode('view')}>
              {words.t('formation.group.keep')}
            </GlassButton>
            <GlassButton size="sm" onPress={remove}>
              {words.t('formation.group.delete')}
            </GlassButton>
          </View>
        </View>
      ) : null}
      {mode === 'view' ? (
        <View style={[styles.actions, { gap: theme.space.gapInline }]}>
          <GlassButton
            size="sm"
            variant="dark"
            accessibilityLabel={words.t('common.joined', {
              first: words.t('common.open'),
              second: group.name,
            })}
            onPress={open}
          >
            {words.t('common.open')}
          </GlassButton>
          <GlassButton
            size="sm"
            accessibilityLabel={words.t('common.joined', {
              first: words.t('formation.group.rename'),
              second: group.name,
            })}
            onPress={() => {
              setDraft(group.name);
              setMode('rename');
            }}
          >
            {words.t('formation.group.rename')}
          </GlassButton>
          <GlassButton
            size="sm"
            variant="quiet"
            accessibilityLabel={words.t('common.joined', {
              first: words.t('formation.group.delete'),
              second: group.name,
            })}
            onPress={() => setMode('delete')}
          >
            {words.t('formation.group.delete')}
          </GlassButton>
        </View>
      ) : null}
      {failure === undefined ? null : (
        <Line role="caption" tone="body">
          {words.t(`failure.${failure}`)}
        </Line>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
});
