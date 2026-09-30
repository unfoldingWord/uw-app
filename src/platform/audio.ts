import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus as PlayerStatus,
} from 'expo-audio';
import type { Audio, AudioState, AudioStatus } from '@lib/ports';
import { portError } from './errors';

export type PlatformAudioOptions = {
  uriOf(path: string): string;
  loadTimeoutMs?: number;
};

const defaultLoadTimeoutMs = 15_000;
const idle: AudioStatus = Object.freeze({ state: 'idle', positionMs: 0, durationMs: 0 });

function milliseconds(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : 0;
}

export function createPlatformAudio(options: PlatformAudioOptions): Audio {
  let player: AudioPlayer | undefined;
  let state: AudioState = 'idle';
  let modeSet: Promise<void> | undefined;
  let finish: (() => void) | undefined;

  function status(): AudioStatus {
    if (player === undefined || state === 'idle') {
      return idle;
    }
    return {
      state,
      positionMs: milliseconds(player.currentTime),
      durationMs: milliseconds(player.duration),
    };
  }

  function requireLoaded(): AudioPlayer {
    if (player === undefined || state === 'idle' || state === 'loading') {
      throw portError('audio.unavailable', 'nothing is loaded');
    }
    return player;
  }

  function loaded(target: AudioPlayer): Promise<void> {
    const timeoutMs = options.loadTimeoutMs ?? defaultLoadTimeoutMs;
    return new Promise((resolve, reject) => {
      if (target.isLoaded) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        subscription.remove();
        reject(portError('audio.unavailable', 'the source did not load'));
      }, timeoutMs);
      const subscription = target.addListener('playbackStatusUpdate', (update: PlayerStatus) => {
        if (update.error !== null) {
          clearTimeout(timer);
          subscription.remove();
          reject(portError('audio.unavailable', 'the source cannot be played'));
        } else if (update.isLoaded) {
          clearTimeout(timer);
          subscription.remove();
          resolve();
        }
      });
    });
  }

  function watchEnd(target: AudioPlayer): void {
    const subscription = target.addListener('playbackStatusUpdate', (update: PlayerStatus) => {
      if (update.didJustFinish && state === 'playing') {
        state = 'ended';
      }
    });
    finish = () => subscription.remove();
  }

  async function unload(): Promise<void> {
    finish?.();
    finish = undefined;
    player?.remove();
    player = undefined;
    state = 'idle';
  }

  return {
    load: async (source) => {
      const uri = options.uriOf(source.path);
      modeSet ??= setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      await modeSet;
      await unload();
      const next = createAudioPlayer({ uri });
      player = next;
      state = 'loading';
      try {
        await loaded(next);
      } catch (error) {
        await unload();
        throw error;
      }
      watchEnd(next);
      state = 'ready';
      return status();
    },
    play: async () => {
      if (state === 'ended') {
        return;
      }
      requireLoaded().play();
      state = 'playing';
    },
    pause: async () => {
      requireLoaded().pause();
      state = 'paused';
    },
    seek: async (positionMs) => {
      const target = requireLoaded();
      const durationMs = milliseconds(target.duration);
      await target.seekTo(Math.max(0, Math.min(durationMs, positionMs)) / 1000);
    },
    status,
    unload,
  };
}
