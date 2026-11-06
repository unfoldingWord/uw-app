import { AccessibilityInfo, type View } from 'react-native';

export function moveAccessibilityFocus(target: View): void {
  AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
}
