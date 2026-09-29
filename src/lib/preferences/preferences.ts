import { isCanonicalReference } from '../domain/reference';
import { isLanguageTag } from '../domain/language';
import { failureCodeOf } from '../domain/failures';
import { preferenceKeys, type PreferenceKey } from '../domain/preferences';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import { resolveLocale, type Locale } from '../strings/locales';
import {
  isFreeText,
  lastPassageKey,
  lastPassagePrefix,
  normalizedValue,
  type PreferenceValue,
} from './values';

export type PreferencesApi = {
  get<K extends PreferenceKey>(key: K): PreferenceValue<K> | undefined;
  set<K extends PreferenceKey>(key: K, value: PreferenceValue<K> | undefined): Promise<boolean>;
  locale(): Locale;
  deviceLocale(): Locale;
  contentLanguage(): string | undefined;
  lastPassage(language: string): string | undefined;
  onChange(listener: (key: PreferenceKey) => void): () => void;
};

export const preferencesOwns = Object.freeze({
  tables: [],
  directories: [],
  keys: [...preferenceKeys, lastPassagePrefix],
});

export const preferencesModule = defineModule<PreferencesApi>({
  events: ['PreferenceChanged'],
  owns: preferencesOwns,
  create(context) {
    const { kv, locale: deviceLocale } = context.ports;
    const values = new Map<PreferenceKey, string>();
    const lastPassages = new Map<string, string>();
    const listeners = new Set<(key: PreferenceKey) => void>();

    const notify = (key: PreferenceKey): void => {
      for (const listener of listeners) {
        listener(key);
      }
    };

    const kvFailed = async (error: unknown): Promise<void> => {
      const code = failureCodeOf(error);
      await context.emit({
        type: 'Failure',
        payload: { code: code === 'unexpected' ? 'kv.io' : code, context: {} },
      });
    };

    const store = async (key: string, value: string | undefined): Promise<void> => {
      try {
        if (value === undefined) {
          await kv.delete(key);
        } else {
          await kv.set(key, value);
        }
      } catch (error) {
        await kvFailed(error);
      }
    };

    const record = async (key: PreferenceKey, value: string | undefined, apply: boolean): Promise<void> => {
      const freeText = isFreeText(key);
      await context.emit({
        type: 'PreferenceChanged',
        payload: freeText || value === undefined ? { key } : { key, value },
      });
      if (!apply) {
        return;
      }
      if (value === undefined) {
        values.delete(key);
      } else {
        values.set(key, value);
      }
      await store(key, value);
      notify(key);
    };

    const set = async (key: PreferenceKey, value: string | undefined): Promise<boolean> => {
      if (value === undefined) {
        if (!isFreeText(key)) {
          return false;
        }
        await record(key, undefined, true);
        return true;
      }
      const normalized = normalizedValue(key, value);
      if (normalized === undefined) {
        if (key === 'home.name' && value.trim() === '') {
          await record(key, undefined, true);
          return true;
        }
        return false;
      }
      await record(key, normalized, true);
      return true;
    };

    const device = (): Locale => resolveLocale([deviceLocale.current().tag]);

    const api: PreferencesApi = {
      get: <K extends PreferenceKey>(key: K) => values.get(key) as PreferenceValue<K> | undefined,
      set: (key, value) => set(key, value as string | undefined),
      locale: () => {
        const chosen = values.get('settings.locale');
        return chosen === undefined ? device() : resolveLocale([chosen]);
      },
      deviceLocale: device,
      contentLanguage: () => values.get('study.language'),
      lastPassage: (language) => lastPassages.get(language),
      onChange(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    return {
      api,
      async start() {
        for (const key of preferenceKeys) {
          const stored = await kv.get(key);
          const normalized = stored === undefined ? undefined : normalizedValue(key, stored);
          if (normalized !== undefined) {
            values.set(key, normalized);
          }
        }
        for (const key of await kv.keys()) {
          const language = key.startsWith(`${lastPassagePrefix}.`)
            ? key.slice(lastPassagePrefix.length + 1)
            : undefined;
          const reference = language === undefined ? undefined : await kv.get(key);
          if (
            language !== undefined &&
            reference !== undefined &&
            isLanguageTag(language) &&
            isCanonicalReference(reference)
          ) {
            lastPassages.set(language, reference);
          }
        }
      },
      async observe(entry) {
        if (entry.type !== 'PassageOpened') {
          return;
        }
        const { language, reference } = entry.payload;
        lastPassages.set(language, reference);
        await store(lastPassageKey(language), reference);
      },
      snapshot(): JsonValue {
        const closed = Object.fromEntries(
          preferenceKeys.flatMap((key) => {
            const value = values.get(key);
            return isFreeText(key) || value === undefined ? [] : [[key, value]];
          }),
        );
        return {
          values: closed,
          lastPassage: Object.fromEntries([...lastPassages.entries()].sort()),
        };
      },
      redo: {
        PreferenceChanged: async (event) => {
          const { key, value } = event.payload;
          if (value === undefined) {
            await record(key, undefined, false);
            return;
          }
          await set(key, value);
        },
      },
    };
  },
});
