import type { TokenName } from './tokens';

type CamelTail<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelTail<Tail>>}`
  : S;

export type TokenKey<Name extends string> = Name extends `--${infer Rest}` ? CamelTail<Rest> : never;

export type GradientName = Extract<
  TokenName,
  '--device-frame' | '--refraction' | '--refraction-night' | '--aurora-field' | '--studio-bg'
>;

export type ColorName = Exclude<
  Extract<
    TokenName,
    | `--uw-${string}`
    | `--ink-${string}`
    | `--paper-${string}`
    | `--aurora-${string}`
    | `--accent-${string}`
    | `--night-${string}`
    | `--on-night-${string}`
    | `--text-${string}`
    | `--surface-${string}`
    | `--glass-fill-${string}`
    | `--material-${string}`
    | '--filament-stroke'
    | '--dot-ring-stroke'
    | '--link'
    | '--link-hover'
    | '--focus-ring'
  >,
  GradientName
>;

export type ShadowName = Extract<TokenName, `--shadow-${string}` | `--glow-${string}` | `--inner-${string}`>;
export type FontStackName = Extract<TokenName, `--font-${string}`>;
export type BlurName = Extract<TokenName, `--blur-${string}`>;
export type BorderName = Extract<TokenName, `--border-${string}`>;
export type RadiusName = Extract<TokenName, `--r-${string}`>;
export type SpaceName = Extract<
  TokenName,
  | `--sp-${string}`
  | `--gutter-${string}`
  | `--gap-${string}`
  | `--safe-${string}`
  | '--device-w'
  | '--device-h'
>;
export type EasingName = Extract<TokenName, `--ease-${string}`>;
export type DurationName = Extract<TokenName, `--dur-${string}` | '--float-cycle' | '--delay-morph'>;
export type TransitionName = Extract<TokenName, `--t-${string}`>;
export type FontSizeName = Extract<TokenName, `--fs-${string}`>;
export type LineHeightName = Extract<TokenName, `--lh-${string}`>;
export type FontWeightTokenName = Extract<TokenName, `--fw-${string}`>;
export type LetterSpacingName = Extract<TokenName, `--ls-${string}`>;
export type TypeRoleName = Extract<TokenName, `--type-${string}`>;

export type Category =
  | 'gradient'
  | 'color'
  | 'shadow'
  | 'fontStack'
  | 'blur'
  | 'border'
  | 'radius'
  | 'space'
  | 'easing'
  | 'duration'
  | 'transition'
  | 'fontSize'
  | 'lineHeight'
  | 'fontWeight'
  | 'letterSpacing'
  | 'typeRole'
  | 'single';

const rules: [Category, RegExp][] = [
  ['gradient', /^--(device-frame|refraction|refraction-night|aurora-field|studio-bg)$/],
  [
    'color',
    /^--(uw|ink|paper|aurora|accent|night|on-night|text|surface|glass-fill|material)-|^--(filament-stroke|dot-ring-stroke|link|link-hover|focus-ring)$/,
  ],
  ['shadow', /^--(shadow|glow|inner)-/],
  ['fontStack', /^--font-/],
  ['blur', /^--blur-/],
  ['border', /^--border-/],
  ['radius', /^--r-/],
  ['space', /^--(sp|gutter|gap|safe)-|^--device-(w|h)$/],
  ['easing', /^--ease-/],
  ['duration', /^--dur-|^--(float-cycle|delay-morph)$/],
  ['transition', /^--t-/],
  ['fontSize', /^--fs-/],
  ['lineHeight', /^--lh-/],
  ['fontWeight', /^--fw-/],
  ['letterSpacing', /^--ls-/],
  ['typeRole', /^--type-/],
  ['single', /^--(sat-glass|press-scale|hover-lift|recoil-squash)$/],
];

export function categoryOf(name: string): Category {
  const rule = rules.find(([, pattern]) => pattern.test(name));
  if (rule === undefined) {
    throw new Error(`${name} has no category in src/shared/theme/categories.ts`);
  }
  return rule[0];
}
