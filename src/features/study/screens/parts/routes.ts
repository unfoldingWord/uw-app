import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import type { LinkTarget } from '../../service';

export const studyRoutes = {
  study: '/study',
  library: '/study/library',
  search: '/study/search',
  languages: '/languages',
  settings: '/settings',
  about: '/about',
  share: '/share',
} as const;

export function articleHref(id: string): Href {
  return `/study/article/${id.split('/').map(encodeURIComponent).join('/')}`;
}

export function storyHref(story: number): Href {
  return `/study/story/${String(story)}`;
}

export function passageHref(reference: string): Href {
  return { pathname: studyRoutes.study, params: { reference } };
}

export function shareHref(kind: 'passage' | 'article' | 'story', reference: string, language: string): Href {
  return { pathname: studyRoutes.share, params: { kind, ref: reference, language } };
}

export function useOpenTarget(): (target: LinkTarget) => void {
  const router = useRouter();
  return useCallback(
    (target: LinkTarget) => {
      switch (target.kind) {
        case 'article':
          router.push(articleHref(target.id));
          return;
        case 'story':
          router.push(storyHref(target.story));
          return;
        case 'passage':
          router.navigate(passageHref(target.reference));
          return;
      }
    },
    [router],
  );
}
