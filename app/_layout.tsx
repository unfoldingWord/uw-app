import Stack from 'expo-router/stack';
import { hide, preventAutoHideAsync } from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createHomeService } from '@features/home/service';
import { createOnboardingService } from '@features/onboarding/service';
import { createSettingsService, type Appearance } from '@features/settings/service';
import { createKernel, hostOf, isAllowedUrl, type Kernel } from '@lib/kernel';
import { reducedBlurByDefault } from '@platform/display';
import { createPlatformLocale } from '@platform/locale';
import { discoverMigrations } from '@platform/migrations';
import { createPlatformPorts } from '@platform/ports';
import { useThemeFonts } from '@shared/fonts';
import { createBoot, KernelProvider, serviceOf, type BootState } from '@shared/kernel';
import { ThemeProvider, type Scheme } from '@shared/theme';
import { BootFailure } from '@shared/ui';

void preventAutoHideAsync().catch(() => false);

async function openKernel(): Promise<Kernel> {
  const ports = createPlatformPorts({ permits: (url) => isAllowedUrl(url), hostOf });
  const kernel = createKernel(ports, { migrations: discoverMigrations() });
  await kernel.start();
  return kernel;
}

const boot = createBoot(openKernel);

function useBoot(): BootState<Kernel> {
  const [state, setState] = useState<BootState<Kernel>>(boot.state);
  useEffect(() => {
    const stop = boot.subscribe(setState);
    setState(boot.state());
    void boot.start();
    return stop;
  }, []);
  return state;
}

function deviceLocaleTags(): string[] {
  try {
    return [createPlatformLocale().current().tag];
  } catch {
    return [];
  }
}

function retryBoot(): Promise<BootState<Kernel>> {
  return boot.retry();
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

function useResume(kernel: Kernel | undefined): void {
  useEffect(() => {
    if (kernel === undefined) {
      return undefined;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void kernel.resume().catch(() => false);
      }
    });
    return () => subscription.remove();
  }, [kernel]);
}

function useOnboardingNeeded(kernel: Kernel | undefined): boolean {
  const read = () => (kernel === undefined ? true : serviceOf(kernel, createOnboardingService).needed());
  const [needed, setNeeded] = useState<boolean>(read);
  useEffect(() => {
    if (kernel === undefined) {
      return undefined;
    }
    const onboarding = serviceOf(kernel, createOnboardingService);
    setNeeded(onboarding.needed());
    return serviceOf(kernel, createHomeService).onChange(() => setNeeded(onboarding.needed()));
  }, [kernel]);
  return needed;
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
  const state = useBoot();
  const kernel = state.status === 'ready' ? state.booted : undefined;
  const appearance = useAppearance(kernel);
  const needed = useOnboardingNeeded(kernel);
  useResume(kernel);
  const fonts = useThemeFonts();
  const firstBoot = state.status === 'booting' && state.attempt <= 1;
  const settled = !firstBoot && (fonts.loaded || fonts.error !== null);
  useEffect(() => {
    if (settled) {
      hide();
    }
  }, [settled]);
  if (!settled) {
    return null;
  }
  if (kernel === undefined) {
    return (
      <AppShell appearance={appearance}>
        <BootFailure localeTags={deviceLocaleTags()} onRetry={retryBoot} />
      </AppShell>
    );
  }
  return (
    <KernelProvider kernel={kernel}>
      <AppShell appearance={appearance}>
        <Routes needed={needed} />
      </AppShell>
    </KernelProvider>
  );
}
