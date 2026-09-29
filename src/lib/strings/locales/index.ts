import type { Locale } from '../locales';
import { english, type LocaleTable } from '../table';
import { ar } from './ar';
import { bn } from './bn';
import { es419 } from './es-419';
import { fa } from './fa';
import { fr } from './fr';
import { hi } from './hi';
import { id } from './id';
import { my } from './my';
import { nl } from './nl';
import { ptBR } from './pt-BR';
import { ru } from './ru';
import { sw } from './sw';
import { ur } from './ur';
import { vi } from './vi';
import { zhHans } from './zh-Hans';

export const tables: Readonly<Record<Locale, LocaleTable>> = {
  en: english,
  'es-419': es419,
  fr,
  hi,
  ru,
  ar,
  'zh-Hans': zhHans,
  sw,
  'pt-BR': ptBR,
  id,
  vi,
  bn,
  ur,
  fa,
  my,
  nl,
};
