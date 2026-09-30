import { describe, expect, it } from 'vitest';
import { categoryOf } from './categories';
import { camelCaseToken } from './convert';
import { createTheme, withScript, type Theme } from './createTheme';
import { darkTokens, rootTokens } from './tokens';

const light = createTheme({ scheme: 'light', reducedBlur: false });
const dark = createTheme({ scheme: 'dark', reducedBlur: false });
const lightReduced = createTheme({ scheme: 'light', reducedBlur: true });
const darkReduced = createTheme({ scheme: 'dark', reducedBlur: true });

function derivedKeys(theme: Theme): string[] {
  const groups = [
    theme.color,
    theme.gradient,
    theme.shadow,
    theme.fontStack,
    theme.blur,
    theme.border,
    theme.radius,
    theme.space,
    theme.fontSize,
    theme.lineHeight,
    theme.fontWeight,
    theme.letterSpacing,
  ];
  const { motion } = theme;
  return [
    ...groups.flatMap((group: object) => Object.keys(group)),
    ...Object.keys(motion.easing),
    ...Object.keys(motion.duration),
    ...Object.keys(motion.transition),
  ];
}

describe('createTheme', () => {
  it('resolves every token by its CSS name in both schemes', () => {
    for (const theme of [light, dark, lightReduced, darkReduced]) {
      expect(Object.keys(theme.tokens).sort()).toEqual(Object.keys(rootTokens).sort());
      for (const value of Object.values(theme.tokens)) {
        expect(value).not.toMatch(/var\(/);
      }
    }
  });

  it('gives every token a category and a derived value under its camel-cased name', () => {
    const singles = ['--sat-glass', '--press-scale', '--hover-lift', '--recoil-squash'];
    const expected = Object.keys(rootTokens)
      .filter((name) => !name.startsWith('--type-') && !singles.includes(name))
      .map(camelCaseToken)
      .sort();
    for (const name of Object.keys(rootTokens)) {
      expect(() => categoryOf(name)).not.toThrow();
    }
    expect(derivedKeys(light).sort()).toEqual(expected);
    expect(derivedKeys(dark).sort()).toEqual(expected);
  });

  it('re-points only the dark aliases in the dark scheme', () => {
    for (const [name, value] of Object.entries(darkTokens)) {
      if (!value.includes('var(')) {
        expect(dark.tokens[name as keyof typeof darkTokens]).toBe(value);
      }
    }
    expect(dark.color.glassFill2).toBe('rgba(255,255,255,.09)');
    expect(dark.color.surfaceCard).toBe('rgba(255,255,255,.09)');
    expect(light.color.surfaceCard).toBe('rgba(255,255,255,.46)');
    expect(dark.color.ink900).toBe(light.color.ink900);
    expect(dark.color.accentDeepText).toBe('#5CC3EE');
    expect(light.color.textBody).toBe('#014263');
  });

  it('drops blur and nothing else in reduced-blur mode', () => {
    for (const [full, reduced] of [
      [light, lightReduced],
      [dark, darkReduced],
    ] as const) {
      expect(reduced.reducedBlur).toBe(true);
      for (const blur of Object.values(reduced.blur)) {
        expect(blur).toEqual({ radius: 0, intensity: 0 });
      }
      const { blur: fullBlur, reducedBlur: fullFlag, ...fullRest } = full;
      const { blur: reducedBlurValues, reducedBlur: reducedFlag, ...reducedRest } = reduced;
      expect(fullFlag).toBe(false);
      expect(reducedFlag).toBe(true);
      expect(Object.values(fullBlur).every((blur) => blur.radius > 0)).toBe(true);
      expect(Object.keys(reducedBlurValues)).toEqual(Object.keys(fullBlur));
      expect(reducedRest).toEqual(fullRest);
    }
  });

  it('converts lengths, easings, durations, borders and shadows to React Native forms', () => {
    expect(light.space.gutterScreen).toBe(18);
    expect(light.radius.rXl).toBe(28);
    expect(light.radius.rPill).toBe(999);
    expect(light.motion.easing.easeLiquid).toEqual([0.22, 1, 0.36, 1]);
    expect(light.motion.duration.floatCycle).toBe(6000);
    expect(light.motion.duration.durMorph).toBe(600);
    expect(light.motion.pressScale).toBe(0.972);
    expect(light.motion.hoverLift).toEqual({ translateY: -1 });
    expect(light.motion.recoilSquash).toEqual({ scaleX: 1.014, scaleY: 0.962 });
    expect(light.border.borderGlass).toEqual({ width: 0.5, style: 'solid', color: 'rgba(255,255,255,.7)' });
    expect(light.saturation).toBe(1.6);
    expect(light.blur.blurHeavy).toEqual({ radius: 64, intensity: 100 });
    expect(light.blur.blurSheer).toEqual({ radius: 8, intensity: 13 });
    expect(light.shadow.shadowCard.css).toBe(rootTokens['--shadow-card']);
    expect(light.shadow.shadowCard.layers).toHaveLength(3);
    expect(light.shadow.innerEdge.layers).toEqual([
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 0.5,
        color: 'rgba(255,255,255,.55)',
        inset: true,
      },
    ]);
    expect(light.shadow.shadowCard.legacy).toEqual({
      shadowColor: 'rgb(1,66,99)',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.1,
      shadowRadius: 17,
      elevation: 14,
    });
  });

  it('shortens durations in reduced-motion mode', () => {
    const still = createTheme({ scheme: 'light', reducedBlur: false, reducedMotion: true });
    expect(still.motion.duration.durMorph).toBe(1);
    expect(still.motion.duration.durBase).toBe(1);
    expect(still.motion.duration.durMicro).toBe(140);
  });

  it('builds text roles from the type tokens with shipped font families', () => {
    expect(light.text.hero).toEqual({
      fontFamily: 'InterDisplay-Medium',
      fontSize: 28,
      lineHeight: 32.48,
      letterSpacing: -0.56,
    });
    expect(light.text.body.fontFamily).toBe('InterDisplay-Regular');
    expect(light.text.overline).toMatchObject({
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: 1.26,
    });
    expect(light.text.time.fontFamily).toBe('InterDisplay-SemiBold');
  });

  it('swaps to a Noto family for a script the Latin faces do not cover', () => {
    expect(withScript(light.text.body, light.fontStack.fontCore, 'arabic')).toMatchObject({
      fontFamily: 'NotoSansArabic-Variable',
      fontWeight: '400',
      fontSize: 15,
    });
    expect(withScript(light.text.cardTitle, light.fontStack.fontScriptUrdu, 'urdu').fontFamily).toBe(
      'NotoNastaliqUrdu-Variable',
    );
  });

  it('parses the motion keyframes the primitives animate', () => {
    expect(light.motion.keyframes.float).toEqual([
      { offset: 0, values: { translateY: 0 } },
      { offset: 0.5, values: { translateY: -4 } },
      { offset: 1, values: { translateY: 0 } },
    ]);
    expect(light.motion.keyframes.breathe[1]).toEqual({ offset: 0.5, values: { opacity: 0.9, scale: 1.04 } });
    expect(light.motion.keyframes.drift[1]).toEqual({
      offset: 0.33,
      values: { translateXPercent: 3, translateYPercent: -2, scale: 1.06 },
    });
    expect(light.motion.keyframes.rise[0]).toEqual({
      offset: 0,
      values: { opacity: 0, translateY: 14, scale: 0.94, blur: 8 },
    });
    expect(light.motion.keyframes.recoil[1]).toEqual({
      offset: 0.14,
      values: { scaleX: 1.014, scaleY: 0.962 },
    });
  });

  it('returns the same object for the same options', () => {
    expect(createTheme({ scheme: 'dark', reducedBlur: false })).toBe(dark);
  });
});
