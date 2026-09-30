import Stack from 'expo-router/stack';
import { hide, preventAutoHideAsync } from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { reloadAppAsync } from 'expo';
import { AppState, I18nManager, Platform, useColorScheme } from 'react-native';
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
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (kernel === undefined) {
      return undefined;
    }
    return serviceOf(kernel, createSettingsService).onAppearance(() => setVersion((current) => current + 1));
  }, [kernel]);
  return kernel === undefined ? {} : serviceOf(kernel, createSettingsService).appearance();
}

function useLocale(kernel: Kernel | undefined): string | undefined {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (kernel === undefined) {
      return undefined;
    }
    return serviceOf(kernel, createSettingsService).onLocale(() => setVersion((current) => current + 1));
  }, [kernel]);
  return kernel === undefined ? undefined : serviceOf(kernel, createSettingsService).locale();
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

function useLayoutDirection(kernel: Kernel | undefined): void {
  useEffect(() => {
    if (kernel === undefined || Platform.OS === 'web') {
      return undefined;
    }
    const settings = serviceOf(kernel, createSettingsService);
    const follow = () => {
      if (!settings.directionChangeNeeded(I18nManager.isRTL)) {
        return;
      }
      const rightToLeft = settings.layoutDirection() === 'rtl';
      I18nManager.allowRTL(rightToLeft);
      I18nManager.forceRTL(rightToLeft);
      void reloadAppAsync().catch(() => undefined);
    };
    follow();
    return settings.onLayoutDirection(follow);
  }, [kernel]);
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

type AppShellProps = { appearance: Appearance; locale: string | undefined; children?: ReactNode };

function AppShell({ appearance, locale, children }: AppShellProps) {
  const system = useColorScheme();
  const scheme: Scheme = appearance.scheme ?? (system === 'dark' ? 'dark' : 'light');
  const reducedBlur = appearance.reducedBlur ?? reducedBlurByDefault();
  return (
    <SafeAreaProvider>
      <ThemeProvider scheme={scheme} reducedBlur={reducedBlur} {...(locale === undefined ? {} : { locale })}>
        {children}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const state = useBoot();
  const kernel = state.status === 'ready' ? state.booted : undefined;
  const appearance = useAppearance(kernel);
  const locale = useLocale(kernel);
  const needed = useOnboardingNeeded(kernel);
  useResume(kernel);
  useLayoutDirection(kernel);
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
      <AppShell appearance={appearance} locale={deviceLocaleTags()[0]}>
        <BootFailure localeTags={deviceLocaleTags()} onRetry={retryBoot} />
      </AppShell>
    );
  }
  return (
    <KernelProvider kernel={kernel}>
      <AppShell appearance={appearance} locale={locale}>
        <Routes needed={needed} />
      </AppShell>
    </KernelProvider>
  );
}
