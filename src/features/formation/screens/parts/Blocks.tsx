import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { fontFor } from '@shared/fonts';
import { useTheme, type TextRole } from '@shared/theme';
import type { Block, Inline } from '../../service';
import { Line, type Tone } from './Line';

function Inlines({ items }: { items: readonly Inline[] }) {
  const theme = useTheme();
  return (
    <>
      {items.map((item, index) => {
        switch (item.kind) {
          case 'text':
            return <Fragment key={index}>{item.text}</Fragment>;
          case 'emphasis':
            return (
              <Text
                key={index}
                style={fontFor(theme.fontStack.fontCore, theme.fontWeight.fwRegular, { italic: true })}
              >
                <Inlines items={item.children} />
              </Text>
            );
          case 'strong':
            return (
              <Text key={index} style={fontFor(theme.fontStack.fontCore, theme.fontWeight.fwSemibold)}>
                <Inlines items={item.children} />
              </Text>
            );
          case 'link':
            return (
              <Text key={index} style={{ color: theme.color.link }}>
                <Inlines items={item.children} />
              </Text>
            );
        }
      })}
    </>
  );
}

export type BlocksProps = { blocks: readonly Block[]; role?: TextRole; tone?: Tone };

export function Blocks({ blocks, role = 'body', tone = 'body' }: BlocksProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space.sp4 }}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Line
                key={index}
                role="label"
                tone="title"
                weight={theme.fontWeight.fwSemibold}
                accessibilityRole="header"
              >
                <Inlines items={block.children} />
              </Line>
            );
          case 'paragraph':
            return (
              <Line key={index} role={role} tone={tone}>
                <Inlines items={block.children} />
              </Line>
            );
          case 'list':
            return (
              <View key={index} style={{ gap: theme.space.sp3 }}>
                {block.items.map((item, position) => (
                  <View key={position} style={{ flexDirection: 'row', gap: theme.space.sp4 }}>
                    <Line role={role} tone="dim">
                      {block.ordered ? `${position + 1}.` : '•'}
                    </Line>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Blocks blocks={item} role={role} tone={tone} />
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
                <Blocks blocks={block.children} role={role} tone={tone} />
              </View>
            );
        }
      })}
    </View>
  );
}
