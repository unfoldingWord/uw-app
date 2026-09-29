import type { FailureCode } from '@lib/domain/failures';
import type { Kernel } from '@lib/kernel';
import { diagnosticsWords, type DiagnosticsWords } from './strings';

export type DiagnosticsView = { readonly title: string; readonly body: string; readonly action: string };

export type DiagnosticsDone =
  | { readonly state: 'shared' }
  | { readonly state: 'dismissed' }
  | { readonly state: 'failed'; readonly code: FailureCode; readonly message: string };

export type DiagnosticsService = {
  words(): DiagnosticsWords;
  view(): DiagnosticsView;
  share(): Promise<DiagnosticsDone>;
};

export function createDiagnosticsService(kernel: Kernel): DiagnosticsService {
  const words = (): DiagnosticsWords => diagnosticsWords(kernel);

  return {
    words,
    view() {
      const current = words();
      return {
        title: current.t('diagnostics.title'),
        body: current.t('diagnostics.body'),
        action: current.t('diagnostics.action'),
      };
    },
    async share() {
      const report = { journal: kernel.journal.export(), snapshot: kernel.snapshot() };
      const result = await kernel.share.journal(report, { locale: kernel.preferences.locale() });
      return result.ok
        ? { state: result.outcome }
        : { state: 'failed', code: result.code, message: words().t(`failure.${result.code}`) };
    },
  };
}
