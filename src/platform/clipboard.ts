import { setStringAsync } from 'expo-clipboard';
import type { Clipboard } from '@lib/ports';
import { messageOf, portError } from './errors';

export function createPlatformClipboard(): Clipboard {
  return {
    copy: async (text) => {
      let written: boolean;
      try {
        written = await setStringAsync(text);
      } catch (error) {
        throw portError('clipboard.unavailable', messageOf(error));
      }
      if (!written) {
        throw portError('clipboard.unavailable', 'the system did not take the text');
      }
    },
  };
}
