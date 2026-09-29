import type {} from 'expo/types';
import type { Migration } from '@lib/ports';
import { collectMigrations } from './discover';

export function discoverMigrations(): readonly Migration[] {
  return collectMigrations([
    require.context('../../migrations', false, /^\.\/\d{4}-[a-z0-9-]+\.ts$/),
    require.context('../features', true, /^\.\/[^/]+\/migrations\/\d{4}-[a-z0-9-]+\.ts$/),
  ]);
}
