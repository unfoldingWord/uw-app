import '@platform/intl';
import { Slot } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createSettingsService, type Appearance } from '@features/settings/service';
import { createKernel, hostOf, isAllowedUrl, type Kernel } from '@lib/kernel';
import { reducedBlurByDefault } from '@platform/display';
import { discoverMigrations } from '@platform/migrations';
import { createPlatformPorts } from '@platform/ports';
import { useThemeFonts } from '@shared/fonts';
import { KernelProvider, serviceOf } from '@shared/kernel';
import { ThemeProvider, type Scheme } from '@shared/theme';

let booting: Promise<Kernel> | undefined;

function bootKernel(): Promise<Kernel> {
  booting ??= (async () => {
    const ports = createPlatformPorts({ permits: (url) => isAllowedUrl(url), hostOf });
    const kernel = createKernel(ports, { migrations: discoverMigrations() });
    await kernel.start();
    return kernel;
  })();
  return booting;
}

function useBootedKernel(): Kernel | undefined {
  const [kernel, setKernel] = useState<Kernel | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    void bootKernel().then((booted) => {
      if (mounted) {
        setKernel(booted);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  return kernel;
}

function useAppearance(kernel: Kernel | undefined): Appearance {
  const [appearance, setAppearance] = useState<Appearance>(() =>
    kernel === undefined ? {} : serviceOf(kernel, createSettingsService).appearance(),
  );
  useEffect(() => {
    if (kernel === undefined) {
      return undefined;
    }
    const settings = serviceOf(kernel, createSettingsService);
    setAppearance(settings.appearance());
    return settings.onAppearance(setAppearance);
  }, [kernel]);
  return appearance;
}

function AppShell({ appearance, children }: { appearance: Appearance; children?: ReactNode }) {
  const system = useColorScheme();
  const scheme: Scheme = appearance.scheme ?? (system === 'dark' ? 'dark' : 'light');
  const reducedBlur = appearance.reducedBlur ?? reducedBlurByDefault();
  return (
    <SafeAreaProvider>
      <ThemeProvider scheme={scheme} reducedBlur={reducedBlur}>
        {children}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const kernel = useBootedKernel();
  const appearance = useAppearance(kernel);
  const fonts = useThemeFonts();
  if (kernel === undefined || (!fonts.loaded && fonts.error === null)) {
    return null;
  }
  return (
    <KernelProvider kernel={kernel}>
      <AppShell appearance={appearance}>
        <Slot />
      </AppShell>
    </KernelProvider>
  );
}
