export type CollectedDataType = {
  NSPrivacyCollectedDataType: string;
  NSPrivacyCollectedDataTypeLinked: boolean;
  NSPrivacyCollectedDataTypeTracking: boolean;
  NSPrivacyCollectedDataTypePurposes: string[];
};

export function collectedDataTypes(telemetryEndpoint: string | undefined): CollectedDataType[] {
  if (telemetryEndpoint === undefined) {
    return [];
  }
  return [
    {
      NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
      NSPrivacyCollectedDataTypeLinked: false,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
    },
  ];
}
