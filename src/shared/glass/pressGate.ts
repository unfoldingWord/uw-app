export const minimumTouchTarget = 44;

export type PressGate = {
  busy(): boolean;
  press(run: () => unknown): boolean;
};

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then: unknown }).then === 'function'
  );
}

export function createPressGate(onBusyChange: (busy: boolean) => void): PressGate {
  let pending = false;
  return {
    busy: () => pending,
    press(run) {
      if (pending) {
        return false;
      }
      const result = run();
      if (!isThenable(result)) {
        return true;
      }
      pending = true;
      onBusyChange(true);
      const settle = () => {
        pending = false;
        onBusyChange(false);
      };
      result.then(settle, settle);
      return true;
    },
  };
}

export function slopFor(extent: number): number {
  return Math.max(0, Math.ceil((minimumTouchTarget - extent) / 2));
}

export type TouchSlop = {
  readonly hitSlop: { top: number; bottom: number; left: number; right: number };
  readonly dataSet: { readonly touchSlopV: number; readonly touchSlopH: number };
};

export function touchSlop(height: number, width: number = minimumTouchTarget): TouchSlop {
  const vertical = slopFor(height);
  const horizontal = slopFor(width);
  return {
    hitSlop: { top: vertical, bottom: vertical, left: horizontal, right: horizontal },
    dataSet: { touchSlopV: vertical, touchSlopH: horizontal },
  };
}
