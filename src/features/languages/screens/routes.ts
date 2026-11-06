import type { Href } from 'expo-router';

export function downloadedHref(language: string): Href {
  return `/downloaded/${encodeURIComponent(language)}`;
}

export function downloadedResourceHref(language: string, publisher: string, resource: string): Href {
  return `/downloaded/${encodeURIComponent(language)}/${encodeURIComponent(publisher)}/${encodeURIComponent(resource)}`;
}
