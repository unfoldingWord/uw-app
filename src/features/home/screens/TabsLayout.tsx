import Tabs, { type BottomTabBarProps } from 'expo-router/js-tabs';
import type { IconName } from '@shared/glass';
import { useService } from '@shared/kernel';
import { TabBar, useChanges, type TabItem } from '@shared/ui';
import { createHomeService } from '../service';

type TabRoute = 'index' | 'study' | 'formation';

const tabIcons: Record<TabRoute, IconName> = { index: 'compass', study: 'layers', formation: 'users' };

function isTabRoute(name: string): name is TabRoute {
  return name in tabIcons;
}

function HomeTabBar({ state, navigation }: BottomTabBarProps) {
  const home = useService(createHomeService);
  useChanges(home.onChange);
  const words = home.words();
  const labels: Record<TabRoute, string> = {
    index: words.t('nav.home'),
    study: words.t('nav.study'),
    formation: words.t('nav.formation'),
  };
  const items: TabItem[] = state.routes.flatMap((route, index) => {
    if (!isTabRoute(route.name)) {
      return [];
    }
    const focused = state.index === index;
    return [
      {
        key: route.key,
        label: labels[route.name],
        icon: tabIcons[route.name],
        focused,
        onPress: () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        },
      },
    ];
  });
  return <TabBar items={items} />;
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <HomeTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="study" />
      <Tabs.Screen name="formation" />
    </Tabs>
  );
}
