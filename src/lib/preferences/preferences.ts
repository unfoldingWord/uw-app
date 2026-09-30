import { isCanonicalReference } from '../domain/reference';
import { isLanguageTag } from '../domain/language';
import { failureCodeOf } from '../domain/failures';
import { preferenceKeys, type PreferenceKey } from '../domain/preferences';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import { offeredLocales, releaseGate, resolveLocale, type Locale, type LocaleGate } from '../strings/locales';
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

const preferencesOwns = Object.freeze({
  tables: [],
  directories: [],
  keys: [...preferenceKeys, lastPassagePrefix],
});

export function preferencesModuleFor(gate: LocaleGate) {
  const offered = offeredLocales(gate);
  return defineModule<PreferencesApi>({
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

      const kvFailed = async (error: unknown, announced: boolean): Promise<void> => {
        const code = failureCodeOf(error);
        await context.emit({
          type: 'Failure',
          payload: {
            code: code === 'unexpected' ? 'kv.io' : code,
            context: announced ? { type: 'PreferenceChanged' } : {},
          },
        });
      };

      const store = async (key: string, value: string | undefined, announced: boolean): Promise<boolean> => {
        try {
          if (value === undefined) {
            await kv.delete(key);
          } else {
            await kv.set(key, value);
          }
          return true;
        } catch (error) {
          await kvFailed(error, announced);
          return false;
        }
      };

      const announce = async (key: PreferenceKey, value: string | undefined): Promise<void> => {
        await context.emit({
          type: 'PreferenceChanged',
          payload: isFreeText(key) || value === undefined ? { key } : { key, value },
        });
      };

      const record = async (key: PreferenceKey, value: string | undefined): Promise<boolean> => {
        if (!(await store(key, value, true))) {
          return false;
        }
        await announce(key, value);
        if (value === undefined) {
          values.delete(key);
        } else {
          values.set(key, value);
        }
        notify(key);
        return true;
      };

      const set = async (key: PreferenceKey, value: string | undefined): Promise<boolean> => {
        if (value === undefined) {
          return isFreeText(key) ? record(key, undefined) : false;
        }
        const normalized = normalizedValue(key, value);
        if (normalized === undefined) {
          return key === 'home.name' && value.trim() === '' ? record(key, undefined) : false;
        }
        return record(key, normalized);
      };

      const device = (): Locale => resolveLocale([deviceLocale.current().tag], offered);

      const api: PreferencesApi = {
        get: <K extends PreferenceKey>(key: K) => values.get(key) as PreferenceValue<K> | undefined,
        set: (key, value) => set(key, value as string | undefined),
        locale: () => {
          const chosen = values.get('settings.locale');
          return chosen === undefined ? device() : resolveLocale([chosen], offered);
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
          if (reference === undefined) {
            return;
          }
          lastPassages.set(language, reference);
          await store(lastPassageKey(language), reference, false);
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
              await announce(key, undefined);
              return;
            }
            await set(key, value);
          },
        },
      };
    },
  });
}

export const preferencesModule = preferencesModuleFor(releaseGate);
