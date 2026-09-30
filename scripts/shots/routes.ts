import type { ImageVariant } from '@sim/web/image';

export type Mode = {
  readonly name: 'light' | 'dark' | 'reduced-blur' | 'rtl';
  readonly scheme: 'light' | 'dark';
  readonly variant: ImageVariant;
  readonly freshVariant: ImageVariant;
  readonly direction: 'ltr' | 'rtl';
};

export type Shot = {
  readonly name: string;
  readonly path: string;
  readonly fresh?: boolean;
  readonly press?: string;
  readonly scroll?: 'end';
  readonly type?: string;
  readonly modes?: readonly Mode['name'][];
};

const leftToRight: readonly Mode['name'][] = ['light', 'dark', 'reduced-blur'];

export const modes: readonly Mode[] = [
  { name: 'light', scheme: 'light', variant: 'home', freshVariant: 'fresh', direction: 'ltr' },
  { name: 'dark', scheme: 'dark', variant: 'home', freshVariant: 'fresh', direction: 'ltr' },
  {
    name: 'reduced-blur',
    scheme: 'light',
    variant: 'reduced-blur',
    freshVariant: 'fresh',
    direction: 'ltr',
  },
  { name: 'rtl', scheme: 'light', variant: 'rtl', freshVariant: 'fresh-rtl', direction: 'rtl' },
];

export const shots: readonly Shot[] = [
  { name: 'onboarding', path: '/onboarding', fresh: true },
  {
    name: 'onboarding-languages',
    path: '/onboarding',
    fresh: true,
    press: 'Choose your language',
    modes: leftToRight,
  },
  { name: 'home', path: '/' },
  { name: 'study', path: '/study' },
  { name: 'study-passage', path: '/study?reference=RUT%201:16' },
  { name: 'study-chapter', path: '/study?reference=RUT%201' },
  { name: 'study-library', path: '/study/library' },
  { name: 'study-search', path: '/study/search' },
  { name: 'study-article', path: '/study/article/tw/bible/kt/god' },
  { name: 'study-story', path: '/study/story/1' },
  { name: 'formation', path: '/formation' },
  { name: 'formation-groups', path: '/formation/groups' },
  { name: 'formation-session', path: '/formation/session/foundations/1' },
  {
    name: 'formation-session-end',
    path: '/formation/session/foundations/1',
    scroll: 'end',
    modes: leftToRight,
  },
  { name: 'impact', path: '/impact/jeremiah-and-the-occult-king' },
  { name: 'share', path: '/share?kind=passage&ref=RUT%201:16' },
  { name: 'transfer', path: '/transfer' },
  { name: 'transfer-send', path: '/transfer', press: 'Send', modes: leftToRight },
  { name: 'transfer-receive', path: '/transfer', press: 'Receive', modes: leftToRight },
  { name: 'transfer-typed', path: '/transfer?address=192.0.2.1%3A47000&code=0427' },
  { name: 'study-search-reference', path: '/study/search', type: 'Ruth 1:16', modes: leftToRight },
  { name: 'study-audio', path: '/study?reference=RUT%201:16', press: 'Play audio', modes: leftToRight },
  { name: 'study-word-links', path: '/study?reference=RUT%201:16', press: 'Word links', modes: leftToRight },
  { name: 'languages', path: '/languages' },
  { name: 'settings', path: '/settings' },
  { name: 'about', path: '/about' },
  { name: 'licence', path: '/licence' },
  { name: 'privacy', path: '/privacy' },
  { name: 'diagnostics', path: '/diagnostics' },
];
