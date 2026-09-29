import { en } from './en/index';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type PluralForms = { readonly other: string } & {
  readonly [C in Exclude<PluralCategory, 'other'>]?: string;
};

type English = typeof en;

export type Key = keyof English;

export type StringKey = { [K in Key]: English[K] extends string ? K : never }[Key];

export type PluralKey = Exclude<Key, StringKey>;

export type LocaleTable = {
  readonly [K in Key]: English[K] extends string ? string | null : PluralForms | null;
};

type Placeholders<S> = S extends `${string}{${infer Name}}${infer Rest}` ? Name | Placeholders<Rest> : never;

type PlaceholdersOfKey<K extends Key> = English[K] extends string
  ? Placeholders<English[K]>
  : English[K] extends { readonly other: infer Other }
    ? Placeholders<Other>
    : never;

export type ParamValue = string | number;

type ParamsFor<Names extends string> = [Names] extends [never]
  ? []
  : [params: Readonly<Record<Names, ParamValue>>];

export type StringParams<K extends StringKey> = ParamsFor<PlaceholdersOfKey<K>>;

type DisplayedCount = { readonly count?: string };

type PluralParamsFor<Names extends string> = [Names] extends [never]
  ? [params?: DisplayedCount]
  : [params: Readonly<Record<Names, ParamValue>> & DisplayedCount];

export type PluralParams<K extends PluralKey> = PluralParamsFor<Exclude<PlaceholdersOfKey<K>, 'count'>>;

export function isPluralForms(value: string | PluralForms | null): value is PluralForms {
  return typeof value === 'object' && value !== null;
}

export const english: LocaleTable = en;
