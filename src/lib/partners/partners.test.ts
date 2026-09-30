import { describe, expect, it } from 'vitest';
import { inUnitedStates, isUnitedStatesZone } from './region';
import { dayMs, invitationState, type InvitationInput } from './schedule';
import { giveUrl, mergedStories, parseFeed, shippedStories } from './stories';

const base: InvitationInput = {
  at: 1000 * dayMs,
  unitedStates: true,
  daysOfUse: 5,
  stories: shippedStories,
  schedule: {},
  give: giveUrl,
};

describe('the partner invitation rule', () => {
  it('is due in the United States from the fifth day of use, with a story', () => {
    expect(invitationState(base)).toMatchObject({ state: 'due', shown: false, give: giveUrl });
    expect(invitationState({ ...base, daysOfUse: 4 })).toEqual({ state: 'not-due', reason: 'days' });
    expect(invitationState({ ...base, unitedStates: false })).toEqual({ state: 'not-due', reason: 'region' });
  });

  it('never appears without an impact story', () => {
    expect(invitationState({ ...base, stories: [] })).toEqual({ state: 'not-due', reason: 'no-story' });
    expect(shippedStories.length).toBeGreaterThan(0);
  });

  it('stays quiet for ninety days after it is dismissed, then starts a new cycle', () => {
    const dismissedAt = base.at - 89 * dayMs;
    expect(invitationState({ ...base, schedule: { shownAt: dismissedAt - 1, dismissedAt } })).toEqual({
      state: 'not-due',
      reason: 'dismissed',
    });
    expect(
      invitationState({
        ...base,
        schedule: { shownAt: base.at - 91 * dayMs, dismissedAt: base.at - 90 * dayMs },
      }),
    ).toMatchObject({ state: 'due', shown: false });
    expect(invitationState({ ...base, schedule: { shownAt: base.at } })).toMatchObject({ shown: true });
  });
});

describe('the region, from locale and time zone', () => {
  it('reads the United States from the region or a US time zone', () => {
    expect(inUnitedStates({ tag: 'en-US', region: 'US', timeZone: 'Europe/Paris', rtl: false })).toBe(true);
    expect(inUnitedStates({ tag: 'es', region: undefined, timeZone: 'America/Chicago', rtl: false })).toBe(
      true,
    );
    expect(inUnitedStates({ tag: 'sw', region: 'KE', timeZone: 'Africa/Nairobi', rtl: false })).toBe(false);
    expect(inUnitedStates({ tag: 'en', region: undefined, timeZone: 'America/Toronto', rtl: false })).toBe(
      false,
    );
    expect(isUnitedStatesZone('America/Indiana/Indianapolis')).toBe(true);
    expect(isUnitedStatesZone('Pacific/Honolulu')).toBe(true);
    expect(isUnitedStatesZone('America/Mexico_City')).toBe(false);
  });
});

describe('the impact story feed', () => {
  it('keeps only well-formed stories from unfoldingword.org', () => {
    const parsed = parseFeed({
      stories: [
        { slug: 'one', title: 'One', body: 'Text.', link: 'https://unfoldingword.org/one/' },
        { slug: 'one', title: 'Again', body: 'Text.', link: 'https://unfoldingword.org/again/' },
        { slug: 'two', title: 'Two', body: ['A.'], link: 'http://unfoldingword.org/two/' },
        { slug: 'three', title: 'Three', body: ['A.'], link: 'https://git.door43.org/three' },
        { slug: 'four', title: ' ', body: ['A.'], link: 'https://unfoldingword.org/four/' },
      ],
    });
    expect(parsed?.map((story) => story.slug)).toEqual(['one']);
    expect(parseFeed({ items: [] })).toBeUndefined();
    expect(parseFeed('stories')).toBeUndefined();
  });

  it('puts the feed first and keeps a shipped story the feed does not replace', () => {
    const [shipped] = shippedStories;
    const merged = mergedStories(
      [{ slug: 'one', title: 'One', body: ['Text.'], link: 'https://unfoldingword.org/one/' }],
      new Map([['one', 'partners/images/one']]),
    );
    expect(merged.map((story) => [story.slug, story.shipped, story.image])).toEqual([
      ['one', false, { path: 'partners/images/one' }],
      [shipped?.slug, true, undefined],
    ]);
    const replaced = mergedStories(
      [
        {
          slug: shipped?.slug ?? '',
          title: 'T',
          body: ['B.'],
          link: 'https://unfoldingword.org/t/',
          securityNote: 'N.',
        },
      ],
      new Map(),
    );
    expect(replaced.map((story) => [story.shipped, story.securityNote])).toEqual([[false, 'N.']]);
  });
});
