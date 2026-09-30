import type { Audio, AudioSource, AudioStatus, Clock } from '@lib/ports';
import { portError } from './errors';

export type MemoryAudio = Audio & { provide(source: AudioSource, durationMs: number): void };

function sourceKey(source: AudioSource): string {
  return source.kind === 'file' ? `file:${source.path}` : `url:${source.url}`;
}

export function createMemoryAudio(options: { clock: Clock }): MemoryAudio {
  const durations = new Map<string, number>();
  let loaded: { durationMs: number } | undefined;
  let positionMs = 0;
  let playingSince: number | undefined;
  let state: AudioStatus['state'] = 'idle';

  function position(): number {
    if (loaded === undefined) {
      return 0;
    }
    const running = playingSince === undefined ? 0 : options.clock.now() - playingSince;
    return Math.min(loaded.durationMs, positionMs + running);
  }

  function status(): AudioStatus {
    const durationMs = loaded?.durationMs ?? 0;
    const current = position();
    const ended = loaded !== undefined && state === 'playing' && current >= durationMs;
    return { state: ended ? 'ended' : state, positionMs: current, durationMs };
  }

  function requireLoaded(): { durationMs: number } {
    if (loaded === undefined) {
      throw portError('audio.unavailable', 'nothing is loaded');
    }
    return loaded;
  }

  return {
    load: async (source) => {
      const durationMs = durations.get(sourceKey(source));
      if (durationMs === undefined) {
        loaded = undefined;
        state = 'idle';
        throw portError('audio.unavailable', `${sourceKey(source)} cannot be played`);
      }
      loaded = { durationMs };
      positionMs = 0;
      playingSince = undefined;
      state = 'ready';
      return status();
    },
    play: async () => {
      requireLoaded();
      if (playingSince === undefined) {
        playingSince = options.clock.now();
      }
      state = 'playing';
    },
    pause: async () => {
      requireLoaded();
      positionMs = position();
      playingSince = undefined;
      state = 'paused';
    },
    seek: async (target) => {
      const { durationMs } = requireLoaded();
      positionMs = Math.max(0, Math.min(durationMs, target));
      playingSince = playingSince === undefined ? undefined : options.clock.now();
    },
    status,
    unload: async () => {
      loaded = undefined;
      positionMs = 0;
      playingSince = undefined;
      state = 'idle';
    },
    provide: (source, durationMs) => {
      durations.set(sourceKey(source), durationMs);
    },
  };
}
