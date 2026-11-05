import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from 'react-native';
import { keyboardOverlap, revealDistance } from './keyboardInset';

type FrameSpan = { readonly top: number; readonly bottom: number };

export type KeyboardInset = {
  readonly frame: RefObject<View | null>;
  readonly scroll: RefObject<ScrollView | null>;
  readonly overlap: number;
  readonly onLayout: () => void;
  readonly onScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

function useKeyboardTop(): number | undefined {
  const [top, setTop] = useState<number | undefined>(undefined);
  useEffect(() => {
    const shown = Keyboard.addListener(showEvent, (event: KeyboardEvent) =>
      setTop(event.endCoordinates.screenY),
    );
    const hidden = Keyboard.addListener(hideEvent, () => setTop(undefined));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return top;
}

export function useKeyboardInset(gap: number): KeyboardInset {
  const frame = useRef<View | null>(null);
  const scroll = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  const keyboardTop = useKeyboardTop();
  const [span, setSpan] = useState<FrameSpan | undefined>(undefined);

  const onLayout = useCallback(() => {
    frame.current?.measureInWindow((_x, y, _width, height) => {
      setSpan((known) =>
        known?.top === y && known.bottom === y + height ? known : { top: y, bottom: y + height },
      );
    });
  }, []);

  useEffect(() => {
    onLayout();
  }, [onLayout, keyboardTop]);

  const overlap = keyboardOverlap(span?.bottom, keyboardTop);

  useEffect(() => {
    if (overlap === 0 || keyboardTop === undefined || span === undefined) {
      return;
    }
    const focused: ReturnType<typeof TextInput.State.currentlyFocusedInput> | null =
      TextInput.State.currentlyFocusedInput();
    focused?.measureInWindow((_x, y, _width, height) => {
      const distance = revealDistance({ top: y, bottom: y + height }, keyboardTop, gap, span.top);
      if (distance > 0) {
        offset.current += distance;
        scroll.current?.scrollTo({ y: offset.current, animated: true });
      }
    });
  }, [overlap, keyboardTop, gap, span]);

  const onScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { frame, scroll, overlap, onLayout, onScrollEnd };
}
