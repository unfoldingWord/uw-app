import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus as PlayerStatus,
} from 'expo-audio';
import type { Audio, AudioSource, AudioState, AudioStatus, Http } from '@lib/ports';
import { portError } from './errors';
import type { HostPolicy } from './http';

export type PlatformAudioOptions = {
  policy: HostPolicy;
  http: Http;
  uriOf(path: string): string;
  loadTimeoutMs?: number;
};

const defaultLoadTimeoutMs = 15_000;
const resolveTimeoutMs = 15_000;
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

  function refused(url: string): Error {
    return portError('http.host-refused', `${options.policy.hostOf(url) ?? 'that host'} is not allowed`);
  }

  async function uriOf(source: AudioSource): Promise<string> {
    if (source.kind === 'file') {
      return options.uriOf(source.path);
    }
    if (!options.policy.permits(source.url)) {
      throw refused(source.url);
    }
    const landed = await options.http.request({
      url: source.url,
      method: 'HEAD',
      timeoutMs: resolveTimeoutMs,
    });
    if (landed.kind === 'refused') {
      throw refused(landed.host === undefined ? source.url : `https://${landed.host}/`);
    }
    if (landed.kind !== 'response') {
      throw portError(
        landed.kind === 'offline' ? 'http.offline' : 'audio.unavailable',
        'the stream is out of reach',
      );
    }
    if (landed.status < 200 || landed.status >= 300 || !options.policy.permits(landed.url)) {
      throw portError('audio.unavailable', 'the stream does not answer from an allowed host');
    }
    return landed.url;
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
      const uri = await uriOf(source);
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
