import { useState } from 'react';
import { View } from 'react-native';
import { GlassButton, GlassInput, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Logo, ScreenScaffold, ThemedText } from '@shared/ui';
import { createOnboardingService, type ChooseOptions } from '../service';
import { ChooseLanguage } from './ChooseLanguage';

type Step = 'welcome' | 'choose';

function optionsOf(name: string): ChooseOptions {
  const trimmed = name.trim();
  return trimmed === '' ? {} : { name: trimmed };
}

export default function OnboardingScreen() {
  const onboarding = useService(createOnboardingService);
  const theme = useTheme();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const copy = onboarding.copy();

  if (step === 'choose') {
    return (
      <ChooseLanguage
        onBack={() => setStep('welcome')}
        onChoose={async (language) => {
          await onboarding.choose(language, optionsOf(name));
        }}
      />
    );
  }

  return (
    <ScreenScaffold>
      <View style={{ paddingTop: theme.space.sp14 }}>
        <Logo label={copy.logo} />
      </View>
      <View style={{ flexGrow: 1, minHeight: theme.space.sp13 }} />
      <ThemedText variant="overline" tone="dim">
        {copy.overline}
      </ThemedText>
      <ThemedText variant="hero" tone="title" accessibilityRole="header">
        {copy.tagline}
      </ThemedText>
      <ThemedText variant="body" tone="body">
        {copy.body}
      </ThemedText>
      <View style={{ paddingTop: theme.space.sp9, gap: theme.space.sp3 }}>
        <GlassInput
          accessibilityLabel={copy.nameLabel}
          accessibilityHint={copy.nameHint}
          placeholder={copy.nameLabel}
          value={name}
          onChangeText={setName}
          autoComplete="off"
          autoCorrect={false}
          importantForAutofill="no"
          textContentType="none"
          returnKeyType="done"
          maxLength={60}
        />
        <View style={{ paddingHorizontal: theme.space.gutterCard }}>
          <ThemedText variant="caption" tone="faint">
            {copy.nameHint}
          </ThemedText>
        </View>
      </View>
      <View style={{ paddingTop: theme.space.sp8, gap: theme.space.gapStack }}>
        <GlassButton
          variant="dark"
          size="lg"
          full
          trailing={<Icon name="chevronRight" size={theme.fontSize.fsBody} />}
          onPress={() => {
            setStep('choose');
          }}
        >
          {copy.choose}
        </GlassButton>
        <GlassButton
          variant="glass"
          size="lg"
          full
          onPress={async () => {
            await onboarding.continueInEnglish(optionsOf(name));
          }}
        >
          {copy.english}
        </GlassButton>
      </View>
      <View style={{ paddingTop: theme.space.sp8 }}>
        <ThemedText variant="caption" tone="faint" align="center">
          {copy.footer}
        </ThemedText>
      </View>
    </ScreenScaffold>
  );
}
