import { describe, expect, it } from 'vitest';
import { collectedDataTypes } from './index.ts';

describe('the iOS privacy manifest', () => {
  it('declares no collected data while the telemetry endpoint is unset', () => {
    expect(collectedDataTypes(undefined)).toEqual([]);
  });

  it('declares the counts as product interaction, not linked to the leader and not tracking, once it is set', () => {
    expect(collectedDataTypes('https://counts.sim.invalid/batch')).toEqual([
      {
        NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
        NSPrivacyCollectedDataTypeLinked: false,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
      },
    ]);
  });
});
