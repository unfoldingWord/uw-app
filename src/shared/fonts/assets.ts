import interDisplayRegular from '@design-system/assets/fonts/InterDisplay-Regular.ttf';
import interDisplayMedium from '@design-system/assets/fonts/InterDisplay-Medium.ttf';
import interDisplaySemiBold from '@design-system/assets/fonts/InterDisplay-SemiBold.ttf';
import interDisplayBold from '@design-system/assets/fonts/InterDisplay-Bold.ttf';
import interRegular from '@design-system/assets/fonts/Inter-Regular.ttf';
import interMedium from '@design-system/assets/fonts/Inter-Medium.ttf';
import interSemiBold from '@design-system/assets/fonts/Inter-SemiBold.ttf';
import interBold from '@design-system/assets/fonts/Inter-Bold.ttf';
import nunitoSansVariable from '@design-system/assets/fonts/NunitoSans-Variable.ttf';
import notoSansArabicVariable from '@design-system/assets/fonts/NotoSansArabic-Variable.ttf';
import notoNastaliqUrduVariable from '@design-system/assets/fonts/NotoNastaliqUrdu-Variable.ttf';
import notoSansDevanagariVariable from '@design-system/assets/fonts/NotoSansDevanagari-Variable.ttf';
import notoSansBengaliVariable from '@design-system/assets/fonts/NotoSansBengali-Variable.ttf';
import notoSansMyanmarVariable from '@design-system/assets/fonts/NotoSansMyanmar-Variable.ttf';
import pTSerifRegular from '@design-system/assets/fonts/PTSerif-Regular.ttf';
import pTSerifItalic from '@design-system/assets/fonts/PTSerif-Italic.ttf';
import pTSerifBold from '@design-system/assets/fonts/PTSerif-Bold.ttf';
import pTSerifBoldItalic from '@design-system/assets/fonts/PTSerif-BoldItalic.ttf';
import type { FontName } from './faces';

export const fontAssets = {
  'InterDisplay-Regular': interDisplayRegular,
  'InterDisplay-Medium': interDisplayMedium,
  'InterDisplay-SemiBold': interDisplaySemiBold,
  'InterDisplay-Bold': interDisplayBold,
  'Inter-Regular': interRegular,
  'Inter-Medium': interMedium,
  'Inter-SemiBold': interSemiBold,
  'Inter-Bold': interBold,
  'NunitoSans-Variable': nunitoSansVariable,
  'NotoSansArabic-Variable': notoSansArabicVariable,
  'NotoNastaliqUrdu-Variable': notoNastaliqUrduVariable,
  'NotoSansDevanagari-Variable': notoSansDevanagariVariable,
  'NotoSansBengali-Variable': notoSansBengaliVariable,
  'NotoSansMyanmar-Variable': notoSansMyanmarVariable,
  'PTSerif-Regular': pTSerifRegular,
  'PTSerif-Italic': pTSerifItalic,
  'PTSerif-Bold': pTSerifBold,
  'PTSerif-BoldItalic': pTSerifBoldItalic,
} as const satisfies Record<FontName, number>;
