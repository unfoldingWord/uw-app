import { requireOptionalNativeModule } from 'expo';

export type RadioService = {
  readonly host: string;
  readonly port: number;
  readonly code: string;
  readonly platform: string;
};

export type RadioPackage = { readonly uri: string; readonly bytes: number };

export type RadioModule = {
  register(name: string, port: number, code: string, platform: string): Promise<void>;
  unregister(): Promise<void>;
  browse(timeoutMs: number): Promise<RadioService[]>;
  localAddress(): Promise<string | null>;
  appPackage(): Promise<RadioPackage | null>;
  install(contentUri: string): Promise<void>;
};

export const installNotPermitted = 'ERR_INSTALL_NOT_PERMITTED';

export function radioModule(): RadioModule | null {
  return requireOptionalNativeModule<RadioModule>('UwRadio');
}
