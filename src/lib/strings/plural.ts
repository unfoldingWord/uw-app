import type { Locale } from './locales';
import type { PluralCategory } from './table';

type Operands = {
  readonly n: number;
  readonly i: number;
  readonly v: number;
};

type Rule = (operands: Operands) => PluralCategory;

type RuleSet = { readonly categories: readonly PluralCategory[]; readonly select: Rule };

function operandsOf(count: number): Operands {
  const n = Math.abs(count);
  const shown = String(n);
  const point = shown.indexOf('.');
  const v = point === -1 || shown.includes('e') ? 0 : shown.length - point - 1;
  return { n, i: Math.floor(n), v };
}

function between(value: number, low: number, high: number): boolean {
  return Number.isInteger(value) && value >= low && value <= high;
}

function roundMillions({ i, v }: Operands): boolean {
  return v === 0 && i !== 0 && i % 1_000_000 === 0;
}

const oneWhenWholeOne: RuleSet = {
  categories: ['one', 'other'],
  select: ({ i, v }) => (i === 1 && v === 0 ? 'one' : 'other'),
};

const oneForZeroAndOne: RuleSet = {
  categories: ['one', 'other'],
  select: ({ n, i }) => (i === 0 || n === 1 ? 'one' : 'other'),
};

const otherOnly: RuleSet = { categories: ['other'], select: () => 'other' };

const romance = (one: (operands: Operands) => boolean): RuleSet => ({
  categories: ['one', 'many', 'other'],
  select: (operands) => (one(operands) ? 'one' : roundMillions(operands) ? 'many' : 'other'),
});

const russian: RuleSet = {
  categories: ['one', 'few', 'many', 'other'],
  select: ({ i, v }) => {
    if (v !== 0) {
      return 'other';
    }
    const last = i % 10;
    const lastTwo = i % 100;
    if (last === 1 && lastTwo !== 11) {
      return 'one';
    }
    if (between(last, 2, 4) && !between(lastTwo, 12, 14)) {
      return 'few';
    }
    return 'many';
  },
};

const arabic: RuleSet = {
  categories: ['zero', 'one', 'two', 'few', 'many', 'other'],
  select: ({ n }) => {
    if (n === 0) {
      return 'zero';
    }
    if (n === 1) {
      return 'one';
    }
    if (n === 2) {
      return 'two';
    }
    const lastTwo = n % 100;
    if (between(lastTwo, 3, 10)) {
      return 'few';
    }
    return between(lastTwo, 11, 99) ? 'many' : 'other';
  },
};

const rules: Readonly<Record<Locale, RuleSet>> = {
  en: oneWhenWholeOne,
  'es-419': romance(({ n }) => n === 1),
  fr: romance(({ i }) => i === 0 || i === 1),
  hi: oneForZeroAndOne,
  ru: russian,
  ar: arabic,
  'zh-Hans': otherOnly,
  sw: oneWhenWholeOne,
  'pt-BR': romance(({ i }) => i === 0 || i === 1),
  id: otherOnly,
  vi: otherOnly,
  bn: oneForZeroAndOne,
  ur: oneWhenWholeOne,
  fa: oneForZeroAndOne,
  my: otherOnly,
  nl: oneWhenWholeOne,
};

export function pluralCategory(locale: Locale, count: number): PluralCategory {
  return rules[locale].select(operandsOf(count));
}

export function pluralCategoriesOf(locale: Locale): readonly PluralCategory[] {
  return rules[locale].categories;
}
