import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExportedConfig } from 'expo/config-plugins';
import { afterEach, describe, expect, it } from 'vitest';
import {
  dataExtractionRulesResource,
  dataExtractionRulesSource,
  withDataExtractionRules,
  writeDataExtractionRules,
} from './index.ts';

const made: string[] = [];

afterEach(() => {
  for (const directory of made.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('withDataExtractionRules', () => {
  it('writes the rules into the Android resources prebuild compiles', () => {
    const androidProjectRoot = mkdtempSync(join(tmpdir(), 'uw-data-extraction-'));
    made.push(androidProjectRoot);
    const written = writeDataExtractionRules(androidProjectRoot);
    expect(written).toBe(
      join(androidProjectRoot, 'app', 'src', 'main', 'res', 'xml', 'data_extraction_rules.xml'),
    );
    expect(readFileSync(written, 'utf8')).toBe(readFileSync(dataExtractionRulesSource, 'utf8'));
  });

  it('adds a manifest mod and a file mod on Android only', () => {
    const config: ExportedConfig = withDataExtractionRules({ name: 'unfoldingWord', slug: 'unfoldingword' });
    expect(Object.keys(config.mods?.android ?? {}).sort()).toEqual(['dangerous', 'manifest']);
    expect(config.mods?.ios).toBeUndefined();
    expect(dataExtractionRulesResource).toBe('@xml/data_extraction_rules');
  });
});
