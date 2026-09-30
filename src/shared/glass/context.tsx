import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';

const ContentColorContext = createContext<string | undefined>(undefined);

const BlurTargetContext = createContext<RefObject<View | null> | undefined>(undefined);

export function ContentColor({ color, children }: { color: string; children?: ReactNode }) {
  return <ContentColorContext.Provider value={color}>{children}</ContentColorContext.Provider>;
}

export function useContentColor(): string | undefined {
  return useContext(ContentColorContext);
}

export function BlurTarget({ target, children }: { target: RefObject<View | null>; children?: ReactNode }) {
  return <BlurTargetContext.Provider value={target}>{children}</BlurTargetContext.Provider>;
}

export function useBlurTarget(): RefObject<View | null> | undefined {
  return useContext(BlurTargetContext);
}
