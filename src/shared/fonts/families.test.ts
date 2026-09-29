import { describe, expect, it } from 'vitest';
import { parseFontStack } from '@shared/theme/convert';
import { rootTokens } from '@shared/theme/tokens';
import { fontFaces } from './faces';
import { fontFor, scriptFamilies, shippedFamilies } from './families';

describe('font faces', () => {
  it('loads each face under its file name', () => {
    for (const face of fontFaces) {
      expect(`${face.name}.ttf`).toBe(face.file);
    }
  });

  it('ships every family the token stacks name first, and no other', () => {
    expect(shippedFamilies().sort()).toEqual(
      [
        'Inter',
        'Inter Display',
        'Noto Nastaliq Urdu',
        'Noto Sans Arabic',
        'Noto Sans Bengali',
        'Noto Sans Devanagari',
        'Noto Sans Myanmar',
        'Nunito Sans',
        'PT Serif',
      ].sort(),
    );
  });

  it('takes each script family from the script stacks in the tokens', () => {
    const scriptStack = parseFontStack(rootTokens['--font-script']);
    const urduStack = parseFontStack(rootTokens['--font-script-urdu']);
    expect(urduStack[0]).toBe(scriptFamilies.urdu);
    for (const [script, family] of Object.entries(scriptFamilies)) {
      if (script !== 'urdu') {
        expect(scriptStack).toContain(family);
      }
    }
  });
});

describe('fontFor', () => {
  it('picks the static face for the weight and leaves fontWeight unset', () => {
    expect(fontFor(['Inter Display', 'Inter'], 600)).toEqual({ fontFamily: 'InterDisplay-SemiBold' });
    expect(fontFor(['Inter'], 450)).toEqual({ fontFamily: 'Inter-Regular' });
  });

  it('sets fontWeight for a variable face', () => {
    expect(fontFor(['Nunito Sans', 'Montserrat'], 900)).toEqual({
      fontFamily: 'NunitoSans-Variable',
      fontWeight: '900',
    });
  });

  it('skips families that are not shipped', () => {
    expect(fontFor(['Montserrat', 'PT Serif'], 700, { italic: true })).toEqual({
      fontFamily: 'PTSerif-BoldItalic',
      fontStyle: 'italic',
    });
    expect(fontFor(['system-ui'], 400)).toBeUndefined();
  });

  it('puts the script family first when a script is named', () => {
    expect(fontFor(['Inter'], 500, { script: 'bengali' })).toEqual({
      fontFamily: 'NotoSansBengali-Variable',
      fontWeight: '500',
    });
  });
});
