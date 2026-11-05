import type { ReactNode } from 'react';
import type { PressHandler } from '@shared/glass/usePress';
import { Header } from './Header';
import { ScreenScaffold, type ScreenListFrame } from './ScreenScaffold';

export type ScreenProps = {
  title: string;
  overline?: string;
  subtitle?: string;
  back?: { label: string; onPress: PressHandler };
  trailing?: ReactNode;
  footer?: ReactNode;
  tabBar?: boolean;
  centred?: boolean;
  dense?: boolean;
  brand?: boolean;
  list?: (frame: ScreenListFrame) => ReactNode;
  children?: ReactNode;
};

export function Screen({
  title,
  overline,
  subtitle,
  back,
  trailing,
  footer,
  tabBar = false,
  centred = false,
  dense = false,
  brand = false,
  list,
  children,
}: ScreenProps) {
  return (
    <ScreenScaffold
      dense={dense}
      clearance={tabBar ? 'tabs' : 'none'}
      dock={footer}
      list={list}
      header={
        <Header
          title={title}
          overline={overline}
          subtitle={subtitle}
          back={back}
          trailing={trailing}
          centred={centred}
          brand={brand}
        />
      }
    >
      {children}
    </ScreenScaffold>
  );
}
