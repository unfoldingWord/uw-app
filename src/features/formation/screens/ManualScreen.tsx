import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { SectionList } from 'react-native';
import { useService } from '@shared/kernel';
import { Card, Gap, Loading, Row, Screen, SectionTitle, ThemedText } from '@shared/ui';
import { createFormationService, type TrainingLesson } from '../service';
import { courseOf, lessonLine, standingOf } from './parts/course';
import { useLoad } from './parts/useLoad';
import { sessionHref } from './parts/wording';

export default function ManualScreen() {
  const service = useService(createFormationService);
  const router = useRouter();
  const words = service.words();
  const { manual } = useLocalSearchParams<{ manual: string }>();
  const load = useCallback(() => courseOf(service), [service]);
  const loaded = useLoad(load);
  const course = loaded.value;
  const group = course?.group;
  const unit = course?.outline.units.find((item) => item.manual === manual);
  const language = service.language();
  const languageName = language === undefined ? '' : service.languageName(language);
  const back = { label: words.t('common.back'), onPress: () => router.back() };
  const sections = (unit?.sections ?? []).map((section, index) => ({
    key: `${index}`,
    title: section.title,
    data: section.lessons,
  }));

  const renderLesson = ({ item }: { item: TrainingLesson }) => {
    const standing = standingOf(group, item);
    return (
      <Row
        title={item.title}
        detail={lessonLine(words, group, item)}
        selected={standing === 'current'}
        {...(standing === 'ahead' ? {} : { icon: standing === 'current' ? 'compass' : 'check' })}
        chevron
        press={{
          accessibilityLabel: `${item.title}, ${lessonLine(words, group, item)}`,
          onPress: () => router.push(sessionHref('training', item.number)),
        }}
      />
    );
  };

  return (
    <Screen
      title={unit?.title ?? words.t('formation.training')}
      subtitle={
        unit === undefined ? undefined : words.plural('formation.training.unit.count', unit.lessons.length)
      }
      back={back}
      list={(frame) => (
        <SectionList
          {...frame.props}
          sections={sections}
          keyExtractor={(lesson) => lesson.id}
          renderItem={renderLesson}
          renderSectionHeader={({ section }) =>
            section.title === undefined ? null : <SectionTitle>{section.title}</SectionTitle>
          }
          ItemSeparatorComponent={() => <Gap size={frame.gap} />}
          SectionSeparatorComponent={() => <Gap size={frame.gap} />}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            course === undefined && loaded.loading ? (
              <Loading label={words.t('common.busy')} />
            ) : course === undefined ? null : (
              <Card level={1}>
                <ThemedText variant="body" tone="title">
                  {words.t('formation.training.empty', { language: languageName })}
                </ThemedText>
              </Card>
            )
          }
          ListFooterComponent={
            loaded.failure === undefined ? null : (
              <ThemedText variant="caption" tone="body">
                {words.t(`failure.${loaded.failure}`)}
              </ThemedText>
            )
          }
        />
      )}
    />
  );
}
