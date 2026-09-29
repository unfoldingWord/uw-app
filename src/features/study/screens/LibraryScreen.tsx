import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassIconButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { createStudyService, type LibraryCard } from '../service';
import { failureText } from './parts/failure';
import { ScreenFrame, TopBar } from './parts/Frame';
import { LibraryCardView } from './parts/LibraryCardView';
import { studyRoutes } from './parts/routes';
import { Say } from './parts/Say';
import { StatePanel } from './parts/StatePanel';
import { useLoaded } from './parts/useLoaded';

export default function LibraryScreen() {
  const service = useService(createStudyService);
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const words = service.words();
  const [failures, setFailures] = useState<Readonly<Record<string, string>>>({});
  const load = useCallback(() => service.library(), [service]);
  const { value, reload } = useLoaded(load);

  const download = async (card: LibraryCard) => {
    if (card.pack === undefined) {
      return;
    }
    const pending = service.download(card.pack);
    await reload();
    const outcome = await pending;
    setFailures((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([type]) => type !== card.type));
      return outcome.ok ? rest : { ...rest, [card.type]: failureText(words, outcome.code) };
    });
    await reload();
  };

  return (
    <ScreenFrame>
      <TopBar
        backLabel={words.t('common.back')}
        overline={value?.overline}
        title={words.t('library.title')}
        trailing={
          <GlassIconButton
            label={words.t('library.about')}
            size={theme.space.sp14}
            onPress={() => router.push(studyRoutes.about)}
          >
            <Icon name="sparkle" />
          </GlassIconButton>
        }
      />
      {value === undefined ? null : value.language === undefined ? (
        <StatePanel
          message={words.t('study.noLanguage')}
          action={{
            label: words.t('study.noLanguage.action'),
            onPress: () => router.push(studyRoutes.languages),
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            gap: theme.space.gapStack,
            paddingHorizontal: theme.space.gutterScreen,
            paddingTop: theme.space.sp8,
            paddingBottom: insets.bottom + theme.space.sp12,
          }}
        >
          {value.cards.length === 0 ? (
            <Say role="body" tone="body">
              {words.t('state.nothingPublished', { language: value.language })}
            </Say>
          ) : (
            value.cards.map((card) => (
              <LibraryCardView
                key={card.type}
                words={words}
                card={card}
                failure={failures[card.type]}
                onDownload={download}
              />
            ))
          )}
          <Say role="caption" tone="faint" style={{ paddingHorizontal: theme.space.sp2 }}>
            {value.footer}
          </Say>
        </ScrollView>
      )}
    </ScreenFrame>
  );
}
