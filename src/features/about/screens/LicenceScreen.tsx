import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { createAboutService } from '../service';
import { Card, SectionTitle } from './parts/Card';
import { Line } from './parts/Line';
import { Screen } from './parts/Screen';

export default function LicenceScreen() {
  const service = useService(createAboutService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const [licence, setLicence] = useState(() => service.licence());
  useFocusEffect(useCallback(() => setLicence(service.licence()), [service]));

  return (
    <Screen title={licence.title} back={{ label: words.t('common.back'), onPress: () => router.back() }}>
      <Card level={2}>
        <Line role="body" tone="title">
          {licence.partners}
        </Line>
        <GlassButton
          full
          variant="dark"
          accessibilityHint={words.t('common.opensBrowser')}
          onPress={() => router.push(licence.give.url)}
        >
          {licence.give.label}
        </GlassButton>
      </Card>
      <Card level={1}>
        {licence.notices.map((notice) => (
          <Line key={notice} role="body" tone="body">
            {notice}
          </Line>
        ))}
      </Card>
      <SectionTitle>{licence.onPhoneTitle}</SectionTitle>
      {licence.onPhone.length === 0 ? (
        <Line role="body" tone="dim">
          {words.t('storage.empty')}
        </Line>
      ) : (
        <Card level={1} style={{ gap: theme.space.sp6 }}>
          {licence.onPhone.map((row) => (
            <Line key={`${row.publisher}/${row.resource}/${row.version}`} role="label" tone="title">
              {words.t('common.attribution', {
                resource: row.title,
                publisher: row.publisher,
                version: row.version,
                licence: row.licence,
              })}
            </Line>
          ))}
        </Card>
      )}
    </Screen>
  );
}
