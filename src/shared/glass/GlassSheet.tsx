import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@shared/theme';
import { moveAccessibilityFocus } from './accessibilityFocus';
import { GlassIconButton } from './GlassIconButton';
import { GlassSurface } from './GlassSurface';
import { Icon } from './Icon';
import { bezier } from './motion';
import { detentHeight, dragHeight, settleDetent, type SheetDetent, type SheetHeights } from './sheet';

export type GlassSheetProps = {
  open: boolean;
  heights: SheetHeights;
  accessibilityLabel: string;
  closeLabel: string;
  expandLabel: string;
  collapseLabel: string;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

type OpenDetent = Exclude<SheetDetent, 'closed'>;

export function GlassSheet({
  open,
  heights,
  accessibilityLabel,
  closeLabel,
  expandLabel,
  collapseLabel,
  onDismiss,
  style,
  children,
}: GlassSheetProps) {
  const theme = useTheme();
  const height = useRef(new Animated.Value(0)).current;
  const handle = useRef<View>(null);
  const [shown, setShown] = useState(open);
  const [detent, setDetent] = useState<OpenDetent>('peek');
  const latest = useRef({ heights, detent, onDismiss, open, start: 0 });
  latest.current = { ...latest.current, heights, onDismiss, open };
  const easing = useMemo(() => bezier(theme.motion.easing.easeDamp), [theme]);
  const duration = theme.reducedMotion ? 0 : theme.motion.duration.durBase;

  const motion = useRef({ duration, easing });
  motion.current = { duration, easing };

  const moveTo = useRef((target: SheetDetent, done?: () => void) => {
    Animated.timing(height, {
      toValue: detentHeight(target, latest.current.heights),
      duration: motion.current.duration,
      easing: motion.current.easing,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        done?.();
      }
    });
  }).current;

  const dismiss = useRef(() => moveTo('closed', () => latest.current.onDismiss())).current;

  if (open && !shown) {
    setShown(true);
  }

  useEffect(() => {
    if (open) {
      latest.current.detent = 'peek';
      setDetent('peek');
      moveTo('peek');
      return;
    }
    moveTo('closed', () => setShown(false));
  }, [open, moveTo]);

  useEffect(() => {
    if (latest.current.open) {
      height.setValue(detentHeight(latest.current.detent, latest.current.heights));
    }
  }, [height, heights.peek, heights.expanded]);

  useEffect(() => {
    if (!shown || !open) {
      return undefined;
    }
    const target = handle.current;
    if (target !== null) {
      moveAccessibilityFocus(target);
    }
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => back.remove();
  }, [shown, open, dismiss]);

  const settle = (next: SheetDetent) => {
    if (next === 'closed') {
      dismiss();
      return;
    }
    setDetent(next);
    latest.current.detent = next;
    moveTo(next);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > Math.abs(gesture.dx) && Math.abs(gesture.dy) > theme.space.sp3,
        onPanResponderGrant: () => {
          height.stopAnimation((value) => {
            latest.current.start = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          height.setValue(dragHeight(latest.current.start, gesture.dy, latest.current.heights));
        },
        onPanResponderRelease: (_, gesture) => {
          const at = dragHeight(latest.current.start, gesture.dy, latest.current.heights);
          settle(settleDetent(at, -gesture.vy, latest.current.heights, theme.motion.duration.durFast));
        },
        onPanResponderTerminate: () => moveTo(latest.current.detent),
      }),
    [theme],
  );

  if (!shown) {
    return null;
  }

  const expanded = detent === 'expanded';
  const onAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'increment':
        settle('expanded');
        break;
      case 'decrement':
        settle('peek');
        break;
      case 'escape':
        dismiss();
        break;
      default:
        settle(expanded ? 'peek' : 'expanded');
    }
  };

  return (
    <Animated.View style={[styles.clip, { height }]}>
      <GlassSurface
        level={3}
        blur="heavy"
        radius="2xl"
        style={[
          styles.fill,
          {
            marginHorizontal: theme.space.sp5,
            paddingHorizontal: theme.space.sp7,
            paddingBottom: theme.space.sp6,
            gap: theme.space.sp4,
          },
          style,
        ]}
      >
        <View {...pan.panHandlers} style={[styles.row, { minHeight: theme.space.sp13 }]}>
          <View style={{ width: theme.space.sp13 }} />
          <Pressable
            ref={handle}
            accessibilityRole="adjustable"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={expanded ? collapseLabel : expandLabel}
            accessibilityState={{ expanded }}
            accessibilityActions={[
              { name: 'activate' },
              { name: 'increment' },
              { name: 'decrement' },
              { name: 'escape' },
            ]}
            onAccessibilityAction={onAction}
            onAccessibilityEscape={dismiss}
            onPress={() => settle(expanded ? 'peek' : 'expanded')}
            style={[styles.grip, { minHeight: theme.space.sp13 }]}
          >
            <View
              style={{
                width: theme.space.sp13,
                height: theme.space.sp2,
                borderRadius: theme.radius.rPill,
                backgroundColor: theme.color.textFaint,
              }}
            />
          </Pressable>
          <GlassIconButton label={closeLabel} size={theme.space.sp13} onPress={dismiss}>
            <Icon name="chevronDown" />
          </GlassIconButton>
        </View>
        <View style={styles.fill}>{children}</View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  grip: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
