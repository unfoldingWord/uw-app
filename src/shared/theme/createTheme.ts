import { fontFaces } from '@shared/fonts/faces';
import { fontFor, type ResolvedFont, type Script } from '@shared/fonts/families';
import {
  categoryOf,
  type BlurName,
  type BorderName,
  type Category,
  type ColorName,
  type DurationName,
  type EasingName,
  type FontSizeName,
  type FontStackName,
  type FontWeightTokenName,
  type GradientName,
  type LetterSpacingName,
  type LineHeightName,
  type RadiusName,
  type ShadowName,
  type SpaceName,
  type TokenKey,
  type TransitionName,
  type TypeRoleName,
} from './categories';
import {
  blurIntensity,
  camelCaseToken,
  legacyShadow,
  parseBorder,
  parseCubicBezier,
  parseDurationMs,
  parseEm,
  parseFontShorthand,
  parseFontStack,
  parseNumber,
  parsePercentFactor,
  parsePx,
  parseShadow,
  parseTransformFunctions,
  resolveReferences,
  type Border,
  type CubicBezier,
  type LegacyShadow,
  type ShadowLayer,
} from './convert';
import { parseKeyframes, type Keyframe } from './keyframes';
import { darkTokens, keyframes, reducedMotionTokens, rootTokens, type TokenName } from './tokens';

export type Scheme = 'light' | 'dark';

export type ThemeOptions = { scheme: Scheme; reducedBlur: boolean; reducedMotion?: boolean; locale?: string };

export const defaultLocale = 'en';

export type Shadow = { css: string; layers: ShadowLayer[]; legacy: LegacyShadow };

export type Blur = { radius: number; intensity: number };

export type TextRole = 'hero' | 'cardTitle' | 'time' | 'body' | 'label' | 'caption' | 'overline';

export type TextStyleTokens = ResolvedFont & {
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

type Keyed<Name extends string, Value> = Record<TokenKey<Name>, Value>;

export type Theme = {
  scheme: Scheme;
  reducedBlur: boolean;
  reducedMotion: boolean;
  locale: string;
  tokens: Readonly<Record<TokenName, string>>;
  color: Keyed<ColorName, string>;
  gradient: Keyed<GradientName, string>;
  shadow: Keyed<ShadowName, Shadow>;
  fontStack: Keyed<FontStackName, string[]>;
  blur: Keyed<BlurName, Blur>;
  saturation: number;
  border: Keyed<BorderName, Border>;
  radius: Keyed<RadiusName, number>;
  space: Keyed<SpaceName, number>;
  fontSize: Keyed<FontSizeName, number>;
  lineHeight: Keyed<LineHeightName, number>;
  fontWeight: Keyed<FontWeightTokenName, number>;
  letterSpacing: Keyed<LetterSpacingName, number>;
  text: Record<TextRole, TextStyleTokens>;
  motion: {
    easing: Keyed<EasingName, CubicBezier>;
    duration: Keyed<DurationName, number>;
    transition: Keyed<TransitionName, string>;
    pressScale: number;
    hoverLift: { translateY: number };
    recoilSquash: { scaleX: number; scaleY: number };
    keyframes: {
      rise: Keyframe[];
      float: Keyframe[];
      breathe: Keyframe[];
      recoil: Keyframe[];
      drift: Keyframe[];
      draw: string;
    };
  };
};

const roleTokens: Record<TextRole, { role: TypeRoleName; spacing?: LetterSpacingName }> = {
  hero: { role: '--type-hero', spacing: '--ls-hero' },
  cardTitle: { role: '--type-card-title', spacing: '--ls-title' },
  time: { role: '--type-time' },
  body: { role: '--type-body', spacing: '--ls-body' },
  label: { role: '--type-label' },
  caption: { role: '--type-caption' },
  overline: { role: '--type-overline', spacing: '--ls-overline' },
};

function tokenTable(options: ThemeOptions): Record<string, string> {
  return {
    ...rootTokens,
    ...(options.scheme === 'dark' ? darkTokens : {}),
    ...(options.reducedMotion === true ? reducedMotionTokens : {}),
  };
}

function resolveAll(options: ThemeOptions): Record<TokenName, string> {
  const table = tokenTable(options);
  const names = Object.keys(rootTokens) as TokenName[];
  return Object.fromEntries(names.map((name) => [name, resolveReferences(name, table)])) as Record<
    TokenName,
    string
  >;
}

function group<Name extends TokenName, Value>(
  resolved: Record<TokenName, string>,
  category: Category,
  convert: (value: string, name: Name) => Value,
): Keyed<Name, Value> {
  const entries = (Object.keys(resolved) as TokenName[])
    .filter((name) => categoryOf(name) === category)
    .map((name) => [camelCaseToken(name), convert(resolved[name], name as Name)] as const);
  return Object.fromEntries(entries) as Keyed<Name, Value>;
}

function toHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function textStyle(
  resolved: Record<TokenName, string>,
  { role, spacing }: { role: TypeRoleName; spacing?: LetterSpacingName },
  isOverline: boolean,
): TextStyleTokens {
  const font = parseFontShorthand(resolved[role]);
  const family = fontFor(font.stack, font.weight);
  if (family === undefined) {
    throw new Error(`${role} names no shipped font family`);
  }
  const style: TextStyleTokens = {
    ...family,
    fontSize: font.size,
    lineHeight: toHundredths(font.size * font.lineHeight),
  };
  if (spacing !== undefined) {
    style.letterSpacing = toHundredths(parseEm(resolved[spacing]) * font.size);
  }
  if (isOverline) {
    style.textTransform = 'uppercase';
  }
  return style;
}

export function withScript(
  style: TextStyleTokens,
  stack: readonly string[],
  script: Script,
): TextStyleTokens {
  const face = fontFaces.find((item) => item.name === style.fontFamily);
  const weight = Number(style.fontWeight ?? face?.weight.split(' ')[0] ?? 400);
  const family = fontFor(stack, weight, { script });
  return family === undefined ? style : { ...style, fontWeight: undefined, ...family };
}

function buildTheme(options: ThemeOptions): Theme {
  const resolved = resolveAll(options);
  const heaviest = parsePx(resolved['--blur-heavy']);
  const squash = parseTransformFunctions(resolved['--recoil-squash']);
  const lift = parseTransformFunctions(resolved['--hover-lift']);
  const text = Object.fromEntries(
    (Object.keys(roleTokens) as TextRole[]).map((role) => [
      role,
      textStyle(resolved, roleTokens[role], role === 'overline'),
    ]),
  ) as Record<TextRole, TextStyleTokens>;
  return {
    scheme: options.scheme,
    reducedBlur: options.reducedBlur,
    reducedMotion: options.reducedMotion === true,
    locale: options.locale ?? defaultLocale,
    tokens: resolved,
    color: group<ColorName, string>(resolved, 'color', (value) => value),
    gradient: group<GradientName, string>(resolved, 'gradient', (value) => value),
    shadow: group<ShadowName, Shadow>(resolved, 'shadow', (value) => {
      const layers = parseShadow(value);
      return { css: value, layers, legacy: legacyShadow(layers) };
    }),
    fontStack: group<FontStackName, string[]>(resolved, 'fontStack', parseFontStack),
    blur: group<BlurName, Blur>(resolved, 'blur', (value) => {
      const radius = options.reducedBlur ? 0 : parsePx(value);
      return { radius, intensity: blurIntensity(radius, heaviest) };
    }),
    saturation: parsePercentFactor(resolved['--sat-glass'], 'saturate'),
    border: group<BorderName, Border>(resolved, 'border', parseBorder),
    radius: group<RadiusName, number>(resolved, 'radius', parsePx),
    space: group<SpaceName, number>(resolved, 'space', parsePx),
    fontSize: group<FontSizeName, number>(resolved, 'fontSize', parsePx),
    lineHeight: group<LineHeightName, number>(resolved, 'lineHeight', parseNumber),
    fontWeight: group<FontWeightTokenName, number>(resolved, 'fontWeight', parseNumber),
    letterSpacing: group<LetterSpacingName, number>(resolved, 'letterSpacing', parseEm),
    text,
    motion: {
      easing: group<EasingName, CubicBezier>(resolved, 'easing', parseCubicBezier),
      duration: group<DurationName, number>(resolved, 'duration', parseDurationMs),
      transition: group<TransitionName, string>(resolved, 'transition', (value) => value),
      pressScale: parseNumber(resolved['--press-scale']),
      hoverLift: { translateY: lift['translateY'] ?? 0 },
      recoilSquash: { scaleX: squash['scaleX'] ?? 1, scaleY: squash['scaleY'] ?? 1 },
      keyframes: {
        rise: parseKeyframes(keyframes['gg-rise']),
        float: parseKeyframes(keyframes['gg-float']),
        breathe: parseKeyframes(keyframes['gg-breathe']),
        recoil: parseKeyframes(keyframes['gg-recoil'], resolved),
        drift: parseKeyframes(keyframes['gg-drift']),
        draw: keyframes['gg-draw'],
      },
    },
  };
}

const themes = new Map<string, Theme>();

export function createTheme(options: ThemeOptions): Theme {
  const key = [
    options.scheme,
    String(options.reducedBlur),
    String(options.reducedMotion === true),
    options.locale ?? defaultLocale,
  ].join(':');
  const cached = themes.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const theme = buildTheme(options);
  themes.set(key, theme);
  return theme;
}
