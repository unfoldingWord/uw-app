import { useLocalSearchParams } from 'expo-router';
import { StoryReader } from './parts/StoryReader';

function wholeOf(value: string | string[] | undefined): number | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

export default function StoryScreen() {
  const params = useLocalSearchParams<{ number?: string; frame?: string }>();
  const frame = wholeOf(params.frame);
  return (
    <StoryReader
      mode="read"
      number={wholeOf(params.number) ?? 0}
      {...(frame === undefined ? {} : { frame })}
    />
  );
}
