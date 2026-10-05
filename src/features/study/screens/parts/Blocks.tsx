import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import { fontFor } from '@shared/fonts';
import { contentText, type Theme, useTheme } from '@shared/theme';
import type { Block, Inline, LinkTarget } from '../../service';
import { Say, roleStyle, toneColor } from './Say';

export type BlocksProps = {
  blocks: readonly Block[];
  language: string;
  onLink: (target: LinkTarget) => void;
  linkMissing: string;
  compact?: boolean;
};

type Context = {
  theme: Theme;
  language: string;
  onLink: (target: LinkTarget) => void;
  linkMissing: string;
  compact: boolean;
};

function hasMissingLink(inlines: readonly Inline[]): boolean {
  return inlines.some(
    (inline) =>
      (inline.kind === 'link' && inline.target === undefined) ||
      (inline.kind !== 'text' && hasMissingLink(inline.children)),
  );
}

function plainText(inlines: readonly Inline[]): string {
  return inlines
    .map((inline) => (inline.kind === 'text' ? inline.text : plainText(inline.children)))
    .join('');
}

function emphasis(theme: Theme): TextStyle {
  const italic = fontFor(theme.fontStack.fontCore, theme.fontWeight.fwRegular, { italic: true });
  return italic === undefined ? { fontStyle: 'italic' } : { fontWeight: undefined, ...italic };
}

function strong(theme: Theme): TextStyle {
  return { fontWeight: undefined, ...fontFor(theme.fontStack.fontCore, theme.fontWeight.fwSemibold) };
}

function renderInlines(inlines: readonly Inline[], context: Context, path: string): ReactNode[] {
  return inlines.map((inline, index) => {
    const key = `${path}.${String(index)}`;
    switch (inline.kind) {
      case 'text':
        return <Fragment key={key}>{inline.text}</Fragment>;
      case 'emphasis':
        return (
          <Text key={key} style={emphasis(context.theme)}>
            {renderInlines(inline.children, context, key)}
          </Text>
        );
      case 'strong':
        return (
          <Text key={key} style={strong(context.theme)}>
            {renderInlines(inline.children, context, key)}
          </Text>
        );
      case 'link': {
        const target = inline.target;
        if (target === undefined) {
          return (
            <Text
              key={key}
              accessibilityHint={context.linkMissing}
              style={{ color: context.theme.color.textDim }}
            >
              {renderInlines(inline.children, context, key)}
            </Text>
          );
        }
        return (
          <Text
            key={key}
            accessibilityRole="link"
            onPress={() => context.onLink(target)}
            style={[strong(context.theme), { color: context.theme.color.link }]}
          >
            {renderInlines(inline.children, context, key)}
          </Text>
        );
      }
    }
  });
}

function WithLinkHint({
  context,
  inlines,
  children,
}: {
  context: Context;
  inlines: readonly Inline[];
  children: ReactNode;
}) {
  if (!hasMissingLink(inlines)) {
    return children;
  }
  return (
    <View style={{ gap: context.theme.space.sp2 }}>
      {children}
      <Say role="caption" tone="dim">
        {context.linkMissing}
      </Say>
    </View>
  );
}

function BlockView({ block, context, path }: { block: Block; context: Context; path: string }) {
  const { theme } = context;
  const sample = block.kind === 'list' || block.kind === 'quote' ? '' : plainText(block.children);
  const body = contentText(theme, theme.text[context.compact ? 'caption' : 'body'], {
    language: context.language,
    sample,
  });
  switch (block.kind) {
    case 'heading': {
      const role = block.level <= 1 ? 'cardTitle' : block.level === 2 ? 'label' : 'overline';
      return (
        <WithLinkHint context={context} inlines={block.children}>
          <Text
            accessibilityRole="header"
            selectable
            style={[
              roleStyle(theme, context.compact ? 'label' : role, 'semibold', sample),
              { color: role === 'overline' ? toneColor(theme, 'dim') : toneColor(theme, 'title') },
            ]}
          >
            {renderInlines(block.children, context, path)}
          </Text>
        </WithLinkHint>
      );
    }
    case 'paragraph':
      return (
        <WithLinkHint context={context} inlines={block.children}>
          <Text selectable style={[body, { color: toneColor(theme, 'title') }]}>
            {renderInlines(block.children, context, path)}
          </Text>
        </WithLinkHint>
      );
    case 'list':
      return (
        <View style={{ gap: theme.space.sp3 }}>
          {block.items.map((item, index) => {
            const key = `${path}.${String(index)}`;
            return (
              <View key={key} style={[styles.row, { gap: theme.space.sp4 }]}>
                <Text style={[body, { color: toneColor(theme, 'dim') }]}>
                  {block.ordered ? `${String(index + 1)}.` : '•'}
                </Text>
                <View style={[styles.fill, { gap: theme.space.sp3 }]}>
                  {item.map((child, childIndex) => (
                    <BlockView
                      key={`${key}.${String(childIndex)}`}
                      block={child}
                      context={context}
                      path={`${key}.${String(childIndex)}`}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      );
    case 'quote':
      return (
        <View
          style={{
            gap: theme.space.sp4,
            paddingStart: theme.space.sp6,
            borderStartWidth: theme.space.sp1,
            borderStartColor: theme.color.accentTeal,
          }}
        >
          {block.children.map((child, index) => (
            <BlockView
              key={`${path}.${String(index)}`}
              block={child}
              context={context}
              path={`${path}.${String(index)}`}
            />
          ))}
        </View>
      );
  }
}

export function Blocks({ blocks, language, onLink, linkMissing, compact = false }: BlocksProps) {
  const theme = useTheme();
  const context: Context = { theme, language, onLink, linkMissing, compact };
  return (
    <View style={{ gap: compact ? theme.space.sp4 : theme.space.gapStack }}>
      {blocks.map((block, index) => (
        <BlockView key={String(index)} block={block} context={context} path={String(index)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  fill: { flex: 1 },
});
