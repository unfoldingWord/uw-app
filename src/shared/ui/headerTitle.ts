import type { TextStyle } from 'react-native';
import { uiText, type TextStyleTokens, type Theme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';

export type TitleSize = 'screen' | 'subScreen' | 'detail';

export function titleSize(back: boolean, centred: boolean): TitleSize {
  if (!back) {
    return 'screen';
  }
  return centred ? 'detail' : 'subScreen';
}

function scaled(resolved: TextStyleTokens, fontSize: number, lineHeightRatio: number, scripted: boolean) {
  const ratio = scripted
    ? Math.max(lineHeightRatio, resolved.lineHeight / resolved.fontSize)
    : lineHeightRatio;
  return {
    fontSize,
    lineHeight: fontSize * ratio,
    letterSpacing:
      resolved.letterSpacing === undefined
        ? undefined
        : (resolved.letterSpacing / resolved.fontSize) * fontSize,
  };
}

export function titleStyle(theme: Theme, size: TitleSize, sample: string | undefined): TextStyle {
  switch (size) {
    case 'screen':
      return {};
    case 'subScreen': {
      const resolved = uiText(theme, theme.text.hero, sample);
      const scripted = resolved.fontFamily !== theme.text.hero.fontFamily;
      return scaled(resolved, prototypeValues.header.subScreenTitle, theme.lineHeight.lhHero, scripted);
    }
    case 'detail': {
      const resolved = uiText(theme, theme.text.body, sample);
      const scripted = resolved.fontFamily !== theme.text.body.fontFamily;
      return scaled(
        resolved,
        theme.fontSize.fsSubtitle,
        prototypeValues.header.detailTitleLineHeight,
        scripted,
      );
    }
  }
}
