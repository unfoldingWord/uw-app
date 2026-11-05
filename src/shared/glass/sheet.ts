export type SheetDetent = 'closed' | 'peek' | 'expanded';

export type SheetHeights = { readonly peek: number; readonly expanded: number };

const detents: readonly SheetDetent[] = ['closed', 'peek', 'expanded'];

export function sheetHeights(room: number, peekShare: number): SheetHeights {
  const expanded = Math.max(room, 0);
  return { peek: expanded * peekShare, expanded };
}

export function detentHeight(detent: SheetDetent, heights: SheetHeights): number {
  return detent === 'closed' ? 0 : heights[detent];
}

export function dragHeight(start: number, dragDown: number, heights: SheetHeights): number {
  return Math.min(Math.max(start - dragDown, 0), heights.expanded);
}

export function settleDetent(
  height: number,
  growthPerMs: number,
  heights: SheetHeights,
  projectionMs: number,
): SheetDetent {
  const projected = height + growthPerMs * projectionMs;
  return detents.reduce((nearest, detent) =>
    Math.abs(detentHeight(detent, heights) - projected) < Math.abs(detentHeight(nearest, heights) - projected)
      ? detent
      : nearest,
  );
}
