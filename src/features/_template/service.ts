import type { Kernel } from '@lib/kernel';

export type TemplateService = {
  journalSize(): number;
};

export function createTemplateService(kernel: Kernel): TemplateService {
  return {
    journalSize: () => kernel.journal.stats().size,
  };
}
