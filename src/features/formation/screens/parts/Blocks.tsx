import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { fontFor, type Script } from '@shared/fonts';
import { type TextTone, ThemedText } from '@shared/ui';
import {
  contentText,
  scriptOf,
  useTheme,
  type TextRole,
  type TextStyleTokens,
  type Theme,
} from '@shared/theme';
import type { Block, Inline } from '../../service';

function inlineText(items: readonly Inline[]): string {
  return items.map((item) => (item.kind === 'text' ? item.text : inlineText(item.children))).join('');
}

function inlineFont(theme: Theme, weight: number, script: Script | undefined, italic = false) {
  return fontFor(theme.fontStack.fontCore, weight, { ...(script === undefined ? {} : { script }), italic });
}

function Inlines({ items, script }: { items: readonly Inline[]; script: Script | undefined }) {
  const theme = useTheme();
  return (
    <>
      {items.map((item, index) => {
        switch (item.kind) {
          case 'text':
            return <Fragment key={index}>{item.text}</Fragment>;
          case 'emphasis':
            return (
              <Text key={index} style={inlineFont(theme, theme.fontWeight.fwRegular, script, true)}>
                <Inlines items={item.children} script={script} />
              </Text>
            );
          case 'strong':
            return (
              <Text key={index} style={inlineFont(theme, theme.fontWeight.fwSemibold, script)}>
                <Inlines items={item.children} script={script} />
              </Text>
            );
          case 'link':
            return (
              <Text key={index} style={{ color: theme.color.link }}>
                <Inlines items={item.children} script={script} />
              </Text>
            );
        }
      })}
    </>
  );
}

export type BlocksProps = { blocks: readonly Block[]; role?: TextRole; tone?: TextTone; language?: string };

export function Blocks({ blocks, role = 'body', tone = 'body', language }: BlocksProps) {
  const theme = useTheme();
  const tag = language ?? theme.locale;
  const voice = (items: readonly Inline[], base: TextStyleTokens) => {
    const sample = inlineText(items);
    return {
      style: contentText(theme, base, { language: tag, sample }),
      script: scriptOf(tag, sample),
    };
  };
  const headingBase: TextStyleTokens = {
    ...theme.text.label,
    ...inlineFont(theme, theme.fontWeight.fwSemibold, undefined),
  };
  return (
    <View style={{ gap: theme.space.sp4 }}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading': {
            const heading = voice(block.children, headingBase);
            return (
              <ThemedText
                key={index}
                variant="label"
                tone="title"
                accessibilityRole="header"
                style={heading.style}
              >
                <Inlines items={block.children} script={heading.script} />
              </ThemedText>
            );
          }
          case 'paragraph': {
            const paragraph = voice(block.children, theme.text[role]);
            return (
              <ThemedText key={index} variant={role} tone={tone} style={paragraph.style}>
                <Inlines items={block.children} script={paragraph.script} />
              </ThemedText>
            );
          }
          case 'list':
            return (
              <View key={index} style={{ gap: theme.space.sp3 }}>
                {block.items.map((item, position) => (
                  <View key={position} style={{ flexDirection: 'row', gap: theme.space.sp4 }}>
                    <ThemedText variant={role} tone="dim">
                      {block.ordered ? `${position + 1}.` : '•'}
                    </ThemedText>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Blocks blocks={item} role={role} tone={tone} language={tag} />
                    </View>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View
                key={index}
                style={{
                  borderStartWidth: theme.space.sp1,
                  borderStartColor: theme.color.accentTeal,
                  paddingStart: theme.space.sp6,
                }}
              >
                <Blocks blocks={block.children} role={role} tone={tone} language={tag} />
              </View>
            );
        }
      })}
    </View>
  );
}
