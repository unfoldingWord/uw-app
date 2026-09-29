import type { Provenance } from '@lib/domain/provenance';
import { useTheme } from '@shared/theme';
import type { StudyWords } from '../../strings';
import { Say } from './Say';

export function Attribution({ words, provenance }: { words: StudyWords; provenance: Provenance }) {
  const theme = useTheme();
  return (
    <Say
      role="caption"
      tone="faint"
      style={{
        marginTop: theme.space.sp4,
        paddingTop: theme.space.sp6,
        paddingHorizontal: theme.space.sp2,
        borderTopWidth: theme.border.borderHairline.width,
        borderTopColor: theme.border.borderHairline.color,
      }}
    >
      {words.t('common.attribution', {
        resource: provenance.title,
        publisher: provenance.publisher,
        version: provenance.tag,
        licence: provenance.licence,
      })}
    </Say>
  );
}
