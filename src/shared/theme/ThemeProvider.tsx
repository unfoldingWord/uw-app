import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createTheme, defaultLocale, type Scheme, type Theme } from './createTheme';

const ThemeContext = createContext<Theme>(createTheme({ scheme: 'light', reducedBlur: false }));

export type ThemeProviderProps = {
  scheme: Scheme;
  reducedBlur: boolean;
  reducedMotion?: boolean;
  locale?: string;
  children?: ReactNode;
};

export function ThemeProvider({
  scheme,
  reducedBlur,
  reducedMotion = false,
  locale = defaultLocale,
  children,
}: ThemeProviderProps) {
  const theme = useMemo(
    () => createTheme({ scheme, reducedBlur, reducedMotion, locale }),
    [scheme, reducedBlur, reducedMotion, locale],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
