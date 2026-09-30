import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GlassButton, GlassIconButton, GlassSurface, Icon } from '@shared/glass';
import { contentText, useTheme } from '@shared/theme';
import type { Introduction, LinkTarget, Note, Passage, Question } from '../../service';
import type { StudyWords } from '../../strings';
import { Blocks } from './Blocks';
import { Choices } from './Choices';
import { hasHelps, helpsAt, type VerseKey } from './passage';
import { Say } from './Say';

export type HelpsTab = 'notes' | 'wordLinks' | 'questions';

export type HelpsPanelProps = {
  words: StudyWords;
  passage: Passage;
  at: VerseKey | undefined;
  tab: HelpsTab;
  onTab: (tab: HelpsTab) => void;
  focused: string | undefined;
  onFocus: (id: string) => void;
  onLink: (target: LinkTarget) => void;
  labelOf: (target: LinkTarget) => string | undefined;
  saved: boolean;
  onToggleSave: () => Promise<void>;
  onShare: () => void;
};

const tabKeys = {
  notes: 'study.helps.notes',
  wordLinks: 'study.helps.wordLinks',
  questions: 'study.helps.questions',
} as const;

const emptyKeys = {
  notes: 'study.helps.noNotes',
  wordLinks: 'study.helps.noWordLinks',
  questions: 'study.helps.noQuestions',
} as const;

function NoteItem({
  words,
  note,
  focused,
  language,
  onFocus,
  onLink,
  labelOf,
}: {
  words: StudyWords;
  note: Note;
  focused: boolean;
  language: string;
  onFocus: (id: string) => void;
  onLink: (target: LinkTarget) => void;
  labelOf: (target: LinkTarget) => string | undefined;
}) {
  const theme = useTheme();
  const support = note.support;
  const supportLabel =
    support === undefined
      ? ''
      : (labelOf(support) ??
        (support.kind === 'article'
          ? words.t(support.id.startsWith('ta/') ? 'article.academy' : 'article.word')
          : support.kind === 'passage'
            ? support.reference
            : words.t('search.kind.story')));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={note.quote}
      accessibilityState={{ selected: focused }}
      onPress={() => onFocus(note.id)}
      style={{
        gap: theme.space.sp3,
        padding: theme.space.sp5,
        borderRadius: theme.radius.rSm,
        backgroundColor: focused ? theme.color.glassFill2 : undefined,
      }}
    >
      {note.quote.length === 0 ? null : (
        <Say
          role="label"
          tone="title"
          weight="semibold"
          style={contentText(theme, theme.text.label, { language, sample: note.quote })}
        >
          {note.quote}
        </Say>
      )}
      <Blocks blocks={note.blocks} language={language} onLink={onLink} compact />
      {support === undefined ? null : (
        <GlassButton
          variant="quiet"
          size="sm"
          accessibilityLabel={supportLabel}
          onPress={() => onLink(support)}
          trailing={<Icon name="arrowUpRight" size={theme.fontSize.fsLabel} />}
        >
          <Say role="caption" tone="link" weight="medium">
            {supportLabel}
          </Say>
        </GlassButton>
      )}
    </Pressable>
  );
}

function IntroItem({
  words,
  intro,
  language,
  onLink,
}: {
  words: StudyWords;
  intro: Introduction;
  language: string;
  onLink: (target: LinkTarget) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space.sp3, padding: theme.space.sp5 }}>
      <Say role="overline" tone="dim">
        {intro.chapter === undefined
          ? words.t('study.helps.bookIntro')
          : words.t('study.helps.chapterIntro', { chapter: String(intro.chapter) })}
      </Say>
      <Blocks blocks={intro.blocks} language={language} onLink={onLink} compact />
    </View>
  );
}

function QuestionItem({
  words,
  question,
  language,
}: {
  words: StudyWords;
  question: Question;
  language: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: theme.space.sp4, paddingVertical: theme.space.sp3 }}>
      <Say
        role="body"
        tone="title"
        selectable
        style={contentText(theme, theme.text.body, { language, sample: question.question })}
      >
        {question.question}
      </Say>
      {open ? (
        <Say
          role="caption"
          tone="body"
          selectable
          style={contentText(theme, theme.text.caption, { language, sample: question.response })}
        >
          {question.response}
        </Say>
      ) : null}
      <GlassButton variant="quiet" size="sm" onPress={() => setOpen((value) => !value)}>
        {words.t(open ? 'study.helps.hideResponse' : 'study.helps.showResponse')}
      </GlassButton>
    </View>
  );
}

export function HelpsPanel({
  words,
  passage,
  at,
  tab,
  onTab,
  focused,
  onFocus,
  onLink,
  labelOf,
  saved,
  onToggleSave,
  onShare,
}: HelpsPanelProps) {
  const theme = useTheme();
  const language = passage.language;
  const helps =
    at === undefined ? { intros: [], notes: [], wordLinks: [], questions: [] } : helpsAt(passage, at);
  const choices = (Object.keys(tabKeys) as HelpsTab[]).map((key) => ({
    key,
    label: words.t(tabKeys[key]),
    selected: key === tab,
  }));
  const available = hasHelps(passage);
  const count =
    tab === 'notes'
      ? helps.intros.length + helps.notes.length
      : tab === 'wordLinks'
        ? helps.wordLinks.length
        : helps.questions.length;
  return (
    <GlassSurface
      level={3}
      blur="heavy"
      radius="xl"
      style={[
        styles.panel,
        {
          marginHorizontal: theme.space.sp5,
          paddingTop: theme.space.sp6,
          paddingHorizontal: theme.space.sp7,
          paddingBottom: theme.space.sp6,
          gap: theme.space.sp5,
        },
      ]}
    >
      <View style={[styles.row, { gap: theme.space.sp3 }]}>
        <Choices choices={choices} onChoose={onTab} compact style={styles.fill} />
        <GlassIconButton
          label={words.t(saved ? 'common.bookmark.remove' : 'study.passage.save')}
          size={theme.space.sp13}
          onPress={onToggleSave}
        >
          <Icon name="bookmark" color={saved ? theme.color.accentBlue : undefined} />
        </GlassIconButton>
        <GlassIconButton label={words.t('study.passage.share')} size={theme.space.sp13} onPress={onShare}>
          <Icon name="navigation" />
        </GlassIconButton>
      </View>
      {at === undefined ? null : (
        <Say role="overline" tone="dim">
          {words.t('study.helps.heading', { helps: words.t(tabKeys[tab]), verse: String(at.verse) })}
        </Say>
      )}
      <ScrollView style={styles.body} contentContainerStyle={{ gap: theme.space.sp3 }}>
        {!available ? (
          <Say role="caption" tone="body">
            {words.t('study.helps.notDownloaded')}
          </Say>
        ) : count === 0 ? (
          <Say role="caption" tone="body">
            {words.t(emptyKeys[tab])}
          </Say>
        ) : tab === 'notes' ? (
          <>
            {helps.intros.map((intro) => (
              <IntroItem key={intro.id} words={words} intro={intro} language={language} onLink={onLink} />
            ))}
            {helps.notes.map((note) => (
              <NoteItem
                key={note.id}
                words={words}
                note={note}
                focused={note.id === focused}
                language={language}
                onFocus={onFocus}
                onLink={onLink}
                labelOf={labelOf}
              />
            ))}
          </>
        ) : tab === 'wordLinks' ? (
          <View style={{ gap: theme.space.sp4 }}>
            <View style={[styles.wrap, { gap: theme.space.sp3 }]}>
              {helps.wordLinks.map((link) => (
                <GlassButton
                  key={link.id}
                  variant="glass"
                  size="sm"
                  onPress={() => {
                    onFocus(link.id);
                    onLink({ kind: 'article', id: link.article });
                  }}
                >
                  {link.title ?? link.original}
                </GlassButton>
              ))}
            </View>
            <Say role="caption" tone="dim">
              {words.t('study.helps.tapTerm')}
            </Say>
          </View>
        ) : (
          helps.questions.map((question) => (
            <QuestionItem key={question.id} words={words} question={question} language={language} />
          ))
        )}
      </ScrollView>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  panel: { flexShrink: 1, maxHeight: '50%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  fill: { flex: 1 },
  body: { flexShrink: 1 },
});
