import type { AudioClip, Passage, Story, TextChoice } from '@lib/corpus/types';
import type { FailureCode } from '@lib/domain/failures';
import { parseReference } from '@lib/domain/reference';
import type { Kernel } from '@lib/kernel';
import type { ShareResult } from '@lib/share/share';
import { shareWords, type ShareWords } from './strings';

export type ShareTarget =
  | { readonly kind: 'passage'; readonly reference: string; readonly text?: TextChoice }
  | { readonly kind: 'story'; readonly number: number };

export type ShareMenu =
  | {
      readonly state: 'ready';
      readonly title: string;
      readonly asText: string;
      readonly asAudio: string | undefined;
      readonly noAudio: string | undefined;
      readonly note: string;
    }
  | { readonly state: 'no-language' }
  | { readonly state: 'missing' };

export type ShareDone =
  | { readonly state: 'shared' }
  | { readonly state: 'dismissed' }
  | { readonly state: 'failed'; readonly code: FailureCode; readonly message: string }
  | { readonly state: 'no-language' }
  | { readonly state: 'missing' };

export type ShareService = {
  words(): ShareWords;
  link(): string;
  menu(target: ShareTarget): Promise<ShareMenu>;
  passage(reference: string, text?: TextChoice): Promise<ShareDone>;
  story(number: number): Promise<ShareDone>;
  audio(reference: string): Promise<ShareDone>;
};

type Found<T> =
  { readonly state: 'found'; readonly value: T } | { readonly state: 'no-language' | 'missing' };

export function createShareService(kernel: Kernel): ShareService {
  const { corpus, preferences, share } = kernel;
  const words = (): ShareWords => shareWords(kernel);

  const findPassage = async (reference: string, text?: TextChoice): Promise<Found<Passage>> => {
    const language = preferences.contentLanguage();
    if (language === undefined) {
      return { state: 'no-language' };
    }
    const parsed = parseReference(reference);
    if (!parsed.ok) {
      return { state: 'missing' };
    }
    const reading = text ?? preferences.get('study.reading') ?? 'literal';
    const found = await corpus.passage(parsed.reference, { language, text: reading });
    return found === undefined ? { state: 'missing' } : { state: 'found', value: found };
  };

  const findStory = async (number: number): Promise<Found<Story>> => {
    const language = preferences.contentLanguage();
    if (language === undefined) {
      return { state: 'no-language' };
    }
    const found = await corpus.story(number, language);
    return found === undefined ? { state: 'missing' } : { state: 'found', value: found };
  };

  const done = (result: ShareResult): ShareDone =>
    result.ok
      ? { state: result.outcome }
      : { state: 'failed', code: result.code, message: words().t(`failure.${result.code}`) };

  const clipOf = (passage: Passage): AudioClip | undefined => passage.audio[0];

  return {
    words,
    link: () => share.link,
    async menu(target) {
      const current = words();
      if (target.kind === 'story') {
        const found = await findStory(target.number);
        return found.state !== 'found'
          ? { state: found.state }
          : {
              state: 'ready',
              title: current.t('share.story'),
              asText: current.t('share.asText'),
              asAudio: undefined,
              noAudio: undefined,
              note: current.t('share.note'),
            };
      }
      const found = await findPassage(target.reference, target.text);
      if (found.state !== 'found') {
        return { state: found.state };
      }
      const audible = clipOf(found.value) !== undefined;
      return {
        state: 'ready',
        title: current.t('share.passage'),
        asText: current.t('share.asText'),
        asAudio: audible ? current.t('share.asAudio') : undefined,
        noAudio: audible ? undefined : current.t('share.noAudio'),
        note: current.t('share.note'),
      };
    },
    async passage(reference, text) {
      const found = await findPassage(reference, text);
      return found.state !== 'found'
        ? { state: found.state }
        : done(await share.passage(found.value, { locale: preferences.locale() }));
    },
    async story(number) {
      const found = await findStory(number);
      return found.state !== 'found'
        ? { state: found.state }
        : done(await share.story(found.value, { locale: preferences.locale() }));
    },
    async audio(reference) {
      const found = await findPassage(reference);
      if (found.state !== 'found') {
        return { state: found.state };
      }
      const clip = clipOf(found.value);
      if (clip === undefined) {
        return {
          state: 'failed',
          code: 'audio.unavailable',
          message: words().t('failure.audio.unavailable'),
        };
      }
      return done(await share.audio(clip, { locale: preferences.locale() }));
    },
  };
}
