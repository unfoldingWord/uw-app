import type { ReactNode } from 'react';
import { GlassSurface } from '@shared/glass';
import { useTheme } from '@shared/theme';

export type SheetProps = { children?: ReactNode; accessibilityLabel?: string };

export function Sheet({ children, accessibilityLabel }: SheetProps) {
  const theme = useTheme();
  return (
    <GlassSurface
      level={3}
      blur="heavy"
      radius={theme.radius.r2xl}
      shadow="float"
      accessibilityLabel={accessibilityLabel}
      style={{ padding: theme.space.gutterCard, gap: theme.space.sp6 }}
    >
      {children}
    </GlassSurface>
  );
}
