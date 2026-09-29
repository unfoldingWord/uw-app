import { about } from './about';
import { common } from './common';
import { failures } from './failures';
import { formation } from './formation';
import { home, onboarding } from './home';
import { languages } from './languages';
import { study } from './study';

export const englishAreas = {
  common,
  onboarding,
  home,
  study,
  formation,
  languages,
  about,
  failures,
} as const;

export const en = {
  ...common,
  ...onboarding,
  ...home,
  ...study,
  ...formation,
  ...languages,
  ...about,
  ...failures,
} as const;
