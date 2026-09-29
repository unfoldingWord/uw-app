import type { AudioSource } from '../ports';
import { clipOf, type PlayerApi, type PlayerListener, type PlayerStatus } from './player';

export const skipMs = 10_000;

export type ClipControls = {
  readonly clip: string;
  status(): PlayerStatus;
  toggle(): Promise<PlayerStatus>;
  seek(positionMs: number): Promise<PlayerStatus>;
  skip(deltaMs: number): Promise<PlayerStatus>;
  stop(): Promise<PlayerStatus>;
  subscribe(listener: PlayerListener): () => void;
};

const idle: PlayerStatus = Object.freeze({ state: 'idle' });

export function clipControls(player: PlayerApi, source: AudioSource): ClipControls {
  const clip = clipOf(source);
  const mine = (status: PlayerStatus): PlayerStatus =>
    status.state !== 'idle' && status.clip === clip ? status : idle;
  const status = (): PlayerStatus => mine(player.status());

  return {
    clip,
    status,
    async toggle() {
      const now = status();
      switch (now.state) {
        case 'idle':
          if ((await player.load(source)).state !== 'paused') {
            return status();
          }
          return mine(await player.play());
        case 'playing':
          return mine(await player.pause());
        case 'loading':
          return now;
        default:
          return mine(await player.play());
      }
    },
    async seek(positionMs) {
      return status().state === 'idle' ? idle : mine(await player.seek(positionMs));
    },
    async skip(deltaMs) {
      const now = status();
      if (now.state !== 'playing' && now.state !== 'paused' && now.state !== 'ended') {
        return now;
      }
      return mine(await player.seek(now.positionMs + deltaMs));
    },
    async stop() {
      return status().state === 'idle' ? idle : mine(await player.stop());
    },
    subscribe(listener) {
      let quiet = status().state === 'idle';
      return player.subscribe((next) => {
        const shown = mine(next);
        if (shown.state === 'idle' && quiet) {
          return;
        }
        quiet = shown.state === 'idle';
        listener(shown);
      });
    },
  };
}

export function clockTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}
