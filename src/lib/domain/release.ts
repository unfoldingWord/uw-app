export type ReleaseRef = {
  publisher: string;
  resource: string;
  language: string;
  tag: string;
};

export type Release = ReleaseRef & {
  commit: string;
  title: string;
  subject: string;
  archiveUrl: string;
  published: string;
};

export const door43 = 'https://git.door43.org';

export function releaseKey(release: ReleaseRef): string {
  return `${release.publisher}/${release.resource}@${release.tag}`;
}

export function resourceKey(release: Pick<ReleaseRef, 'publisher' | 'resource'>): string {
  return `${release.publisher}/${release.resource}`;
}

export function archiveUrlOf(release: Pick<ReleaseRef, 'publisher' | 'resource' | 'tag'>): string {
  return `${door43}/${release.publisher}/${release.resource}/sb/${release.tag}.zip`;
}

export function refOf(release: ReleaseRef): ReleaseRef {
  return {
    publisher: release.publisher,
    resource: release.resource,
    language: release.language,
    tag: release.tag,
  };
}
