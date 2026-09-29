import { describe, expect, it } from 'vitest';
import { redirectSystemPath } from './intent';

describe('the system path of a file another app opened the app with (SH-3)', () => {
  it('sends a handed file to the Languages modal, which asks before installing', () => {
    const inbox = 'file:///var/mobile/Containers/Data/Application/A1/Documents/Inbox/qab_obs.zip';
    expect(redirectSystemPath({ path: inbox, initial: true })).toBe(
      `/languages?opened=${encodeURIComponent(inbox)}`,
    );
    const shared = 'content://com.android.externalstorage.documents/document/primary%3ADownload%2Fqab.zip';
    const target = redirectSystemPath({ path: shared, initial: false });
    expect(new URLSearchParams(target.split('?')[1]).get('opened')).toBe(shared);
  });

  it('leaves every other path to the router', () => {
    expect(redirectSystemPath({ path: '/study', initial: true })).toBe('/study');
    expect(redirectSystemPath({ path: 'unfoldingword://settings', initial: false })).toBe(
      'unfoldingword://settings',
    );
  });
});
