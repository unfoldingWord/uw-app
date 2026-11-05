import type { AudioClip, Passage, Story } from '../corpus/types';
import type { shareKinds } from '../domain/events';
import { failureCodeOf, type FailureCode, type FailureStep } from '../domain/failures';
import type { CopyReference } from '../domain/preferences';
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
import { copiedText, type VerseSpan } from './copy';
import { leaveOutReading, type Reading } from './reading';

export type ShareOptions = { locale: Locale };

export type JournalShareOptions = ShareOptions & { includeReading?: boolean };

export type ShareResult =
  { ok: true; outcome: ShareOutcome; payload: SharePayload } | { ok: false; code: FailureCode };

export type CopyOptions = ShareOptions & { reference: CopyReference };

export type CopyResult =
  { ok: true; text: string; reference: string; label: string } | { ok: false; code: FailureCode };

export type ShareApi = {
  readonly link: string;
  passage(passage: Passage, options: ShareOptions): Promise<ShareResult>;
  story(story: Story, options: ShareOptions): Promise<ShareResult>;
  audio(clip: AudioClip, options: ShareOptions): Promise<ShareResult>;
  journal(report: JournalReport, options: JournalShareOptions): Promise<ShareResult>;
  copy(passage: Passage, span: VerseSpan, options: CopyOptions): Promise<CopyResult>;
};

type ShareKind = (typeof shareKinds)[number];

const words = createStrings(tables);

export const shareModule = defineModule<ShareApi>({
  events: ['ShareSent', 'VersesCopied'],
  owns: { tables: [], directories: [diagnosticsDirectory], keys: [] },
  create(context) {
    const { ports } = context;

    async function refuse(
      code: FailureCode,
      step: FailureStep = 'share',
    ): Promise<{ ok: false; code: FailureCode }> {
      await context.emit({ type: 'Failure', payload: { code, context: { step } } });
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
        async journal(report, { locale, includeReading = false }) {
          const reading: Reading = includeReading ? 'included' : 'left-out';
          const written = reading === 'included' ? report : leaveOutReading(report);
          try {
            await ports.files.mkdir(diagnosticsDirectory);
            await ports.files.writeText(diagnosticsPath, diagnosticsDocument(written, reading));
          } catch (error) {
            return refuse(failureCodeOf(error));
          }
          return hand('journal', undefined, journalPayload(words, locale, reading));
        },
        async copy(passage, span, { locale, reference }) {
          const copied = copiedText(words, locale, passage, span, reference);
          if (copied === undefined) {
            return refuse('corpus.unreadable', 'copy');
          }
          try {
            await ports.clipboard.copy(copied.text);
          } catch (error) {
            const code = failureCodeOf(error);
            return refuse(code === 'unexpected' ? 'clipboard.unavailable' : code, 'copy');
          }
          await context.emit({
            type: 'VersesCopied',
            payload: { reference: copied.reference, language: passage.language },
          });
          return { ok: true, ...copied };
        },
      },
    };
  },
});
