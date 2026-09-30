import { imagePackId, type PackId } from '@lib/domain/pack';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Badge, Notice, Row, SectionTitle, useAsyncValue } from '@shared/ui';
import { createLanguagesService } from '../service';
import type { Failures } from './outcomes';

export type ExtrasSectionProps = {
  version: number;
  failures: Failures;
  onInstall: (pack: PackId) => Promise<void>;
};

type Extra = { pack: PackId; title: string; detail: string; installed: boolean };

function ExtraRow({ extra, failures, onInstall }: { extra: Extra } & Omit<ExtrasSectionProps, 'version'>) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  const failure = failures[extra.pack];
  return (
    <Row
      title={extra.title}
      detail={extra.detail}
      trailing={
        extra.installed ? (
          <Badge label={words.t('common.offline')} />
        ) : (
          <GlassButton
            size="sm"
            variant="dark"
            accessibilityHint={extra.title}
            onPress={() => onInstall(extra.pack)}
          >
            {words.t('languages.download')}
          </GlassButton>
        )
      }
      below={failure === undefined ? undefined : <Notice text={words.t(`failure.${failure}`)} />}
    />
  );
}

export function ExtrasSection({ version, failures, onInstall }: ExtrasSectionProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  const storage = useAsyncValue(() => languages.storage(), [version]);
  const current = languages.current();
  const images: Extra = {
    pack: imagePackId,
    title: words.t('resource.images'),
    detail: words.t('resource.images.about'),
    installed: storage.value?.packs.some((pack) => pack.pack === imagePackId) ?? false,
  };
  const audio: Extra[] = (current === undefined ? [] : languages.audio(current)).map((item) => ({
    pack: item.pack,
    title: item.title,
    detail: words.t('resource.audio.about'),
    installed: item.installed,
  }));
  const originals: Extra[] = languages.originals().map((item) => ({
    pack: item.pack,
    title: item.title,
    detail: words.t('resource.original.about'),
    installed: item.installed,
  }));
  return (
    <>
      {languages.imagesAvailable() ? (
        <ExtraRow extra={images} failures={failures} onInstall={onInstall} />
      ) : null}
      {originals.map((extra) => (
        <ExtraRow key={extra.pack} extra={extra} failures={failures} onInstall={onInstall} />
      ))}
      {audio.length === 0 ? null : <SectionTitle>{words.t('resource.audio')}</SectionTitle>}
      {audio.map((extra) => (
        <ExtraRow key={extra.pack} extra={extra} failures={failures} onInstall={onInstall} />
      ))}
    </>
  );
}
