import { Platform } from 'react-native';

export const firstAndroidWithRenderEffectBlur = 31;

export function reducedBlurByDefault(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) < firstAndroidWithRenderEffectBlur;
}
