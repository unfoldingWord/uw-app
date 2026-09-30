import { I18nManager } from 'react-native';

export function rightToLeftLayout(): boolean {
  return I18nManager.isRTL;
}
