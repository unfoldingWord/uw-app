export type FontFace = {
  family: string;
  name: string;
  file: string;
  weight: string;
  style: 'normal' | 'italic';
  stretch?: string;
  unicodeRange?: string;
};

export const fontFaces = [
  {
    family: 'Inter Display',
    name: 'InterDisplay-Regular',
    file: 'InterDisplay-Regular.ttf',
    weight: '400',
    style: 'normal',
  },
  {
    family: 'Inter Display',
    name: 'InterDisplay-Medium',
    file: 'InterDisplay-Medium.ttf',
    weight: '500',
    style: 'normal',
  },
  {
    family: 'Inter Display',
    name: 'InterDisplay-SemiBold',
    file: 'InterDisplay-SemiBold.ttf',
    weight: '600',
    style: 'normal',
  },
  {
    family: 'Inter Display',
    name: 'InterDisplay-Bold',
    file: 'InterDisplay-Bold.ttf',
    weight: '700',
    style: 'normal',
  },
  { family: 'Inter', name: 'Inter-Regular', file: 'Inter-Regular.ttf', weight: '400', style: 'normal' },
  { family: 'Inter', name: 'Inter-Medium', file: 'Inter-Medium.ttf', weight: '500', style: 'normal' },
  { family: 'Inter', name: 'Inter-SemiBold', file: 'Inter-SemiBold.ttf', weight: '600', style: 'normal' },
  { family: 'Inter', name: 'Inter-Bold', file: 'Inter-Bold.ttf', weight: '700', style: 'normal' },
  {
    family: 'Nunito Sans',
    name: 'NunitoSans-Variable',
    file: 'NunitoSans-Variable.ttf',
    weight: '200 1000',
    style: 'normal',
    stretch: '75% 125%',
  },
  {
    family: 'Noto Sans Arabic',
    name: 'NotoSansArabic-Variable',
    file: 'NotoSansArabic-Variable.ttf',
    weight: '100 900',
    style: 'normal',
    stretch: '62.5% 100%',
    unicodeRange: 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF',
  },
  {
    family: 'Noto Nastaliq Urdu',
    name: 'NotoNastaliqUrdu-Variable',
    file: 'NotoNastaliqUrdu-Variable.ttf',
    weight: '400 700',
    style: 'normal',
    unicodeRange: 'U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF',
  },
  {
    family: 'Noto Sans Devanagari',
    name: 'NotoSansDevanagari-Variable',
    file: 'NotoSansDevanagari-Variable.ttf',
    weight: '100 900',
    style: 'normal',
    stretch: '62.5% 100%',
    unicodeRange: 'U+0900-097F,U+1CD0-1CFF,U+A8E0-A8FF',
  },
  {
    family: 'Noto Sans Bengali',
    name: 'NotoSansBengali-Variable',
    file: 'NotoSansBengali-Variable.ttf',
    weight: '100 900',
    style: 'normal',
    stretch: '62.5% 100%',
    unicodeRange: 'U+0980-09FF',
  },
  {
    family: 'Noto Sans Myanmar',
    name: 'NotoSansMyanmar-Variable',
    file: 'NotoSansMyanmar-Variable.ttf',
    weight: '100 900',
    style: 'normal',
    stretch: '62.5% 100%',
    unicodeRange: 'U+1000-109F,U+A9E0-A9FF,U+AA60-AA7F',
  },
  {
    family: 'PT Serif',
    name: 'PTSerif-Regular',
    file: 'PTSerif-Regular.ttf',
    weight: '400',
    style: 'normal',
  },
  { family: 'PT Serif', name: 'PTSerif-Italic', file: 'PTSerif-Italic.ttf', weight: '400', style: 'italic' },
  { family: 'PT Serif', name: 'PTSerif-Bold', file: 'PTSerif-Bold.ttf', weight: '700', style: 'normal' },
  {
    family: 'PT Serif',
    name: 'PTSerif-BoldItalic',
    file: 'PTSerif-BoldItalic.ttf',
    weight: '700',
    style: 'italic',
  },
] as const satisfies readonly FontFace[];

export type FontName = (typeof fontFaces)[number]['name'];
