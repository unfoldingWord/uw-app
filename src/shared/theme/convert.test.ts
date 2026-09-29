import { describe, expect, it } from 'vitest';
import {
  blurIntensity,
  camelCaseToken,
  parseBorder,
  parseCubicBezier,
  parseDurationMs,
  parseFontShorthand,
  parsePx,
  parseRgba,
  parseShadow,
  resolveReferences,
} from './convert';

describe('convert', () => {
  it('resolves nested var() references and refuses unknown or circular ones', () => {
    const table = { '--a': '#FFF', '--b': 'var(--a)', '--c': '0 0 var(--b)', '--d': 'var(--d)' };
    expect(resolveReferences('--c', table)).toBe('0 0 #FFF');
    expect(() => resolveReferences('--e', table)).toThrow(/not a token/);
    expect(() => resolveReferences('--d', table)).toThrow(/refers to itself/);
  });

  it('reads px lengths, and refuses unitless non-zero lengths', () => {
    expect(parsePx('.5px')).toBe(0.5);
    expect(parsePx('0')).toBe(0);
    expect(() => parsePx('12')).toThrow();
  });

  it('reads durations in ms and s', () => {
    expect(parseDurationMs('140ms')).toBe(140);
    expect(parseDurationMs('6s')).toBe(6000);
    expect(() => parseDurationMs('fast')).toThrow();
  });

  it('reads cubic-bezier easings as four numbers', () => {
    expect(parseCubicBezier('cubic-bezier(.34,1.56,.64,1)')).toEqual([0.34, 1.56, 0.64, 1]);
    expect(() => parseCubicBezier('ease-in')).toThrow();
  });

  it('reads borders and multi-layer shadows including inset and spread', () => {
    expect(parseBorder('.5px solid rgba(255,255,255,.7)')).toEqual({
      width: 0.5,
      style: 'solid',
      color: 'rgba(255,255,255,.7)',
    });
    expect(parseShadow('inset 0 -1px 0 rgba(255,255,255,.28), 0 0 0 1px #FFFFFF')).toEqual([
      {
        offsetX: 0,
        offsetY: -1,
        blurRadius: 0,
        spreadDistance: 0,
        color: 'rgba(255,255,255,.28)',
        inset: true,
      },
      { offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: '#FFFFFF', inset: false },
    ]);
    expect(parseShadow('none')).toEqual([]);
  });

  it('reads colours as channels', () => {
    expect(parseRgba('#014263')).toEqual({ red: 1, green: 66, blue: 99, alpha: 1 });
    expect(parseRgba('rgba(1,66,99,.1)')).toEqual({ red: 1, green: 66, blue: 99, alpha: 0.1 });
  });

  it('reads the font shorthand of a type role', () => {
    expect(parseFontShorthand('600 19px/1.24 "Inter Display","Inter",system-ui')).toEqual({
      weight: 600,
      size: 19,
      lineHeight: 1.24,
      stack: ['Inter Display', 'Inter', 'system-ui'],
    });
  });

  it('maps a blur radius onto a 0 to 100 intensity against the heaviest step', () => {
    expect(blurIntensity(64, 64)).toBe(100);
    expect(blurIntensity(24, 64)).toBe(38);
    expect(blurIntensity(0, 64)).toBe(0);
  });

  it('camel-cases a CSS custom property name', () => {
    expect(camelCaseToken('--glass-fill-2')).toBe('glassFill2');
    expect(camelCaseToken('--r-2xl')).toBe('r2xl');
    expect(camelCaseToken('--on-night-900')).toBe('onNight900');
  });
});
