import { GlassButton } from '@shared/glass';
import { Card, ThemedText } from '@shared/ui';
import type { FormationService, Group, Track } from '../../service';
import { NotesCard } from './NotesCard';

export type GroupNotesProps = {
  service: FormationService;
  group: Group | undefined;
  track: Track;
  number: number;
  onGroups: () => void;
};

export function GroupNotes({ service, group, track, number, onGroups }: GroupNotesProps) {
  const words = service.words();
  if (group === undefined) {
    return (
      <Card level={1}>
        <ThemedText variant="body" tone="body">
          {words.t('session.chooseGroup')}
        </ThemedText>
        <GlassButton onPress={onGroups}>{words.t('formation.groups.title')}</GlassButton>
      </Card>
    );
  }
  return <NotesCard service={service} words={words} group={group} track={track} session={number} />;
}
