import { describe, expect, it } from 'vitest';
import { detentHeight, dragHeight, settleDetent, sheetHeights } from './sheet';

const heights = { peek: 300, expanded: 600 };
const projectionMs = 240;

describe('ST-2 the helps sheet opens at a peek, drags open and drags away (issue #90)', () => {
  it('peeks at a share of the room and expands to all of it', () => {
    expect(sheetHeights(600, 0.5)).toEqual({ peek: 300, expanded: 600 });
    expect(sheetHeights(0, 0.5)).toEqual({ peek: 0, expanded: 0 });
    expect(sheetHeights(-1, 0.5)).toEqual({ peek: 0, expanded: 0 });
  });

  it('maps each detent to its height', () => {
    expect(detentHeight('closed', heights)).toBe(0);
    expect(detentHeight('peek', heights)).toBe(300);
    expect(detentHeight('expanded', heights)).toBe(600);
  });

  it('follows the finger and stays inside the room', () => {
    expect(dragHeight(300, -100, heights)).toBe(400);
    expect(dragHeight(300, 100, heights)).toBe(200);
    expect(dragHeight(300, -900, heights)).toBe(600);
    expect(dragHeight(300, 900, heights)).toBe(0);
  });

  it('settles at the nearest detent once it lets go', () => {
    expect(settleDetent(320, 0, heights, projectionMs)).toBe('peek');
    expect(settleDetent(520, 0, heights, projectionMs)).toBe('expanded');
    expect(settleDetent(90, 0, heights, projectionMs)).toBe('closed');
  });

  it('carries a flick to the next detent in its direction', () => {
    expect(settleDetent(310, 1, heights, projectionMs)).toBe('expanded');
    expect(settleDetent(290, -1, heights, projectionMs)).toBe('closed');
    expect(settleDetent(590, -1, heights, projectionMs)).toBe('peek');
  });
});
