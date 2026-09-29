export type Release = {
  publisher: string;
  resource: string;
  language: string;
  tag: string;
  commit: string;
  title: string;
  subject: string;
  archiveUrl: string;
  published: string;
};

export function releaseKey(release: Pick<Release, 'publisher' | 'resource' | 'language' | 'tag'>): string {
  return `${release.publisher}/${release.language}_${release.resource}@${release.tag}`;
}
