import { describe, expect, it } from 'vitest';
import type { GlassButtonProps } from './GlassButton';
import type { GlassIconButtonProps } from './GlassIconButton';
import type { GlassInputProps } from './GlassInput';

type Admits<Props, Candidate> = Candidate extends Props ? true : false;

const iconButtonWithoutLabel: Admits<GlassIconButtonProps, { onPress: () => void }> = false;
const iconButtonWithLabel: Admits<GlassIconButtonProps, { label: string; onPress: () => void }> = true;
const inputWithoutLabel: Admits<GlassInputProps, { value: string }> = false;
const inputWithLabel: Admits<GlassInputProps, { value: string; accessibilityLabel: string }> = true;
const buttonWithIconOnly: Admits<GlassButtonProps, { children: number; onPress: () => void }> = false;
const buttonWithText: Admits<GlassButtonProps, { children: string; onPress: () => void }> = true;
const buttonWithIconAndLabel: Admits<
  GlassButtonProps,
  { children: number; accessibilityLabel: string; onPress: () => void }
> = true;

describe('SE-2 every interactive glass primitive has an accessible name', () => {
  it('refuses, at the type level, an icon button, an input or a non-text button without a name', () => {
    expect([iconButtonWithoutLabel, inputWithoutLabel, buttonWithIconOnly]).toEqual([false, false, false]);
  });

  it('admits each one once it has a name', () => {
    expect([iconButtonWithLabel, inputWithLabel, buttonWithText, buttonWithIconAndLabel]).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});
