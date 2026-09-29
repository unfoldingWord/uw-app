import { useEffect, useRef, useState } from 'react';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';
import { GlassInput } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { FormationService, FormationWords, Track } from '../../service';
import { Card } from './Card';
import { Line } from './Line';

const noteSettleMs = 900;

type SaveState =
  | { readonly state: 'idle' }
  | { readonly state: 'saving' }
  | { readonly state: 'saved' }
  | { readonly state: 'failed'; readonly code: FailureCode };

export type NotesCardProps = {
  service: FormationService;
  words: FormationWords;
  group: { readonly id: string; readonly name: string };
  track: Track;
  session: number;
};

export function NotesCard({ service, words, group, track, session }: NotesCardProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState(() => service.note(group.id, track, session) ?? '');
  const [saving, setSaving] = useState<SaveState>({ state: 'idle' });
  const pending = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setDraft(service.note(group.id, track, session) ?? '');
    setSaving({ state: 'idle' });
  }, [service, group.id, track, session]);

  const flush = async () => {
    const text = pending.current;
    if (text === undefined) {
      return;
    }
    pending.current = undefined;
    setSaving({ state: 'saving' });
    try {
      const saved = await service.saveNote(group.id, track, session, text);
      setSaving(saved ? { state: 'saved' } : { state: 'failed', code: 'unexpected' });
    } catch (error) {
      setSaving({ state: 'failed', code: failureCodeOf(error) });
    }
  };

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      const text = pending.current;
      if (text !== undefined) {
        pending.current = undefined;
        void service.saveNote(group.id, track, session, text).catch(() => undefined);
      }
    },
    [service, group.id, track, session],
  );

  const change = (text: string) => {
    setDraft(text);
    pending.current = text;
    setSaving({ state: 'idle' });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), noteSettleMs);
  };

  const status =
    saving.state === 'saving'
      ? words.t('common.busy')
      : saving.state === 'saved'
        ? words.t('session.notes.saved')
        : saving.state === 'failed'
          ? words.t(`failure.${saving.code}`)
          : words.t('session.notes.hint');

  return (
    <Card level={1}>
      <Line role="overline" tone="dim" accessibilityRole="header">
        {words.t('session.notes.title', { group: group.name })}
      </Line>
      <GlassInput
        multiline
        accessibilityLabel={words.t('session.notes.title', { group: group.name })}
        accessibilityHint={words.t('session.notes.hint')}
        placeholder={words.t('session.notes.placeholder')}
        value={draft}
        onChangeText={change}
        onBlur={() => {
          clearTimeout(timer.current);
          void flush();
        }}
        style={{ paddingVertical: theme.space.sp4 }}
      />
      <Line role="caption" tone="faint" live>
        {status}
      </Line>
    </Card>
  );
}
