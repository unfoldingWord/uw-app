import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipControls, FormationService, PlayerStatus, StoryAudio } from '../../service';

const audioTickMs = 500;

export type StoryAudioState = {
  readonly controls: ClipControls | undefined;
  readonly status: PlayerStatus;
  toggle(): Promise<void>;
};

export function useStoryAudio(service: FormationService, audio: StoryAudio): StoryAudioState {
  const latestAudio = useRef(audio);
  latestAudio.current = audio;
  const audioPath = audio.state === 'available' ? audio.clip.path : undefined;
  const controls = useMemo(
    () => (audioPath === undefined ? undefined : service.listen(latestAudio.current)),
    [service, audioPath],
  );
  const [status, setStatus] = useState<PlayerStatus>({ state: 'idle' });
  const playing = status.state === 'playing';

  useEffect(() => {
    if (controls === undefined) {
      return undefined;
    }
    setStatus(controls.status());
    const unsubscribe = controls.subscribe(setStatus);
    return () => {
      unsubscribe();
      void controls.stop();
    };
  }, [controls]);

  useEffect(() => {
    if (controls === undefined || !playing) {
      return undefined;
    }
    const tick = setInterval(() => setStatus(controls.status()), audioTickMs);
    return () => clearInterval(tick);
  }, [controls, playing]);

  return {
    controls,
    status,
    async toggle() {
      if (controls !== undefined) {
        setStatus(await controls.toggle());
      }
    },
  };
}
