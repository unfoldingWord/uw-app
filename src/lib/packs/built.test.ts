import { describe, expect, it } from 'vitest';
import { normalizeEntry } from '../catalog/normalize';
import { plannedAudio, storyImageUrls } from './built';

const asset = (name: string) => ({ name, url: `https://git.door43.org/attachments/${name}`, bytes: 10 });

describe('the burritos the app writes around release assets (ADR 0006)', () => {
  it('keys story audio by story and keeps one asset per story', () => {
    const planned = plannedAudio(
      [
        asset('ahr_obs_v1_02_64kbps.m4a'),
        asset('ahr_obs_v1_01_128kbps.m4a'),
        asset('ahr_obs_v1_01_64kbps.m4a'),
        asset('ahr_obs_v1_notes.pdf'),
      ],
      true,
    );
    expect(planned.map((item) => [item.path, item.scope, item.mimeType])).toEqual([
      ['OBS/OBS_01.m4a', { OBS: ['1'] }, 'audio/mp4'],
      ['OBS/OBS_02.m4a', { OBS: ['2'] }, 'audio/mp4'],
    ]);
    expect(planned[0]?.url).toContain('ahr_obs_v1_01_128kbps.m4a');
  });

  it('keys Bible audio by book and chapter', () => {
    expect(
      plannedAudio(
        [asset('en_ult_v1_rut_001.m4a'), asset('en_ult_v1_1jn_5.mp3'), asset('cover.m4a')],
        false,
      ).map((item) => [item.path, item.scope]),
    ).toEqual([
      ['1JN/1JN_005.mp3', { '1JN': ['5'] }],
      ['RUT/RUT_001.m4a', { RUT: ['1'] }],
    ]);
  });

  it('lists each 360px picture the stories cite, once', () => {
    expect(
      storyImageUrls([
        '![OBS Image](https://cdn.door43.org/obs/jpg/360px/obs-en-01-02.jpg)\n![OBS Image](https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg)',
        '![OBS Image](https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg) https://cdn.door43.org/obs/jpg/2160px/obs-en-01-01.jpg',
      ]),
    ).toEqual([
      'https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg',
      'https://cdn.door43.org/obs/jpg/360px/obs-en-01-02.jpg',
    ]);
  });

  it('reads audio assets only when the catalog entry flags audio, from allowlisted hosts', () => {
    const entry = {
      name: 'ahr_obs',
      owner: 'OBS-TLF',
      branch_or_tag_name: 'v1',
      commit_sha: 'b2a1c3d4e5f60718293a4b5c6d7e8f9012345678',
      subject: 'Open Bible Stories',
      language: 'ahr',
      attachment_types: { audio: true },
      release: {
        assets: [
          {
            name: 'ahr_obs_v1_01_128kbps.m4a',
            size: 5,
            browser_download_url: 'https://git.door43.org/attachments/a',
          },
          { name: 'ahr_obs_v1_02_128kbps.m4a', size: 5, browser_download_url: 'https://tracker.example/b' },
          { name: 'ahr_obs_v1.pdf', size: 5, browser_download_url: 'https://git.door43.org/attachments/c' },
        ],
      },
    };
    expect(normalizeEntry(entry)?.assets).toEqual([
      { name: 'ahr_obs_v1_01_128kbps.m4a', url: 'https://git.door43.org/attachments/a', bytes: 5 },
    ]);
    expect(normalizeEntry({ ...entry, attachment_types: { audio: false } })?.assets).toEqual([]);
  });
});
