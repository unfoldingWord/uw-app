import { describe, expect, it } from 'vitest';
import { firstPosition, isReachable, positionAt, progressOf, stepFrom } from './position';

describe('positions (FO-4)', () => {
  it('walks the five movements of a story, then the next story', () => {
    const walked = [firstPosition];
    for (let step = 0; step < 6; step += 1) {
      const last = walked.at(-1) ?? firstPosition;
      walked.push(stepFrom(last).next);
    }
    expect(walked.map((position) => `${position.session}:${position.movement ?? ''}`)).toEqual([
      '1:observation',
      '1:translation',
      '1:discourse',
      '1:theological',
      '1:journal',
      '2:observation',
      '2:translation',
    ]);
    expect(stepFrom(positionAt('foundations', 1, 'journal')).sessionCompleted).toBe(true);
    expect(stepFrom(positionAt('foundations', 1, 'theological')).sessionCompleted).toBe(false);
  });

  it('moves a Training group one lesson at a time, with no movement', () => {
    expect(stepFrom(positionAt('training', 2))).toEqual({
      next: { track: 'training', session: 3 },
      sessionCompleted: true,
    });
    expect(positionAt('training', 2, 'journal')).toEqual({ track: 'training', session: 2 });
  });

  it('derives progress from position alone', () => {
    expect(progressOf(firstPosition, 50)).toEqual({
      track: 'foundations',
      done: 0,
      sessions: 50,
      fraction: 0,
      finished: false,
    });
    expect(progressOf(positionAt('foundations', 4, 'discourse'), 50).fraction).toBe((3 * 5 + 2) / 250);
    expect(progressOf(positionAt('training', 4), 3)).toEqual({
      track: 'training',
      done: 3,
      sessions: 3,
      fraction: 1,
      finished: true,
    });
    expect(progressOf(positionAt('training', 1), 0).fraction).toBe(0);
  });

  it('refuses a position no session can hold', () => {
    expect(isReachable(positionAt('foundations', 2, 'journal'))).toBe(true);
    expect(isReachable({ track: 'topics', session: 1 })).toBe(false);
    expect(isReachable({ track: 'foundations', session: 0 })).toBe(false);
    expect(isReachable({ track: 'foundations', session: 1.5 })).toBe(false);
    expect(isReachable({ track: 'training', session: 1, movement: 'journal' })).toBe(false);
  });
});
