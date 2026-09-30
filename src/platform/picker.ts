import { getDocumentAsync } from 'expo-document-picker';
import type { Picker } from '@lib/ports';
import { messageOf, portError } from './errors';

const archiveTypes: readonly string[] = [
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
];

export function createPlatformPicker(): Picker {
  return {
    pickArchive: async () => {
      try {
        const result = await getDocumentAsync({
          type: [...archiveTypes],
          copyToCacheDirectory: true,
          multiple: false,
        });
        const [asset] = result.assets ?? [];
        return result.canceled || asset === undefined ? undefined : { uri: asset.uri };
      } catch (error) {
        throw portError('files.io', `the document picker failed: ${messageOf(error)}`);
      }
    },
  };
}
