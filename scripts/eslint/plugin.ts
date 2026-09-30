import type { ESLint } from 'eslint';
import { noComments } from './no-comments.ts';
import { relativeImportsStayInUnit } from './relative-imports-stay-in-unit.ts';

export const uwPlugin: ESLint.Plugin = {
  meta: { name: 'uw' },
  rules: {
    'no-comments': noComments,
    'relative-imports-stay-in-unit': relativeImportsStayInUnit,
  },
};
