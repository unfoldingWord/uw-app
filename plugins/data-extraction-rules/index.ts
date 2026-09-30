import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import configPlugins from 'expo/config-plugins.js';
import type { ConfigPlugin } from 'expo/config-plugins';

const { AndroidConfig, withAndroidManifest, withDangerousMod } = configPlugins;

const resourceName = 'data_extraction_rules';

export const dataExtractionRulesResource = `@xml/${resourceName}`;

export const dataExtractionRulesSource = join(import.meta.dirname, `${resourceName}.xml`);

export function writeDataExtractionRules(androidProjectRoot: string): string {
  const directory = join(androidProjectRoot, 'app', 'src', 'main', 'res', 'xml');
  mkdirSync(directory, { recursive: true });
  const target = join(directory, `${resourceName}.xml`);
  copyFileSync(dataExtractionRulesSource, target);
  return target;
}

export const withDataExtractionRules: ConfigPlugin = (config) => {
  const withManifest = withAndroidManifest(config, (next) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(next.modResults);
    application.$['android:dataExtractionRules'] = dataExtractionRulesResource;
    return next;
  });
  return withDangerousMod(withManifest, [
    'android',
    (next) => {
      writeDataExtractionRules(next.modRequest.platformProjectRoot);
      return Promise.resolve(next);
    },
  ]);
};
