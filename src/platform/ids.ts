import { randomUUID } from 'expo-crypto';
import type { Ids } from '@lib/ports';

export function createPlatformIds(): Ids {
  return { next: () => randomUUID() };
}
