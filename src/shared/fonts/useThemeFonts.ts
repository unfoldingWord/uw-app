import { useFonts } from 'expo-font';
import { fontAssets } from './assets';

export function useThemeFonts(): { loaded: boolean; error: Error | null } {
  const [loaded, error] = useFonts(fontAssets);
  return { loaded, error };
}
