import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Share } from 'react-native';
import type { Provenance } from '@lib/domain/provenance';
import type { DevicePlatform, ShareOutcome, SharePayload, ShareSheet } from '@lib/ports';
import { messageOf, portError } from './errors';

export type PlatformShareSheetOptions = { platform: DevicePlatform; uriOf(path: string): string };

function provenanceLine(provenance: Provenance): string {
  return `${provenance.title} · ${provenance.publisher}/${provenance.resource} ${provenance.tag} · ${provenance.licence}`;
}

function withProvenance(payload: SharePayload): string {
  const missing = payload.provenance.map(provenanceLine).filter((line) => !payload.text.includes(line));
  return [payload.text, ...missing].filter((part) => part !== '').join('\n');
}

async function shareText(title: string, message: string, url?: string): Promise<ShareOutcome> {
  const result = await Share.share(url === undefined ? { title, message } : { title, message, url });
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}

export function createPlatformShareSheet(options: PlatformShareSheetOptions): ShareSheet {
  return {
    share: async (payload) => {
      const message = withProvenance(payload);
      try {
        if (payload.file === undefined) {
          return await shareText(payload.title, message);
        }
        const uri = options.uriOf(payload.file.path);
        if (options.platform === 'ios') {
          return await shareText(payload.title, message, uri);
        }
        if (!(await isAvailableAsync())) {
          throw portError('share.unavailable', 'the system has no share sheet');
        }
        await shareAsync(uri, { mimeType: payload.file.mimeType, dialogTitle: payload.title });
        return 'shared';
      } catch (error) {
        throw portError('share.unavailable', messageOf(error));
      }
    },
  };
}
