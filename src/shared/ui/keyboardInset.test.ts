import { describe, expect, it } from 'vitest';
import { keyboardOverlap, revealDistance, revealOffset } from './keyboardInset';

describe('FO-6 the keyboard never covers the field being typed in', () => {
  it('insets nothing while the keyboard is closed or the screen is not measured yet', () => {
    expect(keyboardOverlap(800, undefined)).toBe(0);
    expect(keyboardOverlap(undefined, 500)).toBe(0);
  });

  it('insets the content by the part of the screen the keyboard covers', () => {
    expect(keyboardOverlap(800, 500)).toBe(300);
  });

  it('insets nothing when the system already lifted the screen above the keyboard', () => {
    expect(keyboardOverlap(480, 500)).toBe(0);
  });

  it('scrolls a covered field up until it clears the keyboard by the gap', () => {
    expect(revealDistance({ top: 600, bottom: 680 }, 500, 24, 120)).toBe(204);
  });

  it('leaves a field that is already above the keyboard where it is', () => {
    expect(revealDistance({ top: 300, bottom: 400 }, 500, 24, 120)).toBe(0);
  });

  it('never scrolls the top of a tall field above the top of the screen', () => {
    expect(revealDistance({ top: 300, bottom: 900 }, 500, 24, 120)).toBe(180);
  });

  it('scrolls by the reveal distance when the list can scroll that far', () => {
    expect(revealOffset({ offset: 100, content: 2000, viewport: 600 }, 204)).toBe(304);
  });

  it('stops at the end of the list when the content is shorter than the reveal', () => {
    expect(revealOffset({ offset: 100, content: 900, viewport: 600 }, 204)).toBe(300);
  });

  it('stays at the top when the content fits on the screen', () => {
    expect(revealOffset({ offset: 0, content: 500, viewport: 600 }, 204)).toBe(0);
  });

  it('never runs ahead of the end the list already reached', () => {
    expect(revealOffset({ offset: 300, content: 900, viewport: 600 }, 204)).toBe(300);
  });
});
