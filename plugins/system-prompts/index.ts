import {
  localeSignOffs,
  offeredLocales,
  releaseGate,
  type Locale,
  type LocaleGate,
  type LocaleSignOffs,
} from '../../src/lib/strings/locales.ts';
import { require as requireTypeScript } from 'tsx/cjs/api';
import type * as TablesModule from '../../src/lib/strings/locales/index.ts';

const { tables } = requireTypeScript(
  '../../src/lib/strings/locales/index.ts',
  import.meta.url,
) as typeof TablesModule;

const promptKey = 'transfer.localNetwork.prompt';

type SystemPrompts = { ios: { NSLocalNetworkUsageDescription: string } };

export function infoPlistString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

export function localNetworkUsage(locale: Locale): string {
  return tables[locale][promptKey] ?? tables.en[promptKey] ?? '';
}

export function systemPromptLocales(
  gate: LocaleGate = releaseGate,
  signOffs: LocaleSignOffs = localeSignOffs,
): Record<string, SystemPrompts> {
  return Object.fromEntries(
    offeredLocales(gate, signOffs).map((locale) => [
      locale,
      { ios: { NSLocalNetworkUsageDescription: infoPlistString(localNetworkUsage(locale)) } },
    ]),
  );
}
