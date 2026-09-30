import { useSyncExternalStore } from 'react';
import type { Theme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';

let measured = 0;

const listeners = new Set<() => void>();

export function restingTabBarHeight(theme: Theme): number {
  return prototypeValues.tabBar.item + 2 * theme.space.sp3;
}

export function reportTabBarHeight(height: number): void {
  const rounded = Math.ceil(height);
  if (rounded === measured) {
    return;
  }
  measured = rounded;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function tabBarGrowth(theme: Theme, height: number): number {
  return Math.max(0, height - restingTabBarHeight(theme));
}

export function useTabBarGrowth(theme: Theme): number {
  const height = useSyncExternalStore(
    subscribe,
    () => measured,
    () => measured,
  );
  return tabBarGrowth(theme, height);
}
