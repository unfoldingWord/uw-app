import { createContext, useContext, type ReactNode } from 'react';
import type { Kernel } from '@lib/kernel';

const KernelContext = createContext<Kernel | undefined>(undefined);

export type KernelProviderProps = { kernel: Kernel; children?: ReactNode };

export function KernelProvider({ kernel, children }: KernelProviderProps) {
  return <KernelContext.Provider value={kernel}>{children}</KernelContext.Provider>;
}

export function useKernel(): Kernel {
  const kernel = useContext(KernelContext);
  if (kernel === undefined) {
    throw new Error('useKernel is called outside KernelProvider; the root layout provides the kernel');
  }
  return kernel;
}
