import { describe, expect, it } from 'vitest';
import { isStudyResource, readingOfText } from './readings';

const named = (abbreviation: string, name: string) => ({
  abbreviation: { en: abbreviation },
  name: { en: name },
});

describe('literal or simplified, from the resource and its burrito (ST-3)', () => {
  it.each([
    ['en_ult', 'en', 'literal'],
    ['en_ust', 'en', 'simplified'],
    ['es-419_glt', 'es-419', 'literal'],
    ['es-419_gst', 'es-419', 'simplified'],
    ['ru_rlob', 'ru', 'literal'],
    ['ru_rsob', 'ru', 'simplified'],
    ['hi_irv', 'hi', 'literal'],
    ['bn_irv', 'bn', 'literal'],
    ['id_ayt', 'id', 'literal'],
    ['fr_ulb', 'fr', 'literal'],
    ['vi_udb', 'vi', 'simplified'],
    ['pt-br_ulb', 'pt-br', 'literal'],
    ['qaa_ust', 'qaa', 'simplified'],
  ])('%s is %s', (resource, language, reading) => {
    expect(readingOfText(resource, language, named('', ''))).toBe(reading);
  });

  it('reads the burrito abbreviation when the repository name says nothing', () => {
    expect(readingOfText('xx_bible', 'xx', named('gst', 'Texto'))).toBe('simplified');
    expect(readingOfText('xx_bible', 'xx', named('GLT', 'Texto'))).toBe('literal');
  });

  it('reads the burrito name last, and takes a text it cannot place as literal', () => {
    expect(readingOfText('xx_bible', 'xx', named('xb', 'Simplified Text'))).toBe('simplified');
    expect(readingOfText('xx_bible', 'xx', { abbreviation: {}, name: { es: 'Texto Simplificado' } })).toBe(
      'simplified',
    );
    expect(readingOfText('xx_bible', 'xx', named('xb', 'Dynamic Bible'))).toBe('simplified');
    expect(readingOfText('xx_bible', 'xx', named('xb', 'Literal Text'))).toBe('literal');
    expect(readingOfText('xx_bible', 'xx', named('xb', 'Holy Bible'))).toBe('literal');
  });
});

describe('the Bible texts in the tc-ready catalog (CI run 36618141715)', () => {
  it.each([
    ['ar_avd', 'ar', {}, 'literal'],
    ['ar_arst', 'ar', {}, 'simplified'],
    ['ar_nav', 'ar', {}, 'simplified'],
    ['en_bsb', 'en', {}, 'literal'],
    ['en_t4t', 'en', {}, 'simplified'],
    ['es-419_tpl', 'es-419', { en: 'TPL' }, 'literal'],
    ['es-419_xyz', 'es-419', { en: 'GST' }, 'simplified'],
  ] as const)('%s (%s) reads as expected', (resource, language, abbreviation, reading) => {
    expect(readingOfText(resource, language, { abbreviation, name: {} })).toBe(reading);
  });

  it('reads "Texto Puente Simple" by its name as simplified', () => {
    expect(
      readingOfText('xx_bible', 'es-419', { abbreviation: {}, name: { en: 'Texto Puente Simple' } }),
    ).toBe('simplified');
  });
});

describe('study helps, apart from translation helps', () => {
  it.each([
    ['en_sn', 'en', true],
    ['en_sq', 'en', true],
    ['en_obs-sn', 'en', true],
    ['qaa_obs-sq', 'qaa', true],
    ['en_tn', 'en', false],
    ['en_tq', 'en', false],
    ['en_obs-tn', 'en', false],
  ])('%s is study helps: %s', (resource, language, study) => {
    expect(isStudyResource(resource, language)).toBe(study);
  });
});
