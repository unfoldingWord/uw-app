import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';
import { createTheme } from './createTheme';
import { contentText, directionOf, localeScript, textSample, uiFont, uiText } from './script';

const themeIn = (locale: string) => createTheme({ scheme: 'light', reducedBlur: false, locale });

describe('PRD 10.1 the app locale picks the script face for chrome', () => {
  it('names the script each locale writes in, and none for a Latin or Cyrillic locale', () => {
    expect(['ar', 'fa', 'ur', 'hi', 'bn', 'my', 'en', 'ru', 'zh-Hans'].map(localeScript)).toEqual([
      'arabic',
      'arabic',
      'urdu',
      'devanagari',
      'bengali',
      'myanmar',
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('sets an Arabic label in Noto Sans Arabic and an Urdu label in Noto Nastaliq Urdu', () => {
    const arabic = uiText(themeIn('ar'), themeIn('ar').text.body, 'الإعدادات');
    const urdu = uiText(themeIn('ur'), themeIn('ur').text.body, 'ترتیبات');
    const farsi = uiText(themeIn('fa'), themeIn('fa').text.body, 'تنظیمات');
    expect([arabic.fontFamily, urdu.fontFamily, farsi.fontFamily]).toEqual([
      'NotoSansArabic-Variable',
      'NotoNastaliqUrdu-Variable',
      'NotoSansArabic-Variable',
    ]);
  });

  it('sets Hindi, Bengali and Burmese labels in their Noto face at the role weight', () => {
    const hindi = uiText(themeIn('hi'), themeIn('hi').text.cardTitle, 'अध्ययन');
    const bengali = uiText(themeIn('bn'), themeIn('bn').text.body, 'অধ্যয়ন');
    const burmese = uiText(themeIn('my'), themeIn('my').text.body, 'လေ့လာ');
    expect([hindi.fontFamily, bengali.fontFamily, burmese.fontFamily]).toEqual([
      'NotoSansDevanagari-Variable',
      'NotoSansBengali-Variable',
      'NotoSansMyanmar-Variable',
    ]);
    expect(hindi.fontWeight).toBe('600');
  });

  it('drops letter spacing in a script face, since tracking breaks joined letters and conjuncts', () => {
    const hindi = themeIn('hi');
    const overline = uiText(hindi, hindi.text.overline, 'पढ़ना जारी रखें');
    expect(overline.letterSpacing).toBeUndefined();
    expect(overline.textTransform).toBe('uppercase');
  });

  it('gives Nastaliq the taller line it needs, so an Urdu title does not overlap the line below', () => {
    const urdu = themeIn('ur');
    const title = uiText(urdu, urdu.text.cardTitle, 'کہانی');
    expect(title.lineHeight).toBeGreaterThanOrEqual(2 * title.fontSize);
    const arabic = themeIn('ar');
    expect(uiText(arabic, arabic.text.cardTitle, 'قصة').lineHeight).toBe(arabic.text.cardTitle.lineHeight);
  });

  it('keeps Inter for a Latin label in a right-to-left locale, such as the unfoldingWord name', () => {
    const theme = themeIn('ar');
    expect(uiText(theme, theme.text.body, 'unfoldingWord').fontFamily).toBe(theme.text.body.fontFamily);
  });

  it('falls back to the locale script when the text is not a plain string', () => {
    const theme = themeIn('ur');
    expect(uiFont(theme, theme.fontStack.fontCore, 500, undefined).fontFamily).toBe(
      'NotoNastaliqUrdu-Variable',
    );
    expect(uiFont(themeIn('en'), theme.fontStack.fontCore, 500, undefined).fontFamily).toBe(
      'InterDisplay-Medium',
    );
  });

  it('never changes an English app', () => {
    const theme = themeIn('en');
    expect(uiText(theme, theme.text.body, 'Settings')).toEqual(theme.text.body);
  });
});

describe('the text sample a primitive reads its script from', () => {
  it('joins strings and numbers through fragments and nested elements', () => {
    const nested = createElement(Fragment, null, 'قراءة ', 3, createElement('span', null, ' آية'));
    expect(textSample(['قال', nested])).toBe('قالقراءة 3 آية');
  });

  it('is undefined when there is no text at all', () => {
    expect(textSample(createElement('span'))).toBeUndefined();
    expect(textSample(null)).toBeUndefined();
  });
});

describe('content keeps its own script, whatever the app locale', () => {
  it('sets English content in Inter under an Arabic app, and Urdu content in Nastaliq under an English one', () => {
    const arabicApp = themeIn('ar');
    const englishApp = themeIn('en');
    expect(
      contentText(arabicApp, arabicApp.text.body, { language: 'en', sample: 'In the beginning' }).fontFamily,
    ).toBe(arabicApp.text.body.fontFamily);
    expect(
      contentText(englishApp, englishApp.text.body, { language: 'ur', sample: 'شروع میں' }).fontFamily,
    ).toBe('NotoNastaliqUrdu-Variable');
  });

  it('reads direction from the first strong letter', () => {
    expect([directionOf('123 سلام'), directionOf('Hello سلام')]).toEqual(['rtl', 'ltr']);
  });
});
