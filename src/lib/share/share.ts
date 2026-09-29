import type { AudioClip, Passage, Story } from '../corpus/types';
import type { shareKinds } from '../domain/events';
import { failureCodeOf, type FailureCode } from '../domain/failures';
import { defineModule } from '../module';
import type { ShareOutcome, SharePayload } from '../ports';
import type { Locale } from '../strings/locales';
import { tables } from '../strings/locales/index';
import { createStrings } from '../strings/strings';
import {
  audioPayload,
  diagnosticsDirectory,
  diagnosticsDocument,
  diagnosticsPath,
  getTheAppLink,
  journalPayload,
  passagePayload,
  storyPayload,
  type JournalReport,
} from './payload';

export type ShareOptions = { locale: Locale };

export type ShareResult =
  { ok: true; outcome: ShareOutcome; payload: SharePayload } | { ok: false; code: FailureCode };

export type ShareApi = {
  readonly link: string;
  passage(passage: Passage, options: ShareOptions): Promise<ShareResult>;
  story(story: Story, options: ShareOptions): Promise<ShareResult>;
  audio(clip: AudioClip, options: ShareOptions): Promise<ShareResult>;
  journal(report: JournalReport, options: ShareOptions): Promise<ShareResult>;
};

type ShareKind = (typeof shareKinds)[number];

const words = createStrings(tables);

export const shareModule = defineModule<ShareApi>({
  events: ['ShareSent'],
  owns: { tables: [], directories: [diagnosticsDirectory], keys: [] },
  create(context) {
    const { ports } = context;

    async function refuse(code: FailureCode): Promise<ShareResult> {
      await context.emit({ type: 'Failure', payload: { code, context: { step: 'share' } } });
      return { ok: false, code };
    }

    async function hand(kind: ShareKind, language: string | undefined, payload: SharePayload) {
      let outcome: ShareOutcome;
      try {
        outcome = await ports.shareSheet.share(payload);
      } catch (error) {
        const code = failureCodeOf(error);
        return refuse(code === 'unexpected' ? 'share.unavailable' : code);
      }
      if (outcome === 'shared') {
        await context.emit({
          type: 'ShareSent',
          payload: { kind, ...(language === undefined ? {} : { language }) },
        });
      }
      return { ok: true as const, outcome, payload };
    }

    return {
      api: {
        link: getTheAppLink,
        passage: (passage, { locale }) =>
          hand('passage', passage.language, passagePayload(words, locale, passage)),
        story: (story, { locale }) => hand('story', story.language, storyPayload(words, locale, story)),
        async audio(clip, { locale }) {
          if (!(await ports.files.exists(clip.path))) {
            return refuse('audio.unavailable');
          }
          return hand('audio', clip.provenance.language, audioPayload(words, locale, clip));
        },
        async journal(report, { locale }) {
          try {
            await ports.files.mkdir(diagnosticsDirectory);
            await ports.files.writeText(diagnosticsPath, diagnosticsDocument(report));
          } catch (error) {
            return refuse(failureCodeOf(error));
          }
          return hand('journal', undefined, journalPayload(words, locale));
        },
      },
    };
  },
});
