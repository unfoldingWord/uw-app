import Stack from 'expo-router/stack';
import { useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createHomeService } from '@features/home/service';
import { createOnboardingService } from '@features/onboarding/service';
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
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (kernel === undefined) {
      return undefined;
    }
    return serviceOf(kernel, createSettingsService).onAppearance(() => setVersion((current) => current + 1));
  }, [kernel]);
  return kernel === undefined ? {} : serviceOf(kernel, createSettingsService).appearance();
}

function useOnboardingNeeded(kernel: Kernel | undefined): boolean {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (kernel === undefined) {
      return undefined;
    }
    return serviceOf(kernel, createHomeService).onChange(() => setVersion((current) => current + 1));
  }, [kernel]);
  return kernel === undefined ? true : serviceOf(kernel, createOnboardingService).needed();
}

function Routes({ needed }: { needed: boolean }) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needed}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!needed}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="languages" options={{ presentation: 'modal' }} />
        <Stack.Screen name="share" options={{ presentation: 'modal' }} />
        <Stack.Screen name="transfer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="diagnostics" />
      </Stack.Protected>
    </Stack>
  );
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
  const needed = useOnboardingNeeded(kernel);
  const fonts = useThemeFonts();
  if (kernel === undefined || (!fonts.loaded && fonts.error === null)) {
    return null;
  }
  return (
    <KernelProvider kernel={kernel}>
      <AppShell appearance={appearance}>
        <Routes needed={needed} />
      </AppShell>
    </KernelProvider>
  );
}
