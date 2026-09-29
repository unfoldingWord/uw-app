import { Slot } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createKernel, type Kernel } from '@lib/kernel';
import { hostOf, isAllowedUrl } from '@lib/network';
import { reducedBlurByDefault } from '@platform/display';
import { discoverMigrations } from '@platform/migrations';
import { createPlatformPorts } from '@platform/ports';
import { useThemeFonts } from '@shared/fonts';
import { KernelProvider } from '@shared/kernel';
import { ThemeProvider, type Scheme } from '@shared/theme';

type Appearance = { scheme?: Scheme; reducedBlur?: boolean };

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

function AppShell({ appearance, children }: { appearance: Appearance; children?: ReactNode }) {
  const system = useColorScheme();
  const scheme = appearance.scheme ?? (system === 'dark' ? 'dark' : 'light');
  const reducedBlur = appearance.reducedBlur ?? reducedBlurByDefault();
  return (
    <SafeAreaProvider>
      <ThemeProvider scheme={scheme} reducedBlur={reducedBlur}>
        {children}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const systemAppearance: Appearance = Object.freeze({});

export default function RootLayout() {
  const kernel = useBootedKernel();
  const fonts = useThemeFonts();
  if (kernel === undefined || (!fonts.loaded && fonts.error === null)) {
    return null;
  }
  return (
    <KernelProvider kernel={kernel}>
      <AppShell appearance={systemAppearance}>
        <Slot />
      </AppShell>
    </KernelProvider>
  );
}
