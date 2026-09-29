import type { ImpactStory } from './stories';

export const invitationFirstDay = 5;

export const invitationQuietDays = 90;

export const dayMs = 24 * 60 * 60 * 1000;

export type Schedule = { shownAt?: number; dismissedAt?: number };

export type InvitationQuiet = 'region' | 'days' | 'dismissed' | 'no-story';

export type Invitation =
  | { readonly state: 'due'; readonly story: ImpactStory; readonly give: string; readonly shown: boolean }
  | { readonly state: 'not-due'; readonly reason: InvitationQuiet };

export type InvitationInput = {
  readonly at: number;
  readonly unitedStates: boolean;
  readonly daysOfUse: number;
  readonly stories: readonly ImpactStory[];
  readonly schedule: Schedule;
  readonly give: string;
};

export function shownThisCycle(schedule: Schedule): boolean {
  return (
    schedule.shownAt !== undefined &&
    (schedule.dismissedAt === undefined || schedule.shownAt > schedule.dismissedAt)
  );
}

export function invitationState(input: InvitationInput): Invitation {
  if (!input.unitedStates) {
    return { state: 'not-due', reason: 'region' };
  }
  const [story] = input.stories;
  if (story === undefined) {
    return { state: 'not-due', reason: 'no-story' };
  }
  if (input.daysOfUse < invitationFirstDay) {
    return { state: 'not-due', reason: 'days' };
  }
  const { dismissedAt } = input.schedule;
  if (dismissedAt !== undefined && input.at - dismissedAt < invitationQuietDays * dayMs) {
    return { state: 'not-due', reason: 'dismissed' };
  }
  return { state: 'due', story, give: input.give, shown: shownThisCycle(input.schedule) };
}
