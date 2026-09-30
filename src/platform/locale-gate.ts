import Constants from 'expo-constants';

type NativeLocaleGate = 'reviewed' | 'drafts';

const embedded: unknown = Constants.expoConfig?.extra?.localeGate;

export const localeGate: NativeLocaleGate = embedded === 'drafts' ? 'drafts' : 'reviewed';
